# Fix Proxy Issue for GitHub CLI

## The Problem
GitHub CLI is being blocked by a proxy setting at `127.0.0.1:9`. This prevents API calls from working.

## How to Find and Fix Proxy Settings

### Method 1: Check Windows Environment Variables

**Via GUI:**
1. Press `Win + R` to open Run dialog
2. Type `sysdm.cpl` and press Enter
3. Click the "Advanced" tab
4. Click "Environment Variables" button at the bottom
5. Look in both "User variables" and "System variables" for:
   - `HTTPS_PROXY`
   - `HTTP_PROXY`
   - `ALL_PROXY`
6. If you find any pointing to `127.0.0.1:9`, delete them

**Via PowerShell (Run as Admin):**
```powershell
# Check user environment variables
Get-ItemProperty -Path "HKCU:\Environment" | Select-Object HTTPS_PROXY, HTTP_PROXY, ALL_PROXY

# Check system environment variables
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" | Select-Object HTTPS_PROXY, HTTP_PROXY, ALL_PROXY
```

### Method 2: Check Windows HTTP Proxy Settings

Run in PowerShell:
```powershell
netsh winhttp show proxy
```

If it shows a proxy, reset it:
```powershell
netsh winhttp reset proxy
```

### Method 3: Check Git Config

Sometimes Git config has proxy settings:
```powershell
git config --global --get http.proxy
git config --global --get https.proxy
```

To remove:
```powershell
git config --global --unset http.proxy
git config --global --unset https.proxy
```

### Method 4: Check GitHub CLI Config

```powershell
gh config list
```

Look for any proxy-related settings.

### Method 5: Check if VPN/Corporate Software is Setting It

- Check if you have a VPN running
- Check corporate security software
- Check if any development tools set proxies automatically

## Quick Test After Fixing

After clearing proxy settings, restart your terminal and test:
```powershell
cd d:\Prototyping\fish-pwa
gh issue list --repo LukeLit/fish-pwa --limit 1
```

## Alternative: Work Around Proxy

If you can't remove the proxy, you can:
1. Use GitHub web interface to create issues
2. I can generate issue markdown files you can copy-paste
3. Use `gh` commands with `--repo` flag (might still work despite proxy)
