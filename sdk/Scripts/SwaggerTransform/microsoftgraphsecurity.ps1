Param(
    [string] [Parameter(Mandatory=$true)] $inputfile
)

((Get-Content -path $inputfile -Raw) -replace ' "Word Document" or "Binary".',' `\"Word Document`\" or `\"Binary`\".') | Set-Content -Path $inputfile