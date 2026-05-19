# =======================================================================
# Bootstrap — 只跑一次，永远不要 destroy
#
# 这个模块用「本地 state」管理自己（没有 backend 配置），
# 因为它创建的就是存放所有其他 state 的 S3 bucket。
# 如果用远程 state 管自己，就会产生鸡生蛋的死循环。
# =======================================================================

terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-2"
}

# -----------------------------------------------------------------------
# S3 bucket：存放所有 Terraform state 文件
#
# prevent_destroy = true：如果有人不小心跑 terraform destroy，
# Terraform 会直接报错拒绝。失去 state 文件 = 失去对所有资源的追踪。
#
# versioning：S3 会保留 state 文件的每个历史版本，
# 相当于给 state 加了 git history，误操作可以回滚。
#
# public_access_block：state 文件包含敏感信息（资源 ID、输出值），
# 必须屏蔽所有公开访问。
# -----------------------------------------------------------------------
resource "aws_s3_bucket" "tfstate" {
  bucket = "mealdice-tfstate"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name    = "mealdice-tfstate"
    Purpose = "Terraform remote state"
  }
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

