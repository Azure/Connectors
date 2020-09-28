Param(
    [string] [Parameter(Mandatory=$true)] $connectorName,
    [string] [Parameter(Mandatory=$true)] [AllowEmptyString()] $friendlyName,
    [string] [Parameter(Mandatory=$true)] $version,
    [string] [Parameter(Mandatory=$true)] $nugetProjectPrefix
)

$TextInfo = (Get-Culture).TextInfo
$capitalizedName = if (($friendlyName -eq $null) -or ($friendlyName -eq "")) { $TextInfo.ToTitleCase($connectorName) } else { $friendlyName }

# copy over csharp csproject template to each folder
Copy-Item -Path "./sdk/CSharp/csharp-template.csproj" -Destination "./ScriptGenerated/$($connectorName)/csharp/$($nugetProjectPrefix).$($capitalizedName).csproj"
Copy-Item -Path "./sdk/CSharp/35MSSharedLib1024.snk" -Destination "./ScriptGenerated/$($connectorName)/csharp/35MSSharedLib1024.snk"

Write-Output "build dotnet connector with name:$($connectorName)"
dotnet build --configuration Release ScriptGenerated/$($connectorName)/csharp
Write-Output "pack dotnet connector with name:$($connectorName)"
dotnet pack --configuration Release ScriptGenerated/$($connectorName)/csharp -p:PackageVersion=$($version) -p:IncludeSymbols=true -p:SymbolPackageFormat=snupkg