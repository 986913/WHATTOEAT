# =======================================================================
# RDS 模块输出
#
# 其他模块（ECS）通过这些 output 拿到数据库地址，
# 写法：module.rds.db_endpoint、module.rds.db_address
# =======================================================================

output "db_endpoint" {
  description = "RDS instance endpoint — host:port (e.g. database-2.xxx.us-east-2.rds.amazonaws.com:3310)"
  value       = aws_db_instance.main.endpoint
}

output "db_address" {
  description = "RDS hostname only (no port) — useful for debugging"
  value       = aws_db_instance.main.address
}
