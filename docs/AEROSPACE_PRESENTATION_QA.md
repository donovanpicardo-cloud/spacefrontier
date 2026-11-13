# Aerospace presentation overhaul — verification

The player selects a destination, watches or skips descent, explores the surface, cycles the habitat airlock and continues the same locally saved mission. This change refines that presentation without changing the simulation, progression, resource rewards, collision terrain or save schema.

## Changes
- Preserve authored PBR materials across dynamically loaded objects, including metal and visor clearcoat.
- Shared procedural ceramic panel map with joints, fasteners, subtle wear and service markings; revised pressure-shell proportions and smooth silhouettes, inspection windows and metallic fittings.
- Photograph-derived, world-space terrain detail with derivative bump relief, neutral lunar tones, Martian mineral colour and fractured distant escarpment geometry.
- Cooler lunar fill, stronger directional light, filtered shadows and readable interior reflections.
- Refined rover wheel and suit hardware work already present in the checkout, with matching materials and headless physics-test compatibility.
- Frame-rate-independent camera collision recovery, softer flight particles, tighter lunar dust and quieter audio beds during warnings and repair work.
- Graphite/cyan HUD, consistent icons, restrained panels, readable numeric instruments, focus states and reduced-motion support.

## Evidence
- Browser: lunar descent, skip, walking, airlock cycle, mission 1 → 2, habitat movement, pause/settings, Medium → High quality, local save and resume.
- Browser: Mars descent and saved surface rendering; no JavaScript errors observed during these checks.
- Local diagnostics on RX 7800 XT: representative Medium surface samples around 234–237 FPS at 688 × 833; a High Mars sample around 187 FPS at 860 × 1041. These are hardware- and view-specific spot checks, not a cross-device benchmark. Initial world/quality transitions include shader compilation stalls.
- Tests cover simulation, resources, driving, airlocks, recovery, mission progression, audio timing, terrain, save-related gameplay and renderer material preservation.
- Screenshots are kept outside the repository, not shipped with the game.

## Limits
The complete campaign was not manually replayed. Audio timing/mix behavior was checked in code and automated tests; subjective listening was not independently assessed. Existing imported assets and engine constraints remain; this is a substantial browser-game art-direction refinement, not AAA production parity. No new gameplay systems or external asset downloads were added.

Final checks: `npm test` passed all 155 tests across 24 files; `npm run build` passed. A narrow-viewport arrival toast overlapped the objective during visual QA; it was moved above the lower HUD so it no longer covers mission text.

Deployment follow-up: Vercel's first build ran 154 tests successfully but the exhaustive lunar terrain/site raycast test took 5.394 seconds and exceeded Vitest's default five-second timeout. That specific test now allows 20 seconds on shared CI hardware, retaining all geometry-budget and site-alignment assertions. The gameplay and renderer are unchanged by this follow-up.

## Photographic correction and navigation removal

The follow-up replaces the pale procedural hull coating and compressed ground coloration with photographic color, normal and roughness maps. World-space slope blending separates gravel from cliff surfaces; habitat wear retains visible contrast. Added pressure hoops, heat-exchanger fins, protected conduits and equipment detail are batched with existing cosmetic geometry. Lower-angle sunlight and reduced exterior fill strengthen relief. High is now the initial quality preset; existing scalable quality options remain available.

Removed the golden route dots/beacon, navigation camera steering and idle menu camera orbit. Objectives, HUD guidance, manual camera reset, task close-ups and authored cinematics remain. No progression, save-schema, control-binding or collision changes.

Verification for this follow-up: 156 tests across 24 files passed; production build passed. Browser checks covered the saved lunar surface, textured cliffs/ground, close habitat approach, help guidance without a golden trail, and pause UI. No console errors were observed. A local High-quality spot sample on RX 7800 XT measured about 114 FPS (GPU about 3 ms); this is hardware/view-specific, not a cross-device benchmark. Mars and the complete campaign were not manually replayed for this follow-up. New CC0 source credits and hashes are in the asset credits and manifest. Before/after screenshots remain outside the shipped repository.

## Curved pressure architecture (November 13, 2026)

Replaced the polygonal entrance arches with smoothly curved pressure collars and the flat-ended front cylinders with spline-profiled, dished pressure vessels. Removed broad diagonal decoration so the new shapes read clearly. Repositioned vessel stiffeners to follow the barrel sections, replaced the antenna cabinet with a tapered pedestal, and added six tapered roof bays with curved transverse ribs and longitudinal seams. New meshes use existing materials and static batching; no external assets were added. The original cabin, collision shell, door animation, progression, controls and save format remain unchanged.

Validation: all 158 tests across 25 files pass, including raycast checks across the doorway opening and a roof geometry budget below 18,000 triangles. `npm run build` passes. Browser checks verified saved-mission loading, the lunar exterior, walking through the entrance, the airlock pressure cycle, advancement to mission 2 and the unchanged cabin. The initial roof front was visually too slab-like and was revised to taper smoothly into the front and rear. The complete campaign and a cross-device performance benchmark were not replayed for this geometry-only revision.
