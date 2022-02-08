provider "aws" {
  region = var.region
}

# ECR repository
resource "aws_ecr_repository" "ecr_repository" {
  name                 = "app-repository"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# ECS task definition used by ECS service
resource "aws_ecs_task_definition" "task_definition" {
  family                   = "app-task-definition"
  network_mode             = "awsvpc"
  cpu                      = 4096
  memory                   = 8192
  requires_compatibilities = ["FARGATE"]
  container_definitions    = jsonencode([
  {
    "name": "app",
    "image": "nginx:latest",
    "essential": true,
    "portMappings": [
      {
        "containerPort": 4000,
        "hostPort": 4000
      }
    ]
  }
])
  task_role_arn            = aws_iam_role.task_execution_role.arn
  execution_role_arn       = aws_iam_role.task_execution_role.arn

  # Ignore chages to dynamic content so that terraform doesn't re-apply
  lifecycle {
    ignore_changes = [container_definitions, task_role_arn]
  }
}

# Security group
resource "aws_security_group" "security_group" {
  name   = "app-security-group"
  vpc_id = "${aws_vpc.vpc-preview.id}"

  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS cluster
resource "aws_ecs_cluster" "cluster" {
  name = "ecs-cluster"
  capacity_providers = ["FARGATE"]
}

resource "aws_cloudwatch_log_group" "log_group" {
  name = "/ecs/app-log-group"
}
