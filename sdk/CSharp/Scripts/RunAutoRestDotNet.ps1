Param(
    [string] [Parameter(Mandatory=$true)] $connectorName,
    [string] [Parameter(Mandatory=$true)] $config,
    [string] [Parameter(Mandatory=$true)] [AllowEmptyString()] $friendlyName,
    [boolean] [Parameter(Mandatory=$false)] $isLocal = $false
)

npm install -g autorest
Write-Output "running autorest with name:$($connectorName) using config:$($config)"

Write-Output "checking if we need to run script to fix swagger for name:$($connectorName) using config:$($config)"
if(Test-Path ./sdk/scripts/SwaggerTransform/$($connectorName).ps1)
{
    Write-Output "$($connectorName).ps1 exists so we are running it"
    if ($isLocal) {
        ."./sdk/scripts/SwaggerTransform/$($connectorName).ps1" -inputfile "./sdk/swaggers/ms-services/released/$($connectorName).json"
    } else {
        ."./sdk/scripts/SwaggerTransform/$($connectorName).ps1" -inputfile "./RetrievedSwaggers/$($connectorName).json"
    }
}

$TextInfo = (Get-Culture).TextInfo
$capitalizedName = if (($friendlyName -eq $null) -or ($friendlyName -eq "")) { $TextInfo.ToTitleCase($connectorName) } else { $friendlyName }
if ($isLocal) {
    autorest ./$($config) --input-file:./sdk/swaggers/ms-services/released/$($connectorName).json --output-folder:./ScriptGenerated/$($connectorName) --override-client-name:$($capitalizedName)Connector --namespace:Azure.Connectors.$($capitalizedName) --csharp-only --$($connectorName)
} else {
    autorest ./$($config) --input-file:./RetrievedSwaggers/$($connectorName).json --output-folder:./ScriptGenerated/$($connectorName) --override-client-name:$($capitalizedName)Connector --namespace:Azure.Connectors.$($capitalizedName) --csharp-only --$($connectorName)
}
