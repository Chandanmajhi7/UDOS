terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Not enabled by default — this file documents the intended backend rather than
  # pointing at infrastructure that doesn't exist yet. Uncomment once the state
  # bucket/lock table below are created (a one-time `terraform apply` with a local
  # backend, per HashiCorp's own bootstrapping pattern), then `terraform init
  # -migrate-state`.
  #
  # backend "s3" {
  #   bucket         = "udos-terraform-state"
  #   key            = "dev/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "udos-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "udos"
      Environment = "dev"
      ManagedBy   = "terraform"
    }
  }
}
