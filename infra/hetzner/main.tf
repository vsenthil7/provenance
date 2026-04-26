# Provenance rollup — Hetzner Cloud (CX22, nbg1) — HACKATHON MINIMAL
#
# This is a stripped-down variant of the planned production topology
# (see docs/DEPLOYMENT_TOPOLOGY.md). For the HACK0016 submission we drop
# Cloudflare DNS, Better Stack, and Discord alerting and run with raw IPv4
# access. Production-grade topology resumes post-hackathon (see
# docs/DEPLOYMENT_TOPOLOGY.md §2 and CUSTOMER_BUYER_REVIEW.md C2).
#
# `terraform init && terraform apply -var-file=secrets.tfvars`
# Secrets file is .gitignored.

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

# -------------------- inputs --------------------

variable "hcloud_token" {
  description = "Hetzner Cloud API token (Read & Write)"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "Raw SSH public key contents (the file's text, e.g. 'ssh-ed25519 AAAA... user@host')"
  type        = string
}

# -------------------- ssh key --------------------

resource "hcloud_ssh_key" "operator" {
  name       = "provenance-operator"
  public_key = var.ssh_public_key
}

# -------------------- compute --------------------

resource "hcloud_server" "rollup" {
  name        = "provenance-rollup-1"
  server_type = "cx22"           # 2 vCPU, 4 GiB RAM
  image       = "ubuntu-24.04"
  location    = "nbg1"
  ssh_keys    = [hcloud_ssh_key.operator.id]

  user_data = file("${path.module}/../cloud-init/bootstrap.yml")

  labels = {
    role    = "rollup"
    chain   = "provenance-1"
    project = "hack0016"
  }

  firewall_ids = [hcloud_firewall.rollup.id]
}

resource "hcloud_firewall" "rollup" {
  name = "provenance-rollup-fw"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "1317"   # Cosmos REST/RPC
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "26657"  # Tendermint RPC
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "26656"  # Tendermint p2p
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

# -------------------- outputs --------------------

output "rollup_ipv4" { value = hcloud_server.rollup.ipv4_address }
output "rollup_ipv6" { value = hcloud_server.rollup.ipv6_address }
output "ssh_command" { value = "ssh root@${hcloud_server.rollup.ipv4_address}" }
output "rpc_url_raw" { value = "http://${hcloud_server.rollup.ipv4_address}:1317" }
