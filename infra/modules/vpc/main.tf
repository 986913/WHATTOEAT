# =======================================================================
# VPC 模块
#
# 当前架构：使用 AWS 默认 VPC（172.31.0.0/16），所有 subnet 均为 public。
# 这是历史遗留的手动创建方式，安全性依赖 Security Group 而非子网隔离。
# 未来可迁移至自定义 VPC（10.0.0.0/16，含 private subnet）以提升安全性。
# =======================================================================

# -----------------------------------------------------------------------
# Default VPC
#
# 用 aws_default_vpc 而不是 aws_vpc 的原因：
# aws_default_vpc 是 AWS 账户自带的特殊资源，Terraform 即使 destroy
# 也不会真正删除它。如果用普通 aws_vpc，terraform destroy 会删掉整个网络层。
# -----------------------------------------------------------------------
resource "aws_default_vpc" "main" {
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.app_name}-default-vpc"
  }
}

# -----------------------------------------------------------------------
# Default Subnets（3个，全是 public）
#
# 同理使用 aws_default_subnet 而不是 aws_subnet，防止 destroy 真的删除子网。
# map_public_ip_on_launch = true 是 default subnet 的固有属性，
# 意味着启动在这些子网里的 EC2 会自动分配公网 IP。
# -----------------------------------------------------------------------
resource "aws_default_subnet" "az_a" {
  availability_zone = "us-east-2a"

  tags = {
    Name = "${var.app_name}-default-subnet-2a"
  }
}

resource "aws_default_subnet" "az_b" {
  availability_zone = "us-east-2b"

  tags = {
    Name = "${var.app_name}-default-subnet-2b"
  }
}

resource "aws_default_subnet" "az_c" {
  availability_zone = "us-east-2c"

  tags = {
    Name = "${var.app_name}-default-subnet-2c"
  }
}

# -----------------------------------------------------------------------
# Security Group（单一共享 SG）
#
# 理想架构是 ALB/ECS/RDS/ElastiCache 各用独立 SG（最小权限原则），
# 但当前 AWS 里只有这一个手动创建的 SG，先 import 现状，
# 拆分 SG 可以作为后续独立的安全加固任务。
#
# self = true：允许同一个 SG 内的资源互相访问该端口。
# 3001（backend）和 6379（Redis）只对 SG 内部开放，不暴露公网。
#
# ⚠️ 22 端口开放给 0.0.0.0/0 是安全隐患，后续应收紧为特定 IP。
# -----------------------------------------------------------------------
resource "aws_security_group" "main" {
  name        = "my-web-app-sg"
  description = "my-web-app-sg" # 与 AWS 里的实际 description 保持一致，改动会触发重建
  vpc_id      = aws_default_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # HTTP 公开访问，ALB 负责转发
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # HTTPS 公开访问
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # TODO: 收紧为 VPN/跳板机 IP
  }

  ingress {
    from_port = 3001
    to_port   = 3001
    protocol  = "tcp"
    self      = true # 只允许同 SG 内的资源访问（ALB → ECS backend）
  }

  ingress {
    from_port = 6379
    to_port   = 6379
    protocol  = "tcp"
    self      = true # 只允许同 SG 内的资源访问（ECS → ElastiCache Redis）
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"          # -1 = 所有协议
    cidr_blocks = ["0.0.0.0/0"] # 出站流量不限制
  }

  tags = {
    Name = "my-web-app-sg"
  }
}
