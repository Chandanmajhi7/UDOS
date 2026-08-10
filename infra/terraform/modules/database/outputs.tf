output "primary_endpoint" {
  value = aws_db_instance.this.endpoint
}

output "read_replica_endpoint" {
  value = aws_db_instance.read_replica.endpoint
}

output "security_group_id" {
  value = aws_security_group.db.id
}
