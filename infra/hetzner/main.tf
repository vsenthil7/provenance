# Provenance rollup — Hetzner Cloud (CX22, nbg1)
#
# `terraform init && terraform apply -var-file=secrets.tfvars` to provision.
# Secrets file is .gitignored; see secrets.tfvars.example.

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.40"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

provider "cloudflare" {
  api_token = var.cloudflare_token
}

# -------------------- inputs --------------------

variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_token" {
  description = "Cloudflare API token (Zone.DNS edit)"
  type        = string
  sensitive   = true
}

variable "cloudflare_zone_id" {
  description = "Zone ID for initia.xyz (or whatever the apex is)"
  type        = string
}

variable "rpc_hostname" {
  default = "rpc.provenance-1.initia.xyz"
}

variable "ssh_keys" {
  description = "Hetzner SSH key names already uploaded to the project"
  type        = list(string)
}

variable "weave_init_payload" {
  description = "Pre-rendered weave init payload (gas station seed key, executor key)"
  type        = string
  sensitive   = true
}

variable "better_stack_token" {
  description = "Better Stack ingest token for log/metrics shipping"
  type        = string
  sensitive   = true
}

variable "discord_webhook_url" {
  description = "Discord webhook for alert delivery"
  type        = string
  sensitive   = true
}

# -------------------- compute --------------------

resource "hcloud_server" "rollup" {
  name        = "provenance-rollup-1"
  server_type = "cx22"           # 2 vCPU, 4 GiB RAM, plenty for hackathon
  image       = "ubuntu-24.04"
  location    = "nbg1"
  ssh_keys    = var.ssh_keys
  user_data = templatefile("${path.module}/../cloud-init/bootstrap.yml", {
    weave_init_payload  = var.weave_init_payload
    better_stack_token  = var.better_stack_token
    discord_webhook_url = var.discord_webhook_url
    rpc_hostname        = var.rpc_hostname
  })

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
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    source_ips = ["0.0.0.0/0", "::/0"]   # restrict to office IPs in production
  }
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "26656"  # tendermint p2p
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

# -------------------- DNS --------------------

resource "cloudflare_record" "rpc" {
  zone_id = var.cloudflare_zone_id
  name    = var.rpc_hostname
  type    = "A"
  content = hcloud_server.rollup.ipv4_address
  ttl     = 60
  proxied = false   # Caddy handles TLS; CF would terminate too high in the stack
}

# -------------------- outputs --------------------

output "rollup_ipv4" { value = hcloud_server.rollup.ipv4_address }
output "rollup_ipv6" { value = hcloud_server.rollup.ipv6_address }
output "rpc_url"     { value = "https://${var.rpc_hostname}" }
