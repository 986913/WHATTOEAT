# =======================================================================
# ALB 模块变量
#
# 这些变量由根模块（infra/main.tf）传入。
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
  description = "List of subnet IDs for the ALB (from vpc module)"
  type        = list(string)
}

variable "alb_sg_id" {
  description = "Security group ID for the ALB (from vpc module)"
  type        = string
}

variable "domain_name" {
  description = "Primary domain name used to look up the ACM certificate (e.g. mealdice.com)"
  type        = string
}
