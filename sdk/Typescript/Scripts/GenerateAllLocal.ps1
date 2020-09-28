function StopOnFailedExecution {
  if ($LastExitCode) 
  { 
    exit $LastExitCode 
  }
}

# Note: call from root of project
$connectorsToGenerate = Get-ChildItem "./sdk/swaggers/ms-services/released"
foreach($connectorEntry in $connectorsToGenerate)
{
    $packageName = [System.IO.Path]::GetFileNameWithoutExtension($connectorEntry)
    $fileExists = Test-Path "./ScriptGenerated/$packageName"
    if ($fileExists) {
        Write-Host "Skipping $packageName because it already exists..."
        continue
    }
    $AutorestCommand = ".\sdk\Typescript\Scripts\RunAutoRestTypescript.ps1 -connectorName '$packageName' -config '.\sdk\autorest\readme.md' -friendlyName '$packageName' -version '0.0.2-alpha' -orgName 'azure' -isLocal 1 -npmProjectSuffix '-connector'"
    Invoke-Expression $AutorestCommand
    StopOnFailedExecution
    $CompileCommand = ".\sdk\Typescript\Scripts\CompileTypescript.ps1 -connectorName $packageName -friendlyName '$packageName'"
    Invoke-Expression $CompileCommand
    StopOnFailedExecution
}
