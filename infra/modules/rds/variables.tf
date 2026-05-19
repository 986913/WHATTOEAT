# =======================================================================
# RDS 模块变量
#
# 这些变量由根模块（infra/main.tf）传入。
# 模块本身不知道值是什么，只声明它需要什么。
# =======================================================================

variable "app_name" {
  description = "Application name prefix"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

# VPC 模块的输出传进来
variable "subnet_ids" {
  description = "List of subnet IDs for the DB subnet group (from vpc module)"
  type        = list(string)
}

variable "rds_sg_id" {
  description = "Security group ID to attach to the RDS instance (from vpc module)"
  type        = string
}

# sensitive = true：terraform plan/apply 输出里显示为 (sensitive value)，
# 密码不会打印到终端。
variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "db_username" {
  description = "RDS master username"
  type        = string
}
