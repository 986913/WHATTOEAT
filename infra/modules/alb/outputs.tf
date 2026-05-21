# =======================================================================
# ALB 模块输出
#
# target_group_arn → ECS 模块用，把 Fargate 任务注册进目标组
# alb_dns_name     → Route 53 模块用，创建 Alias 记录指向 ALB
# =======================================================================

output "target_group_arn" {
  description = "Target Group ARN — pass to ECS module to register Fargate tasks"
  value       = aws_lb_target_group.main.arn
}

output "alb_dns_name" {
  description = "ALB DNS hostname — used by Route 53 Alias record"
  value       = aws_lb.main.dns_name
}
