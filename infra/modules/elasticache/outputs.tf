# =======================================================================
# ElastiCache 模块输出
#
# ECS 模块通过 module.elasticache.redis_primary_endpoint
# 拿到 Redis 地址，注入为容器环境变量 REDIS_HOST。
# =======================================================================

output "redis_primary_endpoint" {
  description = "Redis primary endpoint hostname — use in ECS task env vars as REDIS_HOST"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}
