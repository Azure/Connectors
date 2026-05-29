# Install (or uninstall) the `az connector-namespace` Azure CLI extension.
#
# Usage:
#   irm https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.ps1 | iex
#
#   # Pin a specific version:
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.ps1))) -Version 1.0.0b9
#
#   # Uninstall:
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/Azure/Connectors/main/docs/early/cli/install.ps1))) -Uninstall

[CmdletBinding()]
param(
    [string]$Version,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$Repo      = 'Azure/Connectors'
$ExtName   = 'connector-namespace'
$PkgName   = 'connector_namespace'
$LatestUrl = "https://raw.githubusercontent.com/$Repo/main/docs/early/cli/latest-version.txt"

# Check for Azure CLI
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI ('az') not found. Install it first: https://learn.microsoft.com/cli/azure/install-azure-cli"
    exit 1
}

if ($Uninstall) {
    $installed = (az extension show --name $ExtName --query name -o tsv 2>$null)
    if ($installed) {
        az extension remove --name $ExtName
        Write-Host "Uninstalled '$ExtName'."
    } else {
        Write-Host "'$ExtName' is not installed; nothing to do."
    }
    return
}

# Resolve version: parameter > env var > latest-version.txt
if (-not $Version) {
    if ($env:CONNECTOR_NAMESPACE_VERSION) {
        $Version = $env:CONNECTOR_NAMESPACE_VERSION
        Write-Host "Using pinned version: $Version (from `$env:CONNECTOR_NAMESPACE_VERSION)"
    } else {
        try {
            $Version = (Invoke-RestMethod -Uri $LatestUrl -UseBasicParsing).Trim()
        } catch {
            Write-Error "Could not resolve latest version from $LatestUrl : $_"
            exit 1
        }
        Write-Host "Resolved latest version: $Version"
    }
} else {
    Write-Host "Using pinned version: $Version (from -Version)"
}

$wheel    = "${PkgName}-${Version}-py3-none-any.whl"
$wheelUrl = "https://github.com/$Repo/releases/download/v$Version/$wheel"

Write-Host "Installing '$ExtName' v$Version ..."
Write-Host "  Wheel: $wheelUrl"
Write-Host ""

# --upgrade so re-running this script updates an existing install.
# --yes accepts the "extension is in preview" prompt automatically.
az extension add --upgrade --yes --source $wheelUrl

Write-Host ""
Write-Host "✓ Installed. Try:" -ForegroundColor Green
Write-Host "    az connector-namespace --help"
