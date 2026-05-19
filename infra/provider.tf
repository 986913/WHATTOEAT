# =======================================================================
# Provider 配置
#
# 这是 Terraform 的「入口」，声明：
#   1. 用哪个版本的 Terraform
#   2. 用哪个 Provider（相当于 npm install 的 SDK）
#   3. Provider 怎么连接 AWS
# =======================================================================

terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # ~> 5.0 = 5.x 都接受，但不接受 6.x（防止 breaking change）
    }
  }
}

# 主 Provider：所有资源默认用这个（us-east-2）
#
# default_tags：这里定义的 tag 会自动加到每一个 Terraform 创建的 AWS 资源上，
# 不需要在每个 resource 里重复写。好处：
#   - AWS Cost Explorer 可以按 Project / Environment 拆分账单
#   - 一眼能看出哪些资源是 Terraform 管的
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.app_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# CloudFront 专用 Provider（us-east-1）
#
# CloudFront 是全球服务，但它要求 ACM 证书必须在 us-east-1 申请，
# 无论你的其他资源在哪个 region。这个 alias provider 专门用来
# 在 us-east-1 查找/创建 ACM 证书。
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
