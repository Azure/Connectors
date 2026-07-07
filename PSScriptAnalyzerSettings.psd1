@{
    # This repo ships a single interactive installer script (install.ps1)
    # invoked via `irm ... | iex`. Console-only output via Write-Host is
    # intentional there (output is not meant to be captured or piped), so
    # that specific rule is excluded repo-wide rather than suppressed
    # per-line.
    ExcludeRules = @(
        "PSAvoidUsingWriteHost"
    )
}