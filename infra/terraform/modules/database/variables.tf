variable "name_prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  description = "Private subnet IDs (modules/network's private_subnet_ids) — RDS never gets a public subnet."
  type        = list(string)
}

variable "allowed_security_group_id" {
  description = "Only this security group (the EKS node group's) may reach Postgres — modules/network's node_security_group_id."
  type        = string
}

variable "instance_class" {
  description = "db.t4g.medium is the Growth-plan default (PRD §6.1's student-count bands); bump per tenant tier at apply time, not by editing this module."
  type        = string
  default     = "db.t4g.medium"
}

variable "allocated_storage_gb" {
  type    = number
  default = 100
}

variable "multi_az" {
  description = "True for any tenant promoted to a silo cluster (Architecture §5/§9) — false is acceptable for the shared pool cluster's non-primary replicas only."
  type        = bool
  default     = true
}

variable "master_username" {
  description = "The migration/superuser role — NOT udos_app/udos_platform_admin, which the RLS migration itself creates on first `prisma migrate deploy` (docs/phase-3-database-design.md §3)."
  type        = string
  default     = "udos_superuser"
}

variable "master_password" {
  description = "Provided via TF_VAR_master_password from the secrets manager at apply time — never committed, never given a default."
  type        = string
  sensitive   = true
}

variable "tags" {
  type    = map(string)
  default = {}
}
