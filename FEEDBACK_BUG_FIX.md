# Feedback Menu Bug Fix

## Issue Summary

**Error**: "Feedback service is not configured. Please contact the administrator."

**Location**: FeedbackModal component when submitting feedback

**Root Cause**: The `GITHUB_TOKEN` environment variable is not set in the production Vercel deployment.

## Diagnosis

The error occurs in `/app/api/submit-feedback/route.ts` at line 31-36:

```typescript
const githubToken = process.env.GITHUB_TOKEN;

if (!githubToken) {
  console.error('GITHUB_TOKEN is not configured');
  return NextResponse.json(
    { error: 'Feedback service is not configured. Please contact the administrator.' },
    { status: 500 }
  );
}
```

The code is working correctly - it's an environment configuration issue.

## Solution

### For Vercel Deployment

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select the `fish-pwa` project
3. Go to **Settings** → **Environment Variables**
4. Check if `GITHUB_TOKEN` exists:
   - If it doesn't exist, add it (see "Creating a GitHub Token" below)
   - If it exists but the feedback is still broken, the token may have expired or been revoked

### Creating a GitHub Token

1. Go to https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Configure:
   - **Name**: `fish-pwa-feedback`
   - **Repository access**: "Only select repositories" → `LukeLit/fish-pwa`
   - **Permissions** → Repository permissions → Issues: **Read and write**
4. Click "Generate token"
5. Copy the token (starts with `github_pat_`)
6. Add to Vercel:
   - Name: `GITHUB_TOKEN`
   - Value: `github_pat_...` (your token)
   - **Important**: Check all environments (Production, Preview, Development)
7. Optionally add `GITHUB_REPO`:
   - Name: `GITHUB_REPO`
   - Value: `LukeLit/fish-pwa`
   - Environment: All

### After Adding Environment Variables

1. Redeploy the application (or it will redeploy automatically)
2. Test the feedback button in production
3. Verify that a GitHub issue is created when feedback is submitted

## Verification

After fixing the environment variables:

1. Open the deployed application
2. Click any "Feedback" button (available in MetaHub, Settings, Death Screen, or Digestion Screen)
3. Type some test feedback
4. Click "Submit"
5. Should see "Thank you! Your feedback has been submitted."
6. Check https://github.com/LukeLit/fish-pwa/issues for the new issue with "feedback" label

## Why This Broke

Possible reasons:
1. **Token expired**: GitHub tokens can expire based on their expiration settings
2. **Token revoked**: Someone manually revoked the token
3. **Environment variable deleted**: The variable was removed from Vercel settings
4. **Vercel project recreated**: If the project was recreated, environment variables need to be re-added
5. **Token permissions changed**: The token's repository access or permissions were modified

## Prevention

To prevent this in the future:

1. **Set token expiration to "No expiration"** (or at least 1 year)
2. **Document the token**: Keep a record that this token exists and what it's used for
3. **Monitor feedback**: Regularly test the feedback system to catch issues early
4. **Add monitoring**: Consider adding error tracking (e.g., Sentry) to catch these issues automatically

## Code is Correct

The code properly:
- ✅ Validates the presence of `GITHUB_TOKEN`
- ✅ Returns a user-friendly error message
- ✅ Logs the error for debugging
- ✅ Follows security best practices (token in env vars, not code)
- ✅ Has proper error handling

**No code changes are needed** - this is purely an environment configuration issue.

## Additional Resources

- [Feedback System Documentation](./FEEDBACK_SYSTEM.md)
- [Vercel Environment Variables Docs](https://vercel.com/docs/projects/environment-variables)
- [GitHub Fine-grained Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token)
