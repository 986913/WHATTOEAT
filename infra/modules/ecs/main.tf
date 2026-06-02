# =======================================================================
# ECS 模块
#
# 资源总览：
#   data "aws_iam_role"       — 只读 ecsTaskExecutionRole（不 import）
#   aws_ecs_cluster           — Fargate cluster
#   aws_ecr_repository        — Docker 镜像仓库
#   aws_cloudwatch_log_group  — ECS 日志（retention 改为 30 天）
#   aws_ecs_task_definition   — 任务定义（cpu/memory/容器配置）
#   aws_ecs_service           — Fargate 服务（运行 2 个实例）
# =======================================================================

# -----------------------------------------------------------------------
# IAM 执行角色（data source，不 import）
#
# ecsTaskExecutionRole 是 AWS 默认角色，不专属 MealDice。
# 用 data source 只读取其 ARN，Terraform 不拥有它，destroy 不影响它。
# 同 ALB 模块的 aws_acm_certificate 处理方式。
# -----------------------------------------------------------------------
data "aws_iam_role" "task_execution" {
  name = "ecsTaskExecutionRole"
}

# -----------------------------------------------------------------------
# ECS Cluster
#
# containerInsights = "disabled" 必须显式写出来。
# AWS 里查出来是 disabled，不写就会在 plan 里显示虚假 diff。
# 同 ALB 模块的 idle_timeout = 300 问题。
# -----------------------------------------------------------------------
resource "aws_ecs_cluster" "main" {
  name = "mealdice-backend-cluster"

  configuration {
    execute_command_configuration {
      logging = "DEFAULT"
    }
  }

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  lifecycle {
    ignore_changes = [tags_all]
  }
}

# -----------------------------------------------------------------------
# ECR Repository
#
# 存放 MealDice backend Docker 镜像。
# CI/CD push 到这里，ECS 从这里拉取。
# -----------------------------------------------------------------------
resource "aws_ecr_repository" "main" {
  name                 = "mealdice-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  lifecycle {
    ignore_changes = [tags_all]
  }
}

# -----------------------------------------------------------------------
# CloudWatch Log Group
#
# retention_in_days = 30：AWS 里原来是 null（永久保存）。
# import 后第一次 apply 会把 null → 30，这是故意的改进。
# -----------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/mealdice-backend-task"
  retention_in_days = 30

  lifecycle {
    ignore_changes = [tags_all]
  }
}

# -----------------------------------------------------------------------
# Task Definition
#
# container_definitions 是 JSON 字符串（AWS provider 历史设计）。
# 用 jsonencode() 在 HCL 里写 map/list，Terraform 自动序列化成 JSON。
#
# 11 个 env var 全部通过变量注入，不硬编码。
# DB_HOST / REDIS_HOST 不在这里 — 硬编码在 config.production.yml 里
# 随 Docker 镜像打包（已知技术债，import 阶段不改）。
# -----------------------------------------------------------------------
resource "aws_ecs_task_definition" "main" {
  family                   = "mealdice-backend-task"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = data.aws_iam_role.task_execution.arn
  skip_destroy             = false

  runtime_platform {
    cpu_architecture        = "X86_64"
    operating_system_family = "LINUX"
  }

  lifecycle {
    ignore_changes = [tags_all]
  }

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "083308938013.dkr.ecr.us-east-2.amazonaws.com/mealdice-backend:latest"
      essential = true

      portMappings = [
        {
          appProtocol   = "http"
          containerPort = 3001
          hostPort      = 3001
          name          = "backend-3001-tcp"
          protocol      = "tcp"
        }
      ]

      # AWS normalises environment vars into alphabetical order by name.
      environment = [
        { name = "ANTHROPIC_API_KEY",    value = var.anthropic_api_key },
        { name = "DB_PASSWORD",          value = var.db_password },
        { name = "DB_USERNAME",          value = var.db_username },
        { name = "GOOGLE_CLIENT_ID",     value = var.google_client_id },
        { name = "GOOGLE_CLIENT_SECRET", value = var.google_client_secret },
        { name = "JWT_SECRET",           value = var.jwt_secret },
        { name = "MAIL_PASS",            value = var.mail_pass },
        { name = "MAIL_USER",            value = var.mail_user },
        { name = "NODE_ENV",             value = var.node_env },
        { name = "SLACK_WEBHOOK_URL",    value = var.slack_webhook_url },
        { name = "UNSPLASH_ACCESS_KEY",  value = var.unsplash_access_key },
      ]

      environmentFiles = []
      mountPoints      = []
      volumesFrom      = []
      systemControls   = []
      ulimits          = []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-create-group"  = "true"
          "awslogs-group"         = "/ecs/mealdice-backend-task"
          "awslogs-region"        = "us-east-2"
          "awslogs-stream-prefix" = "ecs"
        }
        secretOptions = []
      }
    }
  ])
}

# -----------------------------------------------------------------------
# ECS Service
#
# capacity_provider_strategy 而不是 launch_type：
# AWS 里 launchType = null，服务用的是 capacity provider 策略。
# 写 launch_type = "FARGATE" 会导致 import 后 plan 有 diff。
#
# ignore_changes = [task_definition]：
# 防止 terraform apply 意外切换 task definition revision。
# 为未来 CI/CD 升级（register-task-definition 标准方式）做准备。
# -----------------------------------------------------------------------
resource "aws_ecs_service" "main" {
  name            = "mealdice-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = 2

  availability_zone_rebalancing = "ENABLED"
  enable_ecs_managed_tags       = true

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 0
  }

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = "backend"
    container_port   = 3001
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition, tags_all, wait_for_steady_state]
  }
}
