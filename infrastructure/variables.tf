variable "region" {
  default = "us-east-1"
}

variable "vpc_id" {
  type = string
  description = "VPC id"
  default = "todo-vpc"
}

variable "subnet_ids" {
  type = list
  description = "List of subnet ids"
  default = ["todo-subnet-1", "todo-subnet-2"]
}
