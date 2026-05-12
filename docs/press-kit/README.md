# Fish Odyssey Press Kit

Fish Odyssey follows the Forge vertical press-kit policy, with a web-first build path instead of Unity LTS/WebGL.

Use Steamworks' release process as the checklist spine: https://partner.steamgames.com/doc/store/releasing

## Steam Release Checklist Mapping

| Steamworks Area | Fish Repo Owner | Notes |
| --- | --- | --- |
| Store Presence checklist | Press kit + landing docs | Copy, tags, screenshots, capsules, trailer, and metadata readiness. |
| Game Build checklist | Web app release docs | Track production build health, hosted URL, and any Steam wrapper/build decision separately. |
| Review ordering | PM persona + Linear | Store page and playable/release review should be tracked as separate child issues if Steam is pursued. |
| Mark as ready for review | PM persona | Only after press kit rows and web deployment verification are complete. |

## A. Landing Page Assets

All raster images used by Metal Games-hosted Fish Odyssey pages must be square.

| Asset | Aspect Ratio | Suggested Export | Status |
| --- | --- | --- | --- |
| Hero/key art | 1:1 | 2048x2048 | Needed |
| Game card image | 1:1 | 1024x1024 | Needed |
| Gallery thumbnail | 1:1 | 1024x1024 | Needed |
| Open Graph image | 1:1 | 1200x1200 | Needed |
| App/icon treatment | 1:1 | 1024x1024 | Needed |

## B. Steam Store Upload Assets

These are partner-spec Steam upload assets. Verify current requirements in Steamworks before final export: https://partner.steamgames.com/doc/store/assets

| Asset | Size | Aspect / Format Notes | Status |
| --- | --- | --- | --- |
| Header capsule | 920x430 | Store page header capsule | Needed |
| Small capsule | 462x174 | Search/listing capsule | Needed |
| Main capsule | 616x353 | Storefront capsule | Needed |
| Vertical capsule | 374x448 | Vertical promotional capsule | Needed |
| Library capsule | 600x900 | Steam library portrait | Needed |
| Library hero | 3840x1240 | Steam library hero banner | Needed |
| Library logo | 1280x720 | Transparent logo artwork | Needed |
| Page background | 1438x810 | Store page background artwork | Needed |
| Screenshots | 16:9 recommended | Capture from current web build | Needed |
| Trailer | 16:9 video | Follow Steam trailer upload guidance | Later |

## Web Path Notes

- Fish Odyssey skips the Unity LTS/WebGL issue type unless the project direction changes.
- Track web production build, Vercel deployment, and playable URL verification instead.
- Do not mix Steam asset ratios into the public landing page.
