Param(
    [string] [Parameter(Mandatory=$true)] $inputfile
)

((Get-Content -path $inputfile -Raw) -replace ' "\?newer_than=3516\?',' ?newer_than=3516') | Set-Content -Path $inputfile
((Get-Content -path $inputfile -Raw) -replace ' "\?older_than=2912\?',' ?older_than=2912') | Set-Content -Path $inputfile