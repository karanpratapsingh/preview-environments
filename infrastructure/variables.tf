variable "region" {
  default = "us-east-1"
}

variable "subnet_ids" {
  type = list
  description = "List of subnet ids"
  default = ["todo-subnet-1", "todo-subnet-2"]
}
