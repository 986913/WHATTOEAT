# =======================================================================
# ALB 模块
#
# 三个资源 + 一个 data source：
#   data "aws_acm_certificate"     — 查找 ACM 证书 ARN（不 import，只读）
#   aws_lb                         — ALB 本体
#   aws_lb_target_group            — 目标组（ECS Fargate 任务注册到这里）
#   aws_lb_listener                — HTTPS 443 监听器
# =======================================================================

# -----------------------------------------------------------------------
# ACM 证书（data source，不 import）
#
# data source 的含义：Terraform 只读取这个资源，不管理它。
# 用 domain 名查证书 ARN，好处是切换环境时只需改 domain_name 变量，
# 不用改代码里的 ARN 字符串。
# -----------------------------------------------------------------------
data "aws_acm_certificate" "main" {
  domain      = "api.${var.domain_name}"   # "api.mealdice.com" — ALB 前的 API 子域名
  statuses    = ["ISSUED"]                 # 只找已签发的，跳过 pending/expired
  most_recent = true                       # 万一同一 domain 有多张证书，取最新的
}

# -----------------------------------------------------------------------
# ALB 本体
#
# idle_timeout = 300 必须显式写出来！
# AWS 里改成了 300s，但 Terraform 默认值是 60s。
# 不写这行，plan 就会显示 "change idle_timeout: 300 → 60"，导致 plan 有 diff。
# -----------------------------------------------------------------------
resource "aws_lb" "main" {
  name               = "mealdice-alb"
  internal           = false            # internet-facing，接受外部流量
  load_balancer_type = "application"    # ALB，不是 NLB
  security_groups    = [var.alb_sg_id]
  subnets            = var.subnet_ids

  idle_timeout = 300

  tags = {}

  lifecycle {
    # 这个 ALB 在 Terraform 接管之前就存在，AWS 里没有 default_tags 定义的标签。
    # ignore_changes 防止 Terraform 每次 plan 都显示"要添加 default_tags"的虚假 diff。
    # 如果以后要给 ALB 打标签，直接在 tags = {} 里加，不受这个 ignore 影响。
    ignore_changes = [tags_all]
  }
}

# -----------------------------------------------------------------------
# Target Group
#
# target_type = "ip" 是 Fargate 的关键。
# EC2 用 "instance"（注册 EC2 instance ID）。
# Fargate 用 "ip"（注册 ENI 的 IP 地址，因为 Fargate 没有固定 EC2 实例）。
#
# vpc_id 直接从 aws_lb.main.vpc_id 读取，不需要额外变量。
# -----------------------------------------------------------------------
resource "aws_lb_target_group" "main" {
  name        = "mealdice-fargate-tg"
  port        = 3001       # App 容器监听的端口
  protocol    = "HTTP"     # ALB → 容器 是 HTTP；TLS 在 ALB 层终止
  vpc_id      = aws_lb.main.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/v1/health"
    protocol            = "HTTP"
    port                = "traffic-port"   # 用 target group 端口（3001）
    interval            = 30
    timeout             = 5
    healthy_threshold   = 5
    unhealthy_threshold = 2
    matcher             = "200"            # 期望返回 HTTP 200
  }

  lifecycle {
    # 与 aws_lb.main 同理：Terraform 接管之前无 default_tags，忽略 tags_all diff。
    # lambda_multi_value_headers_enabled / proxy_protocol_v2：
    # provider v5.100 在 schema 里新增了这两个字段；import 后 state 里有它们，
    # 但 HCL 没有显式设置，plan 就会显示 "null → false" 的虚假变更。
    # 忽略这两个字段消除该 diff，不影响实际功能。
    ignore_changes = [tags_all, lambda_multi_value_headers_enabled, proxy_protocol_v2]
  }
}

# -----------------------------------------------------------------------
# HTTPS 监听器
#
# ssl_policy 必须和 AWS 里完全一致，否则 plan 有 diff。
# "ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09" 是 2025 年新的
# TLS 1.3 + Post-Quantum 策略，比默认策略更安全。
# -----------------------------------------------------------------------
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09"
  certificate_arn   = data.aws_acm_certificate.main.arn

  # import 后 Terraform 在 state 里存储的是完整的 forward 块，
  # 简写形式（target_group_arn）会导致 plan 显示删除 forward 块的 diff。
  # 显式写出 forward 块与 AWS 实际配置保持一致。
  default_action {
    type             = "forward"
    # import 后 state 里 target_group_arn 和 forward 块同时存在，
    # 两者都要写才能消除 plan diff。
    target_group_arn = aws_lb_target_group.main.arn

    forward {
      target_group {
        arn    = aws_lb_target_group.main.arn
        weight = 1
      }

      stickiness {
        enabled  = false
        duration = 3600
      }
    }
  }

  lifecycle {
    # 与 aws_lb.main 同理：Terraform 接管之前无 default_tags，忽略 tags_all diff。
    ignore_changes = [tags_all]
  }
}
