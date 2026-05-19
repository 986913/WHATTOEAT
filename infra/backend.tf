# =======================================================================
# Remote Backend 配置
#
# 告诉 Terraform：「把 state 文件存到 S3，而不是本地」
#
# 为什么需要 remote state？
#   - 本地 state 丢失 = 永远失去对所有 AWS 资源的追踪
#   - 多人协作时本地 state 会冲突
#   - S3 有版本控制，可以回滚
#
# key = "prod/terraform.tfstate"：state 文件在 S3 bucket 里的路径。
# 如果将来加 dev 环境，dev 的 key 就是 "dev/terraform.tfstate"，
# 两个环境的 state 完全隔离。
#
# use_lockfile = true：Terraform 1.10+ 的 S3 原生锁机制。
# 每次 apply 时在 S3 创建一个 .tflock 文件，防止两个人同时 apply
# 导致 state 损坏。apply 完成后自动删除。
# =======================================================================
terraform {
  backend "s3" {
    bucket       = "mealdice-tfstate"
    key          = "prod/terraform.tfstate"
    region       = "us-east-2"
    use_lockfile = true  # S3 原生锁，替代旧版的 dynamodb_table
    encrypt      = true  # state 文件在 S3 中加密存储
  }
}
