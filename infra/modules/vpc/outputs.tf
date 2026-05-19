# =======================================================================
# VPC 模块输出
#
# 其他模块（rds、elasticache、alb、ecs）通过这些 output 拿到
# 网络层的 ID，写法：module.vpc.vpc_id、module.vpc.sg_id 等。
#
# 这是模块间传值的标准方式，避免硬编码 ID。
# =======================================================================

output "vpc_id" {
  description = "ID of the default VPC"
  value       = aws_default_vpc.main.id
}

# 所有子网都是 public，后续模块（ALB、ECS、RDS）全部用这个列表。
# 理想架构应区分 public/private，但当前是单 VPC 平铺结构。
output "subnet_ids" {
  description = "All subnet IDs (all public — default VPC has no private subnets)"
  value = [
    aws_default_subnet.az_a.id,
    aws_default_subnet.az_b.id,
    aws_default_subnet.az_c.id,
  ]
}

# 所有资源共用同一个 SG，所以只有一个 sg_id 输出。
# 理想架构应分别输出 alb_sg_id、ecs_sg_id 等。
output "sg_id" {
  description = "ID of the shared security group (all resources share this SG)"
  value       = aws_security_group.main.id
}
