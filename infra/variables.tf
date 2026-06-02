# =======================================================================
# 根模块变量定义
#
# 变量把「会变化的值」从资源定义里抽出来，类比 React 的 props。
# 实际值写在 envs/prod.tfvars（gitignored），不写在这里。
#
# 变量三种情况：
#   - 有 default：不传也能跑，用默认值
#   - 无 default：必须在 .tfvars 里提供，否则报错
#   - sensitive = true：值不会打印到终端/日志（密码专用）
# =======================================================================

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-2"
}

# validation 块：Terraform 在 plan 阶段就会校验这个值，
# 避免用错环境名导致资源建错地方。
variable "environment" {
  description = "Deployment environment (prod or dev)"
  type        = string

  validation {
    condition     = contains(["prod", "dev"], var.environment)
    error_message = "environment must be either 'prod' or 'dev'."
  }
}

# 所有资源名的前缀，例如：mealdice-prod-alb、mealdice-prod-rds
variable "app_name" {
  description = "Application name, used as a prefix for resource names"
  type        = string
  default     = "mealdice"
}

# sensitive = true：terraform plan/apply 输出时显示为 (sensitive value)，
# 不会把密码打印到终端。但 state 文件里仍然是明文，所以 state 也要加密。
variable "db_password" {
  description = "RDS master password — never commit this value"
  type        = string
  sensitive   = true
}

# db_name 是 ECS 容器的环境变量（告诉 app 连哪个 schema），
# 不是 RDS 实例的初始数据库名（RDS 创建时没有指定 db_name）。
variable "db_name" {
  description = "Database schema name used by the application"
  type        = string
  default     = "mealdice"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "admin"
}

variable "domain_name" {
  description = "Primary domain name (e.g. mealdice.com)"
  type        = string
}

# OIDC trust policy 用这个值限制只有这个 repo 的 main 分支
# 才能 assume GitHub Actions IAM role，防止 fork 冒用权限。
variable "github_repo" {
  description = "GitHub repo in owner/repo format for OIDC trust policy"
  type        = string
  default     = "986913/WHATTOEAT"
}

variable "rds_sg_id" {
  description = "Security group ID attached to the RDS instance — defaults to the VPC default SG which is what was used at creation time"
  type        = string
  default     = "sg-09ffc1c2310dbf1d8"
}

# -----------------------------------------------------------------------
# ECS 模块变量（task definition 容器 env var）
# -----------------------------------------------------------------------

variable "jwt_secret" {
  description = "JWT signing secret — never commit this value"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic Claude API key — never commit this value"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret — never commit this value"
  type        = string
  sensitive   = true
}

variable "mail_pass" {
  description = "Gmail app password — never commit this value"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack incoming webhook URL — never commit this value"
  type        = string
  sensitive   = true
}

variable "unsplash_access_key" {
  description = "Unsplash API access key — never commit this value"
  type        = string
  sensitive   = true
}
