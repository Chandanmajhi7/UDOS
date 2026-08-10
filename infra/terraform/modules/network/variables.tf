variable "name_prefix" {
  description = "Prefix applied to every resource name in this module (e.g. \"udos-dev\")."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zones" {
  description = "AZs to spread subnets across. Two is the minimum for RDS Multi-AZ and an HA EKS control plane."
  type        = list(string)
}

variable "tags" {
  description = "Tags applied to every resource this module creates."
  type        = map(string)
  default     = {}
}
