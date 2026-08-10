locals {
  name_prefix = "udos-dev"
  tags = {
    Wave = "0-1"
  }
}

module "network" {
  source             = "../../modules/network"
  name_prefix        = local.name_prefix
  availability_zones = var.availability_zones
  tags               = local.tags
}

module "cluster" {
  source             = "../../modules/cluster"
  name_prefix        = local.name_prefix
  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  public_subnet_ids  = module.network.public_subnet_ids
  tags               = local.tags
}

module "database" {
  source                    = "../../modules/database"
  name_prefix               = local.name_prefix
  vpc_id                    = module.network.vpc_id
  subnet_ids                = module.network.private_subnet_ids
  allowed_security_group_id = module.network.node_security_group_id
  master_password           = var.db_master_password
  # dev environment: single-AZ, smaller instance — the "Starter/Growth" plan band
  # (PRD §6.1), not the multi-AZ silo topology a promoted tenant gets.
  multi_az       = false
  instance_class = "db.t4g.small"
  tags           = local.tags
}
