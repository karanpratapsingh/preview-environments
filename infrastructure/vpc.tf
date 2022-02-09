resource "aws_vpc" "vpc-preview" {
  cidr_block = "172.23.0.0/16"
    enable_dns_support = true
    enable_dns_hostnames = true
    enable_classiclink = false

  tags = {
    Name = "vpc-preview"
  }
}

