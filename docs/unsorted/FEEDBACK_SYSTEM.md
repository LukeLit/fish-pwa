# Feedback System Implementation

## Overview

The feedback system allows users to submit feedback, suggestions, and bug reports directly from the game. Each submission automatically creates a GitHub issue with the "feedback" label.

## Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Configure the token:
   - **Token name**: `fish-pwa-feedback`
   - **Repository access**: Select "Only select repositories" and choose `LukeLit/fish-pwa`
   - **Permissions**: Under "Repository permissions", set:
     - Issues: **Read and write**
4. Click "Generate token"
5. Copy the token (starts with `github_pat_`)

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```env
GITHUB_TOKEN=github_pat_your_token_here
GITHUB_REPO=LukeLit/fish-pwa
```

Replace `github_pat_your_token_here` with the token you generated.

### 3. Deploy to Vercel

If deploying to Vercel, add the environment variables in the Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `GITHUB_TOKEN`: Your GitHub personal access token
   - `GITHUB_REPO`: `LukeLit/fish-pwa`

## How It Works

### User Flow

1. User clicks the "Feedback" button (available in 4 locations)
2. Feedback modal opens with a text field
3. User types their feedback (up to 2000 characters)
4. User clicks "Submit"
5. API creates a GitHub issue with:
   - Title: `User Feedback: [first 50 chars]...`
   - Body: User's feedback text + timestamp
   - Label: `feedback`
6. Success message displays for 2 seconds
7. Modal closes automatically

### Feedback Button Locations

1. **Main Menu (MetaHub)**: Bottom of the page, below "How to Play"
2. **Settings Drawer**: In the navigation section
3. **Death Screen**: Below the "Return to Main Menu" button
4. **Digestion Screen**: At the bottom of the screen

## Components

### FeedbackModal (`components/FeedbackModal.tsx`)

Props:
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal closes

Features:
- Character counter (0-2000)
- Input validation
- Loading state during submission
- Success/error states
- Auto-close on success

### FeedbackButton (`components/FeedbackButton.tsx`)

Props:
- `className?: string` - Optional custom classes
- `variant?: 'icon' | 'text' | 'full'` - Button style variant

Variants:
- **icon**: Small blue button with loudspeaker icon + "Feedback" text (default)
- **text**: Simple underlined text link
- **full**: Full-width button for drawer menus

## API Endpoint

### POST `/api/submit-feedback`

Request body:
```json
{
  "feedback": "User's feedback text"
}
```

Response (success):
```json
{
  "success": true,
  "issueNumber": 123,
  "issueUrl": "https://github.com/LukeLit/fish-pwa/issues/123"
}
```

Response (error):
```json
{
  "error": "Error message"
}
```

Status codes:
- `200`: Success
- `400`: Invalid input (empty, too long)
- `500`: Server error (GitHub API failure, missing token)

## GitHub Issue Format

**Title:**
```
User Feedback: [first 50 characters of feedback]...
```

**Body:**
```markdown
## User Feedback

[Full feedback text]

---
*Submitted via in-game feedback form*
*Timestamp: 2026-01-30T03:30:00.000Z*
```

**Labels:**
- `feedback`

## Security Considerations

1. **No Personal Information**: The form doesn't collect names, emails, or any personal data
2. **Rate Limiting**: GitHub API has rate limits (5000 requests/hour for authenticated requests)
3. **Input Validation**: 
   - Maximum 2000 characters
   - Required field validation
   - XSS prevention via React's built-in escaping
4. **Token Security**: 
   - Token is stored in environment variables (not in code)
   - Fine-grained token with minimal permissions (only issues:write)
   - Token never exposed to client

## Troubleshooting

### "Feedback service is not configured" error

**Cause**: `GITHUB_TOKEN` environment variable is not set

**Solution**: Add `GITHUB_TOKEN` to `.env.local` (see Setup Instructions)

### "Failed to create feedback issue" error

**Possible causes**:
1. Invalid GitHub token
2. Token lacks `issues:write` permission
3. Wrong repository name in `GITHUB_REPO`
4. Network connectivity issues

**Solutions**:
1. Verify token is correct and not expired
2. Create a new token with proper permissions
3. Verify `GITHUB_REPO` is set to `LukeLit/fish-pwa`
4. Check server logs for detailed error messages

### Feedback label doesn't exist

GitHub will automatically create the `feedback` label on the first submission. If you want to customize it:

1. Go to https://github.com/LukeLit/fish-pwa/labels
2. Create a label named `feedback`
3. Choose a color (suggested: blue `#0969DA`)

## Future Enhancements

Potential improvements:
- Add screenshot attachment capability
- Include game state/version information
- Allow users to track their submitted feedback
- Add categories/tags for different types of feedback
- Implement client-side rate limiting
- Add feedback analytics dashboard
