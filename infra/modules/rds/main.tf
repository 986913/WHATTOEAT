# =======================================================================
# RDS 模块
#
# 两个资源：
#   1. aws_db_subnet_group — RDS 实例必须挂在一个子网组上
#   2. aws_db_instance     — 真正的 MySQL 实例
#
# 注意：db_name 字段故意省略。
# 这个 RDS 实例创建时没有指定 initial database，
# eatdbprod 是后来手动通过 CLI 建的，不属于 Terraform 管理范围。
# =======================================================================

# -----------------------------------------------------------------------
# DB Subnet Group
#
# name 必须和 AWS 里的真实名字一致，否则 import 后 plan 会有 diff。
# subnet_ids 来自 VPC 模块的输出，不硬编码。
# -----------------------------------------------------------------------
resource "aws_db_subnet_group" "main" {
  name        = "default-vpc-0de0822aefb86efbd"
  description = "Created from the RDS Management Console"
  subnet_ids  = var.subnet_ids

  tags = {}
}

# -----------------------------------------------------------------------
# RDS Instance
#
# identifier = "database-2" 是 AWS 里这个实例的固定名字，不用变量。
# 所有字段值来自 AWS CLI 查询，确保 import 后 plan = 0 changes
# -----------------------------------------------------------------------
resource "aws_db_instance" "main" {
  identifier = "database-2"

  engine         = "mysql"
  engine_version = "8.4.8"
  instance_class = "db.t4g.micro"

  username = var.db_username
  password = var.db_password

  # db_name 故意省略 —— RDS 创建时没有指定 initial database。
  # eatdbprod 是后来手动通过 CLI 建的 MySQL schema，不属于 Terraform 管理范围。

  port = 3310

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]

  allocated_storage     = 20
  max_allocated_storage = 1000
  storage_type          = "gp2"
  storage_encrypted     = true

  auto_minor_version_upgrade = true
  copy_tags_to_snapshot      = true

  backup_retention_period = 1
  backup_window           = "04:09-04:39"
  maintenance_window      = "sat:06:13-sat:06:43"

  monitoring_interval = 60
  monitoring_role_arn = "arn:aws:iam::083308938013:role/rds-monitoring-role"  # 历史遗留 IAM role，创建于 Terraform 管理之前，暂不纳入 Terraform 管理

  ca_cert_identifier   = "rds-ca-rsa2048-g1"
  option_group_name    = "default:mysql-8-4"
  parameter_group_name = "default.mysql8.4"

  multi_az            = true
  publicly_accessible = true   # TODO: 收紧为仅 ECS SG 访问；当前允许公网连接是历史遗留，需单独安全加固任务处理
  apply_immediately   = false
  deletion_protection = false  # TODO: 生产数据库建议启用；当前是历史遗留值，启用前需确认 skip_final_snapshot = true 的影响
  skip_final_snapshot = true

  tags = {}
}
