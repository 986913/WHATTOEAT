# =======================================================================
# ElastiCache 模块变量
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
  description = "List of subnet IDs for the ElastiCache subnet group (from vpc module)"
  type        = list(string)
}

variable "redis_sg_id" {
  description = "Security group ID to attach to the Redis cluster (from vpc module)"
  type        = string
}
