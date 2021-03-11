Param(
    [string] [Parameter(Mandatory=$true)] $connectorName,
    [string] [Parameter(Mandatory=$true)] [AllowEmptyString()] $friendlyName
)

$root = Get-Location
Set-Location ScriptGenerated/$($connectorName)/typescript

# Fix package.json
$packageJsonFile = "./package.json"
$packageJson = (Get-Content $packageJsonFile)
(Get-Content $packageJsonFile).Replace('https://github.com/Azure/azure-sdk-for-js', 'ssh://git@github.com/Azure/Connectors') | Out-File $packageJsonFile -Encoding "UTF8"
$version = ($packageJson | ConvertFrom-Json).version

# Fix README.md
$TextInfo = (Get-Culture).TextInfo
$capitalizedName = if (($friendlyName -eq $null) -or ($friendlyName -eq "")) { $TextInfo.ToTitleCase($connectorName) } else { $friendlyName }
$readmeFile = "./README.md"
Copy-Item $root/sdk/Typescript/readme.md -Destination $readmeFile -Force
(Get-Content $readmeFile).Replace('<connector-name>', $capitalizedName) | Out-File $readmeFile -Encoding "UTF8"
(Get-Content $readmeFile).Replace('<connector-name-lower>', $capitalizedName.ToLower()) | Out-File $readmeFile -Encoding "UTF8"
(Get-Content $readmeFile).Replace('<connector-config-name>', $connectorName) | Out-File $readmeFile -Encoding "UTF8"

# install and publish npm package
Write-Output "running npm install on $($connectorName)"
npm install 

Write-Output "running npm pack on $($connectorName)"
npm pack

$zipFilename = "azure-$($capitalizedName.ToLower())-connector-$($version).tgz"
Copy-Item "./$($zipFilename)" -Destination "$($root)/$($zipFilename)"

Set-Location $root
