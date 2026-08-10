# The pool cluster's primary Postgres instance (Architecture §5/§9). A tenant
# promoted to a silo gets its own instance of this same module under a different
# name_prefix — the module is written so "one more cluster" is a new module call,
# not a fork.

resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-db-subnets"
  subnet_ids = var.subnet_ids
  tags       = var.tags
}

resource "aws_security_group" "db" {
  name_prefix = "${var.name_prefix}-db-"
  vpc_id      = var.vpc_id
  ingress {
    description     = "Postgres from the EKS node group only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.allowed_security_group_id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = merge(var.tags, { Name = "${var.name_prefix}-db-sg" })
}

# Forces SSL — the app's DATABASE_URL uses ?sslmode=require (see environments/dev
# outputs), and this is the server-side half of that requirement, not just a
# client-side setting the server would silently accept without.
resource "aws_db_parameter_group" "this" {
  name_prefix = "${var.name_prefix}-pg16-"
  family      = "postgres16"
  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_db_instance" "this" {
  identifier     = "${var.name_prefix}-postgres"
  engine         = "postgres"
  engine_version = "16"

  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage_gb
  storage_type           = "gp3"
  storage_encrypted      = true
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.db.id]
  parameter_group_name   = aws_db_parameter_group.this.name

  db_name  = "udos"
  username = var.master_username
  password = var.master_password
  port     = 5432

  multi_az                  = var.multi_az
  backup_retention_period   = 35            # matches docs/phase-3-database-design.md §6's daily-snapshot retention
  backup_window             = "03:00-04:00" # low-traffic window, IST daytime (Architecture is India-first — PRD §10)
  copy_tags_to_snapshot     = true
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name_prefix}-postgres-final"

  # WAL archiving for point-in-time recovery (docs/phase-3-database-design.md §6's
  # RPO target) is on by default for RDS Postgres via automated backups — no
  # separate resource needed.
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = var.tags
}

# The dashboard/analytics read replica from Architecture §10's CQRS-lite pattern —
# heavy Chairman-dashboard aggregation queries read from here, never the primary.
resource "aws_db_instance" "read_replica" {
  identifier             = "${var.name_prefix}-postgres-replica"
  replicate_source_db    = aws_db_instance.this.identifier
  instance_class         = var.instance_class
  storage_encrypted      = true
  publicly_accessible    = false
  vpc_security_group_ids = [aws_security_group.db.id]
  tags                   = var.tags
}
