output "cluster_name" {
  value = aws_eks_cluster.this.name
}

output "cluster_endpoint" {
  value = aws_eks_cluster.this.endpoint
}

output "cluster_certificate_authority_data" {
  value = aws_eks_cluster.this.certificate_authority[0].data
}

output "oidc_issuer_url" {
  description = "Needed to set up IRSA (IAM Roles for Service Accounts) for in-cluster controllers (ALB controller, External Secrets, cluster-autoscaler)."
  value       = aws_eks_cluster.this.identity[0].oidc[0].issuer
}
