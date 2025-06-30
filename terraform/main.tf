terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "kubernetes" {
  host                   = "https://${google_container_cluster.factory_cluster.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.factory_cluster.master_auth.0.cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = "https://${google_container_cluster.factory_cluster.endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(google_container_cluster.factory_cluster.master_auth.0.cluster_ca_certificate)
  }
}

data "google_client_config" "default" {}

# VPC Network
resource "google_compute_network" "factory_vpc" {
  name                    = "factory-digital-twin-vpc"
  auto_create_subnetworks = false
  description             = "VPC for Factory Digital Twin infrastructure"
}

# Subnet
resource "google_compute_subnetwork" "factory_subnet" {
  name          = "factory-subnet"
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.factory_vpc.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/16"
  }
}

# GKE Cluster
resource "google_container_cluster" "factory_cluster" {
  name     = "factory-digital-twin-cluster"
  location = var.region

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.factory_vpc.name
  subnetwork = google_compute_subnetwork.factory_subnet.name

  # Enable IP aliasing
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Enable workload identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Enable network policy
  network_policy {
    enabled = true
  }

  # Enable vertical pod autoscaling
  vertical_pod_autoscaling {
    enabled = true
  }

  # Master auth
  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  # Addons
  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    network_policy_config {
      disabled = false
    }
  }

  depends_on = [
    google_project_service.container,
    google_project_service.compute,
  ]
}

# Node Pool for General Workloads
resource "google_container_node_pool" "general_nodes" {
  name       = "general-node-pool"
  location   = var.region
  cluster    = google_container_cluster.factory_cluster.name
  node_count = var.general_node_count

  node_config {
    preemptible  = false
    machine_type = "e2-standard-4"

    # Google recommends custom service accounts that have cloud-platform scope and permissions granted via IAM Roles.
    service_account = google_service_account.default.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      role = "general"
    }

    tags = ["factory-cluster", "general-nodes"]

    disk_size_gb = 50
    disk_type    = "pd-ssd"

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  autoscaling {
    min_node_count = 1
    max_node_count = 10
  }
}

# Node Pool for GPU Workloads (Unity Simulation)
resource "google_container_node_pool" "gpu_nodes" {
  name       = "gpu-node-pool"
  location   = var.region
  cluster    = google_container_cluster.factory_cluster.name
  node_count = var.gpu_node_count

  node_config {
    preemptible  = true  # Use preemptible for cost savings
    machine_type = "n1-standard-4"

    guest_accelerator {
      type  = "nvidia-tesla-k80"
      count = 1
    }

    service_account = google_service_account.default.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      role = "gpu"
    }

    tags = ["factory-cluster", "gpu-nodes"]

    disk_size_gb = 100
    disk_type    = "pd-ssd"

    metadata = {
      disable-legacy-endpoints = "true"
    }

    taint {
      key    = "nvidia.com/gpu"
      value  = "present"
      effect = "NO_SCHEDULE"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  autoscaling {
    min_node_count = 0
    max_node_count = 5
  }
}

# Service Account
resource "google_service_account" "default" {
  account_id   = "factory-cluster-sa"
  display_name = "Factory Cluster Service Account"
}

# IAM bindings for the service account
resource "google_project_iam_member" "default" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/storage.objectViewer"
  ])
  
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.default.email}"
}

# Enable required APIs
resource "google_project_service" "container" {
  service = "container.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "compute" {
  service = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "storage" {
  service = "storage.googleapis.com"
  disable_on_destroy = false
}

# Cloud Storage bucket for artifacts
resource "google_storage_bucket" "factory_artifacts" {
  name     = "${var.project_id}-factory-artifacts"
  location = var.region

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
}

# Cloud SQL instance for metadata
resource "google_sql_database_instance" "factory_metadata" {
  name             = "factory-metadata-db"
  database_version = "POSTGRES_14"
  region           = var.region

  settings {
    tier = "db-f1-micro"
    
    disk_autoresize = true
    disk_size      = 20
    disk_type      = "PD_SSD"

    backup_configuration {
      enabled = true
      start_time = "03:00"
    }

    ip_configuration {
      ipv4_enabled = true
      authorized_networks {
        name  = "all"
        value = "0.0.0.0/0"
      }
    }
  }

  deletion_protection = false
}

resource "google_sql_database" "factory_db" {
  name     = "factory_metadata"
  instance = google_sql_database_instance.factory_metadata.name
}

resource "google_sql_user" "factory_user" {
  name     = "factory_user"
  instance = google_sql_database_instance.factory_metadata.name
  password = var.db_password
}

# Firewall rules
resource "google_compute_firewall" "factory_internal" {
  name    = "factory-internal"
  network = google_compute_network.factory_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = ["10.0.0.0/16", "10.1.0.0/16", "10.2.0.0/16"]
  target_tags   = ["factory-cluster"]
}

resource "google_compute_firewall" "factory_external" {
  name    = "factory-external"
  network = google_compute_network.factory_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8000", "8080", "9000"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["factory-cluster"]
}

# Output values
output "cluster_endpoint" {
  value = google_container_cluster.factory_cluster.endpoint
}

output "cluster_name" {
  value = google_container_cluster.factory_cluster.name
}

output "cluster_location" {
  value = google_container_cluster.factory_cluster.location
}

output "storage_bucket" {
  value = google_storage_bucket.factory_artifacts.name
}

output "database_host" {
  value = google_sql_database_instance.factory_metadata.public_ip_address
}