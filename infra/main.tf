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
