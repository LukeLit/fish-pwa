# GitHub CLI wrapper that clears proxy before running
# Usage: . .\gh-clear-proxy.ps1; gh-clear-proxy issue list --repo LukeLit/fish-pwa

function gh-clear-proxy {
    $env:HTTPS_PROXY = $null
    $env:HTTP_PROXY = $null
    $env:ALL_PROXY = $null
    gh @args
}

# Export the function
Export-ModuleMember -Function gh-clear-proxy
