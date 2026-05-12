# SSH Setup Guide for Multiple Git Accounts

## Current Situation

You have SSH config set up for:
- **LukeINK** (work GitHub): `github.com-lukeink`
- **LukeLit** (personal GitHub): `github.com-lukelit`  
- **Bitbucket**: `bitbucket.org`

**BUT** your current repo is using **HTTPS**, not SSH, so the SSH config isn't being used!

## The Problem

When you use HTTPS URLs like `https://github.com/LukeLit/fish-pwa.git`, Git doesn't use SSH at all. It uses HTTPS authentication (credentials stored in Windows Credential Manager).

## Solutions

### Option 1: Switch This Repo to SSH (Recommended)

Switch this repo to use SSH with your LukeLit account:

```powershell
cd d:\Prototyping\fish-pwa
git remote set-url origin git@github.com-lukelit:LukeLit/fish-pwa.git
```

Then test it:
```powershell
git fetch
```

### Option 2: Keep Using HTTPS (Current Setup)

If you want to keep using HTTPS, you need to manage credentials in Windows Credential Manager:

1. Open **Windows Credential Manager** (search for "Credential Manager" in Start menu)
2. Go to **Windows Credentials**
3. Look for `git:https://github.com` entries
4. Edit/remove them as needed to switch between accounts

### Option 3: Use Both (HTTPS + SSH)

You can use HTTPS for some repos and SSH for others. Just make sure:
- SSH repos use URLs like: `git@github.com-lukelit:USER/REPO.git`
- HTTPS repos use URLs like: `https://github.com/USER/REPO.git`

## SSH Key Setup Checklist

Make sure you have these SSH keys:

1. **LukeINK GitHub**: `C:\Users\lukel\.ssh\id_rsa_lukeink`
2. **LukeLit GitHub**: `C:\Users\lukel\.ssh\id_rsa_lukelit`
3. **Bitbucket**: `C:\Users\lukel\.ssh\id_rsa_bitbucket`

To check if keys exist:
```powershell
Get-ChildItem $env:USERPROFILE\.ssh\id_rsa*
```

## Testing SSH Connections

Test each account:

```powershell
# Test LukeLit GitHub
ssh -T git@github.com-lukelit

# Test LukeINK GitHub  
ssh -T git@github.com-lukeink

# Test Bitbucket
ssh -T git@bitbucket.org
```

You should see messages like:
- GitHub: "Hi LukeLit! You've successfully authenticated..."
- Bitbucket: "logged in as USERNAME"

## TortoiseGit Configuration

In TortoiseGit, when cloning/adding remotes:

**For LukeLit repos:**
- Use URL: `git@github.com-lukelit:LukeLit/REPO.git`

**For LukeINK repos:**
- Use URL: `git@github.com-lukeink:USERNAME/REPO.git`

**For Bitbucket repos:**
- Use URL: `git@bitbucket.org:USERNAME/REPO.git`

TortoiseGit should automatically use the SSH config based on the host alias.

## Quick Fix Script

Run the diagnostic script:
```powershell
cd d:\Prototyping\fish-pwa
.\fix-ssh-setup.ps1
```

This will show you:
- What SSH keys you have
- What your current remotes are using (HTTPS vs SSH)
- Recommendations for fixing issues

## Common Issues

### "Permission denied (publickey)"
- The SSH key doesn't exist
- The key isn't added to your GitHub/Bitbucket account
- Wrong key is being used (check SSH config)

### "Host key verification failed"
- Run: `ssh-keyscan github.com >> $env:USERPROFILE\.ssh\known_hosts`
- Or: `ssh-keyscan bitbucket.org >> $env:USERPROFILE\.ssh\known_hosts`

### SSH Agent Not Running
```powershell
Get-Service ssh-agent | Set-Service -StartupType Manual
Start-Service ssh-agent
```

## Next Steps

1. **Run the diagnostic**: `.\fix-ssh-setup.ps1`
2. **Check your SSH keys exist** (see checklist above)
3. **Decide**: Keep HTTPS or switch to SSH?
4. **If switching to SSH**: Use the `git remote set-url` command above
5. **Test**: Run `git fetch` to verify it works
