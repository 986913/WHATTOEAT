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
