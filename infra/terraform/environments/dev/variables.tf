variable "aws_region" {
  description = "ap-south-1 (Mumbai) — India-first per PRD §10; data residency matters once DPDP Act compliance is in scope."
  type        = string
  default     = "ap-south-1"
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b"]
}

variable "db_master_password" {
  description = "Set via TF_VAR_db_master_password from the secrets manager, never committed."
  type        = string
  sensitive   = true
}
