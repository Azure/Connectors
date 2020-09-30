Param(
    [string] [Parameter(Mandatory=$true)] $connectorName,
    [string] [Parameter(Mandatory=$true)] [AllowEmptyString()] $friendlyName
)

# Install azure identity npm
Write-Output "importing azure identity"
$IdentityCommand = "npm i @azure/identity --prefix ./ScriptGenerated/$($connectorName)/typescript --save-bundle"
Invoke-Expression $IdentityCommand
# Install ms-rest-js library as bundledDependencies
Write-Output "saving azure ms-rest-js as bundle"
$BundleMsRestCommand = "npm i @azure/ms-rest-js --prefix ./ScriptGenerated/$($connectorName)/typescript --save-bundle"
Invoke-Expression $BundleMsRestCommand
# Install ms-rest-azure-js library as bundledDependencies
Write-Output "saving azure ms-rest-azure-js as bundle"
$BundleAzureMsRestCommand = "npm i @azure/ms-rest-azure-js --prefix ./ScriptGenerated/$($connectorName)/typescript --save-bundle"
Invoke-Expression $BundleAzureMsRestCommand

# Install 
$rollupConfigFile = "./ScriptGenerated/$($connectorName)/typescript/rollup.config.js"
(Get-Content $rollupConfigFile ).Replace('"@azure/ms-rest-js",','"@azure/ms-rest-js", "@azure/identity",') | Out-File $rollupConfigFile

# Fix package.json
$packageJsonFile = "./ScriptGenerated/$($connectorName)/typescript/package.json"
(Get-Content $packageJsonFile).Replace('https://github.com/Azure/azure-sdk-for-js','ssh://git@github.com/Azure/Connectors') | Out-File $packageJsonFile
# Fix README.md
$TextInfo = (Get-Culture).TextInfo
$capitalizedName = if (($friendlyName -eq $null) -or ($friendlyName -eq "")) { $TextInfo.ToTitleCase($connectorName) } else { $friendlyName }
$readmeFile = "./ScriptGenerated/$($connectorName)/typescript/README.md"
Copy-Item ./sdk/Typescript/readme.md -Destination $readmeFile -Force
(Get-Content $readmeFile).Replace('<connector-name>', $capitalizedName) | Out-File $readmeFile
(Get-Content $readmeFile).Replace('<connector-name-lower>', $capitalizedName.ToLower()) | Out-File $readmeFile
(Get-Content $readmeFile).Replace('<connector-config-name>', $connectorName) | Out-File $readmeFile

# install and publish npm package
Write-Output "running npm install on $($connectorName)"
npm install ScriptGenerated/$($connectorName)/typescript

#Write-Output "running npm pack on $($connectorName)"
npm pack ScriptGenerated/$($connectorName)/typescript