# Feedback System Implementation

## Overview

The feedback system allows users to submit feedback, suggestions, and bug reports directly from the game. Feedback is stored in Vercel Blob Storage, and optionally creates GitHub issues if configured.

## Setup Instructions

### Required: Vercel Blob Storage

Feedback is stored in Vercel Blob Storage. Ensure you have:

1. `BLOB_READ_WRITE_TOKEN` environment variable configured
2. This is the same token used for game data storage

### Optional: GitHub Integration

To also create GitHub issues from feedback submissions:

#### 1. Create a GitHub Personal Access Token

1. Go to https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Configure the token:
   - **Token name**: `fish-pwa-feedback`
   - **Repository access**: Select "Only select repositories" and choose `LukeLit/fish-pwa`
   - **Permissions**: Under "Repository permissions", set:
     - Issues: **Read and write**
4. Click "Generate token"
5. Copy the token (starts with `github_pat_`)

#### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Required for feedback storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_token_here

# Optional for GitHub integration
GITHUB_TOKEN=github_pat_your_token_here
GITHUB_REPO=LukeLit/fish-pwa
```

Replace `github_pat_your_token_here` with the token you generated.

#### 3. Deploy to Vercel

If deploying to Vercel, add the environment variables in the Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add (if not already present):
   - `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob Storage token
   - `GITHUB_TOKEN`: Your GitHub personal access token (optional)
   - `GITHUB_REPO`: `LukeLit/fish-pwa` (optional)

## How It Works

### User Flow

1. User clicks the "Feedback" button (available in 4 locations)
2. Feedback modal opens with a text field
3. User types their feedback (up to 2000 characters)
4. User clicks "Submit"
5. API stores feedback in Vercel Blob Storage with:
   - Unique feedback ID
   - Feedback text
   - Timestamp
   - User agent
6. If `GITHUB_TOKEN` is configured, API also attempts to create a GitHub issue with:
   - Title: `User Feedback: [first 50 chars]...`
   - Body: User's feedback text + timestamp + feedback ID
   - Label: `feedback`
7. Success message displays for 2 seconds
8. Modal closes automatically

**Note**: Feedback submission succeeds as long as Vercel Blob Storage is available. GitHub issue creation is optional and non-blocking.

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
  "feedbackId": "feedback-1234567890-abc123",
  "issueCreated": true,
  "issueNumber": 123,
  "issueUrl": "https://github.com/LukeLit/fish-pwa/issues/123"
}
```

**Note**: `issueCreated`, `issueNumber`, and `issueUrl` are only included if GitHub integration is configured and the issue was successfully created.
```

Response (error):
```json
{
  "error": "Error message"
}
```

Status codes:
- `200`: Success (feedback stored in blob storage)
- `400`: Invalid input (empty, too long)
- `500`: Server error (blob storage failure)

## Storage Format

Feedback is stored in Vercel Blob Storage at `feedback/{feedbackId}.json`:

```json
{
  "id": "feedback-1234567890-abc123",
  "feedback": "User's feedback text",
  "timestamp": "2026-01-30T03:30:00.000Z",
  "userAgent": "Mozilla/5.0..."
}
```

## GitHub Issue Format (Optional)

If GitHub integration is configured:

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
*Feedback ID: feedback-1234567890-abc123*
```

**Labels:**
- `feedback`

## Security Considerations

1. **No Personal Information**: The form doesn't collect names, emails, or any personal data (only anonymous user agent)
2. **Rate Limiting**: Consider implementing client-side rate limiting to prevent spam
3. **Input Validation**: 
   - Maximum 2000 characters
   - Required field validation
   - XSS prevention via React's built-in escaping
4. **Token Security**: 
   - Tokens are stored in environment variables (not in code)
   - Fine-grained GitHub token with minimal permissions (only issues:write)
   - Tokens never exposed to client
5. **Blob Storage Access**: Feedback is stored with public read access for transparency

## Troubleshooting

### "Failed to save feedback" error

**Cause**: `BLOB_READ_WRITE_TOKEN` environment variable is not configured or invalid

**Solution**: 
1. Verify `BLOB_READ_WRITE_TOKEN` is set in `.env.local` or Vercel dashboard
2. Ensure the token has read/write permissions
3. Check Vercel Blob Storage quota hasn't been exceeded

### GitHub issue not created (but feedback submitted successfully)

**This is expected behavior when**:
1. `GITHUB_TOKEN` is not configured (optional feature)
2. GitHub token lacks `issues:write` permission
3. Network issues connecting to GitHub API
4. GitHub API rate limits reached

**Solution**: 
- Feedback is still saved in blob storage and can be reviewed there
- To enable GitHub integration, configure `GITHUB_TOKEN` with proper permissions
- Review server logs for detailed error messages

### Feedback label doesn't exist

GitHub will automatically create the `feedback` label on the first submission. If you want to customize it:

1. Go to https://github.com/LukeLit/fish-pwa/labels
2. Create a label named `feedback`
3. Choose a color (suggested: blue `#0969DA`)

## Accessing Stored Feedback

Feedback is stored in Vercel Blob Storage. To access it:

1. Go to Vercel dashboard → Your project → Storage → Blob
2. Browse to the `feedback/` directory
3. Each feedback submission is a JSON file with a unique ID

Alternatively, use the Vercel Blob API or CLI to list and download feedback files.

## Future Enhancements

Potential improvements:
- Add screenshot attachment capability
- Include game state/version information
- Allow users to track their submitted feedback
- Add categories/tags for different types of feedback
- Implement client-side rate limiting
- Add feedback analytics dashboard
- Create admin dashboard to view feedback from blob storage
