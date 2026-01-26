# Video Generation with Google Veo 3.1

This project now supports video generation using Google's Veo 3.1 model via the Gemini API.

## Setup

1. **API Key**: Add your `GEMINI_API_KEY` to `.env.local` and Vercel environment variables
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

2. **Package**: The `@google/genai` package is already installed

## API Endpoints

### POST `/api/generate-video`
Starts a video generation job.

**Request:**
```json
{
  "prompt": "A small, swift fish swimming gracefully through clear water",
  "model": "veo-3.1-generate-preview",  // optional, default
  "aspectRatio": "16:9",  // or "9:16"
  "resolution": "720p",  // or "1080p" (8s only)
  "referenceImages": []  // optional, up to 3 images
}
```

**Response:**
```json
{
  "success": true,
  "operation": "operations/abc123...",
  "status": "processing"
}
```

### GET `/api/generate-video?operation=...`
Polls the status of a video generation operation.

**Response (processing):**
```json
{
  "success": true,
  "status": "processing",
  "operation": "operations/abc123..."
}
```

**Response (completed):**
```json
{
  "success": true,
  "status": "completed",
  "video": {
    "name": "files/xyz789...",
    "uri": "https://..."
  }
}
```

### GET `/api/download-video?file=...`
Downloads a generated video file.

**Response:** Video file (MP4)

## Usage in Code

### Using the VideoService

```typescript
import { getVideoService } from '@/lib/ai/video-service';

const videoService = getVideoService();

// Generate a fish video
const result = await videoService.generateFishVideo({
  type: 'prey',
  mutations: ['glowing scales'],
  seed: 'optional-seed'
});

if (result.status === 'completed') {
  // result.videoUrl contains the video data URL
  console.log('Video ready:', result.videoUrl);
} else if (result.status === 'error') {
  console.error('Error:', result.error);
}
```

### Custom Video Generation

```typescript
const result = await videoService.generateVideo({
  prompt: 'A cinematic shot of a majestic lion in the savannah',
  model: 'veo-3.1-generate-preview',
  aspectRatio: '16:9',
  resolution: '720p'
});
```

## Features

- **Text-to-Video**: Generate videos from text prompts
- **Image-to-Video**: Animate images (coming soon)
- **Reference Images**: Guide video content with up to 3 reference images (Veo 3.1)
- **Video Extension**: Extend previously generated videos (Veo 3.1)
- **Frame Interpolation**: Specify first and last frames (Veo 3.1)

## Model Options

- `veo-3.1-generate-preview` - High quality, slower (default)
- `veo-3.1-fast-generate-preview` - Faster generation, good quality

## Limitations

- **Latency**: 11 seconds to 6 minutes (during peak hours)
- **Video Retention**: Videos stored for 2 days on Google's servers
- **Duration**: 4, 6, or 8 seconds (8s for reference images and extensions)
- **Resolution**: 720p (default) or 1080p (8s only, 16:9 only)
- **Aspect Ratios**: 16:9 (default) or 9:16

## Notes

- Video generation is asynchronous - the service automatically polls for completion
- Generated videos include native audio (Veo 3.1)
- Videos are watermarked with SynthID for AI detection
- Safety filters are applied automatically

## Example Prompts

**Fish Animation:**
```
A small, swift fish with greenish scales swimming gracefully through clear water, smooth swimming animation, side view, underwater scene, vibrant colors, detailed scales and fins, natural fish movement, 8 seconds duration
```

**Cinematic:**
```
A cinematic shot of a majestic lion in the savannah, golden hour lighting, shallow depth of field, tracking camera movement
```

## Next Steps

- Add video generation UI to DevTools component
- Integrate with AssetManager for video caching
- Add support for image-to-video and video extension
- Create video preview/playback component
