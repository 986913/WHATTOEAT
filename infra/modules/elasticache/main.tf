# =======================================================================
# ElastiCache 模块
#
# 两个资源：
#   1. aws_elasticache_subnet_group      — Redis 必须挂在一个子网组上
#   2. aws_elasticache_replication_group — Redis 集群本体
#      （即使只有 1 个节点，AWS 也用 replication group 来管理）
# =======================================================================

# -----------------------------------------------------------------------
# ElastiCache Subnet Group
# -----------------------------------------------------------------------
resource "aws_elasticache_subnet_group" "main" {
  name        = "mealdice-redis-subnet"
  description = " "        # AWS 里是一个空格，必须完全一致，否则 plan 有 diff
  subnet_ids  = var.subnet_ids

  tags = {}
}

# -----------------------------------------------------------------------
# Redis Replication Group
#
# replication_group_id 必须和 AWS 里的集群名一致。
# auth_token 故意省略 —— AWS 里 AUTH 是 Disabled，
# 访问控制完全依赖 Security Group。
# -----------------------------------------------------------------------
resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "mealdice-redis"
  description          = "MealDice app cache"

  # 2026-11-01 Redis 7.1 → Valkey 8.2、t3 → t4g：Valkey 节点价比 Redis 便宜约 20%，t4g（Graviton）又比 t3 便宜，
  # 合计约省 $3/mo。Valkey 是 Redis 7.2 的开源 fork，协议兼容，ioredis / @keyv/redis 不用改代码。
  node_type          = "cache.t4g.micro"
  engine             = "valkey"
  engine_version     = "8.2"
  num_cache_clusters = 1
  port               = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [var.redis_sg_id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  transit_encryption_mode    = "required"

  automatic_failover_enabled = false
  multi_az_enabled           = false

  parameter_group_name = "default.valkey8" # 参数组按引擎家族区分，换引擎必须一起换

  # 不加这行，引擎/节点变更会被排到下一个 maintenance_window（周五）才执行。
  apply_immediately = true

  snapshot_retention_limit   = 1
  snapshot_window            = "23:00-00:00"
  maintenance_window         = "fri:05:00-fri:06:00"

  tags = {}

  lifecycle {
    # auth_token 在 AWS 里是 Disabled 的，但 import 时 state 里留了一个空的 sensitive 占位值。
    # ignore_changes 防止 Terraform 试图去 rotate/set 一个不存在的 auth token，
    # 否则 terraform apply 会因为 "Invalid AUTH token" 报错。
    ignore_changes = [auth_token, auth_token_update_strategy]
  }
}
