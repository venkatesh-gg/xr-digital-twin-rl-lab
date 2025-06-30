variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "The GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "general_node_count" {
  description = "Number of general nodes in the GKE cluster"
  type        = number
  default     = 3
}

variable "gpu_node_count" {
  description = "Number of GPU nodes in the GKE cluster"
  type        = number
  default     = 2
}

variable "db_password" {
  description = "Password for the Cloud SQL database"
  type        = string
  sensitive   = true
}