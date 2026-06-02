# =======================================================================
# ECS 模块输出
#
# ecs_cluster_name → GitHub Actions deploy workflow 引用
# ecr_repo_url     → GitHub Actions push 镜像时引用
# =======================================================================

output "ecs_cluster_name" {
  description = "ECS cluster name — used by GitHub Actions deploy workflow"
  value       = aws_ecs_cluster.main.name
}

output "ecr_repo_url" {
  description = "ECR repository URL — GitHub Actions push image here"
  value       = aws_ecr_repository.main.repository_url
}
