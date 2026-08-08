terraform {
  backend "azurerm" {
    resource_group_name  = "Lunatik-RG"
    storage_account_name = "qwertystoracc"
    container_name       = "alpha-cont"
    key                  = "naukri-automator.tfstate"
  }
}
