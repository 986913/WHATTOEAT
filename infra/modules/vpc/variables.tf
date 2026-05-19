# 模块变量由根模块的 main.tf 传入，
# 用于生成资源的 Name tag（例如 "mealdice-default-vpc"）。

variable "app_name" {
  description = "Application name prefix"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}
