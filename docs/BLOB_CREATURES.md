# Blob-Stored Creatures (Snapshot)

This file lists fish currently in Vercel Blob Storage. Use it to see what’s imported, add more fish in `docs/biomes/*.md`, or add stats.

**Refresh:** run `npx tsx scripts/export-creature-list.ts` (dev server must be running).

**Last updated:** 2026-01-29 · **Total:** 41

| ID | Name | Biome | Tier | Rarity | Type | Playable | Size |
|----|------|-------|------|--------|------|----------|------|
| abyssal_angler_abyssal | Abyssal Angler | abyssal | predator | common | predator | ✓ | 70 |
| abyssal_grenadier_abyssal | Abyssal Grenadier | abyssal | mid | common | prey | — | 40 |
| abyssal_horror_eldritch_abyssal | Abyssal Horror (eldritch) | abyssal | — | rare | predator | — | 110 |
| abyssal_horror_original_deep_sea | Abyssal Horror (original) | deep_sea | boss | rare | predator | — | 110 |
| abyssal_mutant_original_abyssal | Abyssal Mutant (original) | abyssal | mid | rare | prey | — | 40 |
| anglerfish_deep | Anglerfish | deep | predator | rare | predator | — | 90 |
| anglerfish_deep_sea | Anglerfish | deep_sea | — | common | predator | — | 70 |
| barreleye_abyssal | Barreleye | abyssal | prey | common | prey | — | 60 |
| black_swallower_abyssal | Black Swallower | abyssal | — | common | prey | — | 40 |
| channel_catfish_polluted | Channel Catfish | polluted | predator | common | predator | — | 70 |
| common_carp_polluted | Common Carp | polluted | — | common | prey | — | 40 |
| cusk_eel_abyssal | Cusk Eel | abyssal | prey | common | prey | — | 20 |
| deep_sea_mutant_original_deep_sea | Deep Sea Mutant (original) | deep_sea | mid | rare | prey | — | 40 |
| dragonfish_deep_sea | Dragonfish | deep_sea | mid | common | prey | — | 40 |
| elder_lanternfish_eldritch_abyssal | Elder Lanternfish (eldritch) | abyssal | boss | rare | predator | — | 110 |
| epic_shark | Great White Shark | shallow | boss | epic | predator | — | 120 |
| fangtooth_deep_sea | Fangtooth | deep_sea | — | common | prey | — | 40 |
| fathead_minnow_polluted | Fathead Minnow | polluted | prey | common | prey | — | 20 |
| goldfish_starter | Goldfish | shallow | prey | common | prey | — | 60 |
| gulper_eel_deep | Gulper Eel | deep | predator | epic | predator | — | 90 |
| gulper_eel_deep_sea | Gulper Eel | deep_sea | predator | common | predator | — | 70 |
| hatchetfish_deep_sea | Hatchetfish | deep_sea | prey | common | prey | — | 20 |
| if cephalopods added | Vampire Squid | deep | prey | common | prey | — | 60 |
| lanternfish_deep_sea | Lanternfish | deep_sea | — | common | prey | — | 20 |
| large_predator | Pike | shallow | predator | uncommon | predator | — | 90 |
| leviathan_lantern_fusion_deep_sea | Leviathan Lantern (fusion) | deep_sea | boss | rare | predator | — | 110 |
| medium_fish | Perch | shallow | mid | common | prey | — | 70 |
| medium_predator | Bass | shallow | predator | common | predator | — | 90 |
| mosquitofish_polluted | Mosquitofish | polluted | prey | common | prey | — | 20 |
| mutant_carp_original_polluted | Mutant Carp (original) | polluted | mid | rare | prey | — | 40 |
| pumpkinseed_polluted | Pumpkinseed | polluted | prey | common | prey | — | 20 |
| rare_tropical | Tropical Parrotfish | shallow_tropical | mid | rare | prey | — | 70 |
| small_prey | Minnow | shallow | prey | common | prey | — | 60 |
| snailfish_abyssal | Snailfish | abyssal | prey | common | prey | — | 20 |
| tiny_fish | Guppy | shallow | prey | common | prey | — | 60 |
| toxic_catfish_original_boss_polluted | Toxic Catfish (original boss) | polluted | boss | rare | predator | — | 110 |
| tripod_fish_abyssal | Tripod Fish | abyssal | prey | common | prey | — | 20 |
| viperfish_deep_sea | Viperfish | deep_sea | predator | common | predator | — | 70 |
| white_sucker_polluted | White Sucker | polluted | — | common | prey | — | 40 |
| yellow_perch_polluted | Yellow Perch | polluted | — | common | prey | — | 20 |
| zombie_guppy_original_polluted | Zombie Guppy (original) | polluted | prey | rare | prey | — | 20 |

---

## Workflow

- **Add more fish:** Add entries to `docs/biomes/*.md`, then run `npx tsx scripts/batch-generate-fish.ts` (skips existing).
- **Add tiers/stats to existing:** Run `npx tsx scripts/batch-update-creature-metadata.ts`.
- **Refresh this list:** Run `npx tsx scripts/export-creature-list.ts`.
