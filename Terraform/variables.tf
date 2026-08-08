variable "subscription_id" {
  type      = string
  sensitive = true
}

variable "resource_group_name" {
  type    = string
  default = "na-terraform-rg"
}

variable "location" {
  type    = string
  default = "Central India"
}

variable "storage_account_name" {
  type    = string
  default = "naterraformstorage01"
}

variable "container_name" {
  type    = string
  default = "nacontainer"
}