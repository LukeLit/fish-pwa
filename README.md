# Fish PWA

A roguelite fish game built with [Next.js](https://nextjs.org): eat smaller fish to grow, avoid predators, and unlock biomes. Fish art is AI-generated from modular prompts and stored in Vercel Blob; the Fish Editor lets you create, flip, and regenerate sprites.

## Quick start

```bash
cp .env.example .env.local   # add OPENAI_API_KEY and BLOB_READ_WRITE_TOKEN
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Fish Select** to pick your fish, then **Dive** to play.

## Fish art & blob creatures

All playable and AI fish come from **Vercel Blob Storage** (sprites + metadata). You can:

| Goal | Command |
|------|--------|
| **Add new fish** | Add entries to `docs/biomes/*.md`, then `npx tsx scripts/batch-generate-fish.ts` (skips fish that already exist). |
| **Patch tiers/stats on existing fish** | `npx tsx scripts/batch-update-creature-metadata.ts` (no sprite regeneration). |
| **Snapshot what’s in blob** | `npx tsx scripts/export-creature-list.ts` → writes `docs/BLOB_CREATURES.md`. |

Dev server must be running for these scripts. Full details, env vars, and JSON/CSV import options: **[scripts/README.md](scripts/README.md)**.

## Setup

1. Copy `.env.example` to `.env.local` and set:
   - **`OPENAI_API_KEY`** — Vercel AI Gateway key (starts with `vck_`) for fish image generation
   - **`BLOB_READ_WRITE_TOKEN`** — Vercel Blob Storage token for the "fish-art" store

2. Create the Blob store in your [Vercel Dashboard](https://vercel.com/dashboard) → Storage → new Blob store named **fish-art**, then paste the token into `.env.local`.

3. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

## Docs

- **[scripts/README.md](scripts/README.md)** — Bulk creature import, batch fish generation from biome docs, metadata patches, and export.
- **docs/biomes/** — Markdown fish definitions (description chunks, visual motif, size tier, essence) used by the batch pipeline.
- **docs/MODULAR_PROMPT_SYSTEM.md**, **docs/FISH_DATA_STRUCTURE_BATCH.md** — Prompt and data shape for fish art.

## Deploy on Vercel

Deploy with the [Vercel Platform](https://vercel.com/new); set `OPENAI_API_KEY` and `BLOB_READ_WRITE_TOKEN` in the project environment. See [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying) for details.
