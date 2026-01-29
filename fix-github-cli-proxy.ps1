# Fix GitHub CLI Proxy Issue
# The proxy at 127.0.0.1:9 is blocking GitHub CLI API calls

Write-Host "=== Fixing GitHub CLI Proxy Issue ===" -ForegroundColor Cyan

Write-Host "`nCurrent proxy settings:" -ForegroundColor Yellow
Write-Host "HTTPS_PROXY: $env:HTTPS_PROXY"
Write-Host "HTTP_PROXY: $env:HTTP_PROXY"
Write-Host "ALL_PROXY: $env:ALL_PROXY"

Write-Host "`nClearing proxy settings..." -ForegroundColor Yellow
$env:HTTPS_PROXY = ""
$env:HTTP_PROXY = ""
$env:ALL_PROXY = ""

# Also clear from user environment permanently
[System.Environment]::SetEnvironmentVariable('HTTPS_PROXY', '', 'User')
[System.Environment]::SetEnvironmentVariable('HTTP_PROXY', '', 'User')
[System.Environment]::SetEnvironmentVariable('ALL_PROXY', '', 'User')

Write-Host "Proxy settings cleared!" -ForegroundColor Green

Write-Host "`nTesting GitHub CLI..." -ForegroundColor Yellow
$test = gh issue list --repo LukeLit/fish-pwa --limit 1 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS! GitHub CLI is working." -ForegroundColor Green
}
else {
    Write-Host "Still having issues. You may need to:" -ForegroundColor Yellow
    Write-Host "1. Restart your terminal/PowerShell" -ForegroundColor White
    Write-Host "2. Check if there's a system-wide proxy setting" -ForegroundColor White
    Write-Host "3. Check GitHub CLI config: gh config list" -ForegroundColor White
}
