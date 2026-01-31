# Copilot Instructions for fish-pwa

## Project Overview

This is a roguelite fish survival game built as a Progressive Web App (PWA) with AI-generated assets. Players control a fish that must eat smaller fish to grow while avoiding predators, with persistent progression through essence collection and meta-upgrades.

## Tech Stack

- **Framework**: Next.js 16.1.4 (App Router)
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 4
- **AI Integration**: Vercel AI SDK with OpenAI and Google Imagen
- **Storage**: Vercel Blob Storage
- **Game Engine**: Matter.js (physics), p5.js (rendering)
- **PWA**: next-pwa with Workbox
- **Package Manager**: npm

## Project Structure

```
/
├── app/                      # Next.js App Router pages
│   ├── api/                  # API routes
│   ├── fish-editor/          # AI asset testing environment
│   ├── game/                 # Main game page
│   └── tech-tree/            # Upgrade tree UI
├── components/               # React components
│   ├── GameCanvas.tsx        # Main game renderer
│   ├── FishEditor*.tsx       # Fish editor components
│   └── TechTree.tsx          # Upgrade tree
├── lib/                      # Core game logic
│   ├── ai/                   # AI asset generation
│   ├── game/                 # Game engine, entities, physics
│   ├── meta/                 # Progression systems
│   ├── storage/              # Blob storage utilities
│   └── blockchain/           # fxhash integration
├── public/                   # Static assets
│   ├── sprites/fish/         # Fish sprites
│   └── backgrounds/          # Background images
└── *.md                      # Design documents
```

## Development Workflow

### Environment Setup

1. Copy `.env.example` to `.env.local`
2. Required environment variables:
   - `OPENAI_API_KEY`: Vercel AI Gateway key (starts with `vck_`)
   - `BLOB_READ_WRITE_TOKEN`: Vercel Blob Storage token

### Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing Changes

- Use Fish Editor (`/fish-editor`) to test AI-generated assets
- Use DevTools component for in-game debugging
- Test PWA features in production build

## Coding Standards

### TypeScript

- **Strict mode enabled**: All code must be type-safe
- **Use interfaces** for data structures (see `DATA_STRUCTURE.md`)
- **Avoid `any`**: Use proper types or `unknown` with type guards
- **Path aliases**: Use `@/` for imports from root (configured in `tsconfig.json`)

### React & Next.js

- **Use App Router** conventions (not Pages Router)
- **Server Components** by default, use `'use client'` only when needed
- **Error boundaries**: Wrap interactive components with `ErrorBoundaryWrapper`
- **Async components**: API routes return Response objects

### Code Style

- **ESLint**: Follow Next.js and TypeScript ESLint configs
- **No semicolons**: Project uses ASI (Automatic Semicolon Insertion)
- **Formatting**: Match existing code style in each file
- **Comments**: Only add when explaining complex logic, not obvious code

### File Naming

- **React components**: PascalCase (e.g., `GameCanvas.tsx`)
- **Utilities/services**: kebab-case (e.g., `blob-storage.ts`)
- **API routes**: kebab-case folders (e.g., `app/api/save-sprite/`)

## Game Architecture

### Core Game Loop

1. **Player** controls a fish with WASD/Arrow keys
2. **Entities** (prey, predators) spawn and move using physics
3. **Collision detection** triggers eat/damage events
4. **Essence** drops from eaten fish (see essence system)
5. **Progression** through size growth and upgrades

### Data Structures

Refer to `DATA_STRUCTURE.md` for complete specifications:

- **Creature**: Fish with stats, essence types, and spawn rules
- **EssenceType**: Currency categories (shallow, deep_sea, polluted, etc.)
- **Biome**: Game environments with depth + modifiers
- **UpgradeNode**: Persistent upgrades in tech trees
- **Ability**: Passive bonuses unlocked through upgrades
- **PlayerState**: Persistent player data across runs
- **RunState**: Temporary run-specific data

### Essence System

- Multiple essence types (shallow, deep_sea, tropical, polluted, cosmic, demonic, robotic)
- **All essence types are always granted** (no random drops)
- Each creature drops multiple essence types based on its configuration
- Essence persists between runs for permanent upgrades

### AI Asset Generation

- **Models**: Google Imagen Fast (recommended), Imagen Standard, Flux 2 Pro
- **Fish prompts**: Request "isolated on transparent background" and "PNG cutout style"
- **Testing**: Use Fish Editor (`/fish-editor`) to preview before saving
- **Storage**: Save to `/public/sprites/fish/` or upload to Blob Storage

### Storage Architecture

- **Vercel Blob Storage** for game data and AI-generated assets
- Structure: `creatures/`, `essence/`, `biomes/`, `upgrades/`, `abilities/`, `player/`
- **Sprites + Metadata**: Store both `.png` and `.json` for each creature
- See `DATA_STRUCTURE.md` for complete blob storage organization

## Common Tasks

### Adding a New Fish Type

1. Generate sprite using Fish Editor or save existing
2. Create creature metadata (see `Creature` interface in `DATA_STRUCTURE.md`)
3. Save using `POST /api/save-creature` (sprite + metadata)
4. Configure essence types (all types always granted)
5. Set spawn rules (biomes, depth range)

### Adding a New Upgrade

1. Define `UpgradeNode` in appropriate tree file (`upgrades/{category}_tree.json`)
2. Set category, prerequisites, costs, and effects
3. Keep `maxLevel` low (2-5, not 10+) for impactful upgrades
4. Update UI in `components/TechTree.tsx`

### Adding a New Biome

1. Create biome definition (`biomes/{biomeId}.json`)
2. Define base depth + modifiers (e.g., "deep" + ["polluted"])
3. Set available essence types
4. Configure background assets and visual theme
5. Set unlock costs (essence requirements)

### Adding a New Ability

1. Create ability definition (`abilities/{abilityId}.json`)
2. All abilities are **passive** (no active abilities)
3. Set activation type (`always_active` or `periodic` with cooldown)
4. Define effect (damage, heal, buff, attraction, etc.)
5. Link to unlock requirement (upgrade ID + level)

### Working with APIs

All API routes are in `app/api/`:
- Follow Next.js 15+ conventions (export async functions)
- Return `Response` objects with JSON
- Validate input data
- Handle errors gracefully with consistent error format

## Design Documents

Key design documents to reference:

- **`DATA_STRUCTURE.md`**: Complete TypeScript interfaces and API specs
- **`ROGUELITE_DESIGN.md`**: Game design and progression systems
- **`FISH_EDITOR.md`**: AI asset testing environment
- **`VERTICAL_SLICE.md`**: Core game loop implementation
- **`VERCEL_BLOB_MIGRATION.md`**: Storage architecture

## Important Notes

### AI Asset Transparency

- AI models may generate fake backgrounds despite "transparent background" prompt
- Always test generated fish against different backgrounds in Fish Editor
- Use "PNG cutout style" in prompts to improve results

### Performance Considerations

- Limit fish spawns to reasonable numbers (see `PERFORMANCE_FIXES.md`)
- Use object pooling for frequently created/destroyed entities
- Optimize physics calculations for large numbers of entities
- Cache static data (essence types, biomes, upgrade trees)

### PWA Features

- Service worker handles offline functionality
- Workbox for caching strategies
- Test PWA features in production build only

### Blockchain Integration

- fxhash integration for NFT minting (optional feature)
- Located in `lib/blockchain/`

## Dependencies to Note

- **@ai-sdk/openai**: Vercel AI SDK for OpenAI
- **@google/genai**: Google Generative AI (Imagen)
- **matter-js**: 2D physics engine
- **p5**: Creative coding library for rendering
- **howler**: Audio playback
- **@vercel/blob**: Vercel Blob Storage SDK

## Common Pitfalls

1. **Don't use Pages Router patterns** - this project uses App Router
2. **Don't add active abilities** - all abilities are passive
3. **Don't use random essence drops** - all essence types are always granted
4. **Don't create 10+ level upgrades** - keep maxLevel low (2-5)
5. **Don't forget error boundaries** - wrap client components
6. **Don't bypass type safety** - avoid `any` and maintain strict types

## Critical: Think Before Suggesting

**Before suggesting alternative approaches or tools, STOP and consider:**

1. **Does the alternative actually solve the problem?** Think through the full use case:
   - Players generate NEW fish dynamically (mutations, fusions)
   - Animations must work for any generated sprite automatically
   - No human intervention is acceptable for player-generated content

2. **Will it produce consistent results?** 
   - Text-to-image for animation frames = inconsistent fish appearance between frames (BAD)
   - Image-to-video with sprite reference = maintains visual consistency (GOOD)
   - Manual animation tools (Spine/Rive) = requires human work per fish (IMPOSSIBLE for UGC)

3. **Is the cost justified for what it achieves?**
   - Video generation (Veo) IS expensive but IS the right tool for animating AI-generated sprites
   - The problem isn't the approach - it's broken implementations

4. **Test expensive operations thoroughly before deployment:**
   - Test the COMPLETE flow end-to-end locally before using production APIs
   - For paid APIs, verify: authentication, download, storage - every step
   - Add safeguards (operation ID backups, recovery endpoints) BEFORE running expensive operations

**Don't suggest half-baked alternatives that sound cheaper but don't actually work.**

## Testing & Debugging

- Use Fish Editor for asset generation testing
- Check browser console for errors
- Use Next.js development mode for hot reload
- Verify Blob Storage uploads in Vercel dashboard
- Test physics in isolated scenarios

## Contributing

When making changes:
1. Follow existing code patterns and conventions
2. Update relevant design documents if changing systems
3. Test thoroughly in Fish Editor and main game
4. Ensure TypeScript compiles without errors
5. Run ESLint before committing
6. Keep changes minimal and focused
