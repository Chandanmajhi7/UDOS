variable "name_prefix" {
  type = string
}

variable "kubernetes_version" {
  type    = string
  default = "1.31"
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "public_subnet_ids" {
  description = "The EKS control plane's ENIs span both — required for the API server endpoint to be reachable; worker nodes themselves still launch into private subnets only (node_group below)."
  type        = list(string)
}

variable "node_instance_types" {
  type    = list(string)
  default = ["m6i.large"]
}

variable "node_desired_size" {
  type    = number
  default = 3
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  description = "Ceiling for cluster-autoscaler / Karpenter, on top of each Deployment's own HPA (infra/k8s/base) — this is node-level scaling, HPA is pod-level."
  type        = number
  default     = 10
}

variable "tags" {
  type    = map(string)
  default = {}
}
