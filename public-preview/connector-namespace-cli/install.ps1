# Install (or uninstall) the `az connector-namespace` Azure CLI extension.
#
# Usage:
#   # Default: install the latest published wheel (https://aka.ms/connector-namespace.whl)
#   irm https://aka.ms/connector-namespace-cli-install-ps | iex
#
#   # Pin a different version:
#   & ([scriptblock]::Create((irm https://aka.ms/connector-namespace-cli-install-ps))) -Version 1.0.0b33
#
#   # Uninstall:
#   & ([scriptblock]::Create((irm https://aka.ms/connector-namespace-cli-install-ps))) -Uninstall

[CmdletBinding()]
param(
    [string]$Version,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$Repo    = 'Azure/Connectors'
$ExtName = 'connector-namespace'
$PkgName = 'connector_namespace'
$AkamsUrl = 'https://aka.ms/connector-namespace.whl'

# Check for Azure CLI
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw "Azure CLI ('az') not found. Install it first: https://learn.microsoft.com/cli/azure/install-azure-cli"
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

# Resolve wheel source.
# - If -Version (or $env:CONNECTOR_NAMESPACE_VERSION) is set, pin to that GitHub Release.
# - Otherwise, use the aka.ms link (latest published wheel).
if (-not $Version -and $env:CONNECTOR_NAMESPACE_VERSION) {
    $Version = $env:CONNECTOR_NAMESPACE_VERSION
    $pinSource = '$env:CONNECTOR_NAMESPACE_VERSION'
} elseif ($Version) {
    $pinSource = '-Version'
}

if ($Version) {
    $wheelUrl = "https://github.com/$Repo/releases/download/v$Version/${PkgName}-${Version}-py3-none-any.whl"
    Write-Host "Installing '$ExtName' v$Version (pinned via $pinSource)"
} else {
    $wheelUrl = $AkamsUrl
    Write-Host "Installing '$ExtName' (latest)"
}
Write-Host "  Wheel: $wheelUrl"
Write-Host ""

# Download the wheel to a temp dir, then install from the local file.
# (aka.ms is a redirect, so download first rather than pass the URL to az.)
# The file name must keep the real wheel name (e.g. connector_namespace-1.0.0b33-py3-none-any.whl)
# because 'az extension add' parses the extension name/version from it.
$tmpDir = Join-Path ([System.IO.Path]::GetTempPath()) ("connector-namespace-" + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmpDir | Out-Null
try {
    $downloadPath = Join-Path $tmpDir 'download.bin'
    $resp = Invoke-WebRequest -Uri $wheelUrl -OutFile $downloadPath -UseBasicParsing -PassThru

    # Prefer the server-provided file name (Content-Disposition); the resolved
    # redirect URL is an opaque blob id, so it can't be parsed for the name.
    $wheelName = $null
    $cd = $resp.Headers['Content-Disposition']
    if ($cd) {
        if ($cd -is [array]) { $cd = $cd[0] }
        if ($cd -match 'filename\*?=(?:UTF-8'''')?"?([^";]+)"?') { $wheelName = $matches[1].Trim() }
    }
    if (-not $wheelName) {
        if ($Version) { $wheelName = "${PkgName}-${Version}-py3-none-any.whl" } else { $wheelName = "${PkgName}.whl" }
    }

    $wheelFile = Join-Path $tmpDir $wheelName
    Move-Item -Path $downloadPath -Destination $wheelFile -Force

    # --upgrade so re-running this script updates an existing install.
    # --yes accepts the "extension is in preview" prompt automatically.
    az extension add --upgrade --yes --source $wheelFile
    if ($LASTEXITCODE -ne 0) { throw "az extension add failed (exit code $LASTEXITCODE)." }
} finally {
    Remove-Item -Path $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "✓ Installed. Try:" -ForegroundColor Green
Write-Host "    az connector-namespace --help"
