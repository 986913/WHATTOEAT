# =======================================================================
# 根模块：把所有子模块串联起来
#
# 每个 module 块对应 modules/ 下的一个目录。
# 模块之间通过 output → 变量 的方式传递值，
# 例如：module.vpc.output.sg_id → module.rds 的 security_group_ids。
#
# 添加新模块的步骤：
#   1. 在 modules/ 下创建新目录
#   2. 在这里添加 module 块
#   3. terraform init（让 Terraform 发现新模块）
#   4. terraform import（把已有 AWS 资源导入 state）
#   5. terraform plan（验证 0 changes）
# =======================================================================

module "vpc" {
  source      = "./modules/vpc"
  app_name    = var.app_name
  environment = var.environment
}

module "rds" {
  source      = "./modules/rds"
  app_name    = var.app_name
  environment = var.environment

  # 从 VPC 模块拿subnets和security group IDs
  # module.vpc.subnet_ids = VPC模块outputs.tf里定义的输出
  subnet_ids = module.vpc.subnet_ids
  rds_sg_id  = var.rds_sg_id

  # 敏感变量从 prod.tfvars 传入，不硬编码
  db_password = var.db_password
  db_username = var.db_username
}

module "elasticache" {
  source      = "./modules/elasticache"
  app_name    = var.app_name
  environment = var.environment

  # 子网和 SG 直接来自 VPC 模块的输出，不需要根模块变量。
  # 和 RDS 不同：RDS 的 SG 是历史遗留的默认 SG，不在 Terraform 管理内；
  # ElastiCache 用的 my-web-app-sg 已由 vpc 模块管理，可以直接引用。
  subnet_ids  = module.vpc.subnet_ids
  redis_sg_id = module.vpc.sg_id
}

module "alb" {
  source      = "./modules/alb"
  app_name    = var.app_name
  environment = var.environment

  # 子网和 SG 直接来自 VPC 模块的输出
  subnet_ids = module.vpc.subnet_ids
  alb_sg_id  = module.vpc.sg_id

  # domain_name 用于查找 ACM 证书
  domain_name = var.domain_name
}

module "ecs" {
  source      = "./modules/ecs"
  app_name    = var.app_name
  environment = var.environment

  # 来自 vpc 模块
  subnet_ids = module.vpc.subnet_ids
  ecs_sg_id  = module.vpc.sg_id

  # 来自 alb 模块
  target_group_arn = module.alb.target_group_arn

  # 敏感 env var — 从 prod.tfvars 传入
  # 注意：db_username 在根模块已有（RDS 也用），其余敏感值是 ECS 专属新增
  # node_env / google_client_id / mail_user 不传，使用 ECS 模块变量的默认值
  db_password          = var.db_password
  db_username          = var.db_username
  jwt_secret           = var.jwt_secret
  anthropic_api_key    = var.anthropic_api_key
  google_client_secret = var.google_client_secret
  mail_pass            = var.mail_pass
  slack_webhook_url    = var.slack_webhook_url
  unsplash_access_key  = var.unsplash_access_key
}
