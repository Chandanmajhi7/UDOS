output "eks_cluster_name" {
  value = module.cluster.cluster_name
}

output "eks_cluster_endpoint" {
  value = module.cluster.cluster_endpoint
}

output "database_primary_endpoint" {
  value = module.database.primary_endpoint
}

output "database_read_replica_endpoint" {
  value = module.database.read_replica_endpoint
}

output "configure_kubectl" {
  value = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.cluster.cluster_name}"
}
