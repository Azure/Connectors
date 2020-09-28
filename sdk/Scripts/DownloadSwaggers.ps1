Param(
	[string] [Parameter(Mandatory=$true)] $subscriptionId = "a39747ec-b5c4-45de-82a1-935083247170",
	[string] [Parameter(Mandatory=$true)] $location = "westcentralus",
	[string] [Parameter(Mandatory=$true)] $connectorName
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 3
$DebugPreference="Continue"

if(-not (Test-Path .\RetrievedSwaggers -PathType Container))
{
	New-Item -Path "." -Name "RetrievedSwaggers" -ItemType "directory"
}
$ApiJson = az rest --method get -u "https://management.azure.com/subscriptions/$($subscriptionId)/providers/Microsoft.Web/locations/$($location)/managedApis/$($connectorName)?api-version=2018-07-01-preview&export=true"
Write-Output "writing to $($connectorName)"
$ApiJson | Out-File -Encoding "UTF8" -FilePath ".\RetrievedSwaggers\$($connectorName).json"