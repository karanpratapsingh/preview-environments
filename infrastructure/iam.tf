# IAM role ecsTaskExecutionRole for ECS task excecution
resource "aws_iam_role" "task_execution_role" {
  name = "app-ecsTaskExecutionRole"
  max_session_duration = "7200"
  assume_role_policy = jsonencode({
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
        "Service": ["ecs.amazonaws.com", "ecs-tasks.amazonaws.com"]
      },
      "Effect": "Allow",
      "Sid": ""
      }
    ]
  })
}

# Define and attach default policy AmazonECSTaskExecutionRolePolicy by AWS with ecsTaskExecutionRole
data "aws_iam_policy" "AmazonECSTaskExecutionRolePolicy" {
  arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy_attachment" "task_execution_role_policy-ecs" {
  role       = aws_iam_role.task_execution_role.name
  policy_arn = data.aws_iam_policy.AmazonECSTaskExecutionRolePolicy.arn
}

# Define and attach default policy AmazonSSMManagedInstanceCore by AWS with ecsTaskExecutionRole
data "aws_iam_policy" "AmazonSSMManagedInstanceCore" {
  arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "task_execution_role_policy-ssm-core" {
  role       = aws_iam_role.task_execution_role.name
  policy_arn = data.aws_iam_policy.AmazonSSMManagedInstanceCore.arn
}

# Define and attach custom server-policy for our application
# KMS
# CloudWatch
# CloudWatch Logs
# SSM
resource "aws_iam_policy" "server_policy" {
  name = "app-server-policy"
  policy = jsonencode({
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "kms:*",
          "logs:*",
          "cloudwatch:*",
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ],
        "Resource": "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "task_execution_role_policy-server-policy" {
  role       = aws_iam_role.task_execution_role.name
  policy_arn = aws_iam_policy.server_policy.arn
}
