# =======================================================================
# ECS 模块变量
#
# 分三类：
#   1. 网络层 — 来自 vpc / alb 模块的 output
#   2. 敏感 env var — 来自 prod.tfvars（sensitive=true，不打印到终端）
#   3. 非敏感 env var — 有默认值，不用写进 tfvars
# =======================================================================

variable "app_name" {
  description = "Application name prefix"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for ECS tasks (from vpc module)"
  type        = list(string)
}

variable "ecs_sg_id" {
  description = "Security group ID for ECS service (from vpc module)"
  type        = string
}

variable "target_group_arn" {
  description = "ALB target group ARN to register ECS tasks into (from alb module)"
  type        = string
}

# -----------------------------------------------------------------------
# 敏感 env var（sensitive = true → plan/apply 输出显示为 (sensitive value)）
# -----------------------------------------------------------------------

variable "db_password" {
  description = "DB_PASSWORD env var — RDS master password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT_SECRET env var — token signing secret"
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "ANTHROPIC_API_KEY env var — Claude API key"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "GOOGLE_CLIENT_SECRET env var — OAuth client secret"
  type        = string
  sensitive   = true
}

variable "mail_pass" {
  description = "MAIL_PASS env var — Gmail app password"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "SLACK_WEBHOOK_URL env var — Slack incoming webhook"
  type        = string
  sensitive   = true
}

variable "unsplash_access_key" {
  description = "UNSPLASH_ACCESS_KEY env var — Unsplash API key"
  type        = string
  sensitive   = true
}

# -----------------------------------------------------------------------
# 非敏感 env var（有默认值，不需要写进 prod.tfvars）
# -----------------------------------------------------------------------

variable "db_username" {
  description = "DB_USERNAME env var — RDS master username"
  type        = string
  default     = "admin"
}

variable "google_client_id" {
  description = "GOOGLE_CLIENT_ID env var — OAuth client ID"
  type        = string
  default     = "235854066598-8278nub5a7cju5t6iq5hi3k7vt7s6f34.apps.googleusercontent.com"
}

variable "mail_user" {
  description = "MAIL_USER env var — sender Gmail address"
  type        = string
  default     = "merylliu1994@gmail.com"
}

variable "node_env" {
  description = "NODE_ENV env var — runtime environment"
  type        = string
  default     = "production"
}
