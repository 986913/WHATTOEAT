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
