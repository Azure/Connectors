### Generate C# Example
Generate
```
.\sdk\CSharp\Scripts\RunAutoRestDotNet.ps1  -connectorName "azureblob" -config '.\sdk\autorest\readme.md' -friendlyName "AzureBlobStorage" -isLocal $True
```
Compile
```
.\sdk\CSharp\Scripts\CompileDotNet.ps1 -connectorName azureblob -friendlyName "AzureBlobStorage" -version 0.0.1-alpha -nugetProjectPrefix "Microsoft.Azure.Connectors.AzureBlobStorage"
```

### Generate TypeScript Example
Generate
```
.\sdk\Typescript\Scripts\RunAutoRestTypescript.ps1 -connectorName "onedriveforbusiness" -config '.\sdk\autorest\readme.md' -friendlyName "OneDriveForBusiness" -version 0.0.4-alpha -orgName "azure" -npmProjectSuffix "-connector" -isLocal $True
```
Compile
```
.\sdk\Typescript\Scripts\CompileTypescript.ps1 -connectorName onedriveforbusiness -friendlyName "OneDriveForBusiness" 
```
