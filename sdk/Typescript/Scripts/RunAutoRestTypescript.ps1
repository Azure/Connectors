Param(
    [string] [Parameter(Mandatory=$true)] $connectorName,
    [string] [Parameter(Mandatory=$true)] $config,
    [string] [Parameter(Mandatory=$true)] [AllowEmptyString()] $friendlyName,
    [string] [Parameter(Mandatory=$true)] $version,
    [string] [Parameter(Mandatory=$true)] $orgName,
    [string] [Parameter(Mandatory=$true)] $npmProjectSuffix,
    [boolean] [Parameter(Mandatory=$false)] $isLocal = $false
)

npm install -g autorest
Write-Output "running autorest with name:$($connectorName) using config:$($config)"
$TextInfo = (Get-Culture).TextInfo
$capitalizedName = if (($friendlyName -eq $null) -or ($friendlyName -eq "")) { $TextInfo.ToTitleCase($connectorName) } else { $friendlyName }
if ($isLocal) {
    autorest ./$($config) --input-file:./sdk/swaggers/ms-services/released/$($connectorName).json --output-folder:./ScriptGenerated/$($connectorName) --override-client-name:$($capitalizedName)Connector --package-name:@$($orgName)/$($capitalizedName.ToLower())$($npmProjectSuffix) --package-version:$($version) --namespace:Microsoft.Azure.Connectors.$($capitalizedName) --typescript-only 
} else {
    autorest ./$($config) --input-file:./RetrievedSwaggers/$($connectorName).json --output-folder:./ScriptGenerated/$($connectorName) --override-client-name:$($capitalizedName)Connector --package-name:@$($orgName)/$($capitalizedName.ToLower())$($npmProjectSuffix) --package-version:$($version) --namespace:Microsoft.Azure.Connectors.$($capitalizedName) --typescript-only 
}
