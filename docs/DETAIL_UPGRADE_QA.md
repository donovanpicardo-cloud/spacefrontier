# Detail, activities and movement update — 3 November 2026

## Implemented

- Habitat: beveled pressure panels, recessed seams, porthole glass/rings, hatch locks, ribs, vents, textured skins and a connected NASA HDU exterior annex. Existing playable interiors and enclosed airlock remain. The annex is closed, decorative architecture with solid footprint collision; no extra room is claimed.
- Moon buggy: authored tubular chassis, suspension, mesh tires/spokes, fenders, two seats, instruments, luggage fittings, headlights and instanced bolts.
- Mars rover: NASA SEV concept optimized from 413,198 to 83,713 triangles and 22.4 MB to 4.61 MB. Six paired wheel modules animate separately; chassis clearance updated for the longer body. Model bounds are 2.65 × 2.60 × 3.87 m. Seat lowered after browser testing caught helmet/roof overlap. This is an educational adaptation, not a deployed Mars vehicle.
- Repair stations: beveled housings, gauges, pipe flanges, radiator fins, cartridge pleats, trays and crossing cable routes. Both worlds use two hydroponic handwheels and physical filter replacement. Dust brushing exists only on outdoor Mars solar equipment.
- Gathering: thermal drilling/cooling and pumping for ice; alternating crank strokes and pack removal for power; lifting, sliding and lowering a circuit cartridge for salvage. The old shared alignment minigame is removed. Labels hide while using their machinery.
- Six finite deposits per map, in all quadrants away from the base. Total supplies reduced to 34 water, three parts and 38 power. IDs remain compatible with old saves; used deposits do not respawn at their moved coordinates. Level work patches prevent equipment floating on sloping terrain.
- Ballistic jumps preserve horizontal launch momentum when keys are released or the camera rotates. Moon acceleration 1.62 m/s²; Mars 3.71 m/s². Ground friction returns on contact. No artificial airborne reversal.
- Follow-up E presses during gathering no longer restart the approach or erase held input. Keyboard pickup of the second filter now begins at its visible right-hand tray.

## Performance measures

Industrial maps are local 1K CC0 photographs with shared GPU textures and reference-counted cleanup. Model textures are WebP at most 1024px; no Draco decoder is required in the browser. Fixed habitat/station/rig geometry batches after collision collection. Lunar wheel spokes batch per moving group. School preset retains pixel ratio 1, 1024 soft shadows, no screen-space AO/MSAA and a 60 FPS cap. High/Ultra remain optional.

## Verification

- TypeScript check passed.
- 89 regression tests passed across nine files. Coverage includes exact Moon/Mars ballistic trajectories at 30/60 FPS, release/camera-turn momentum, restored indoor repairs by pointer and keyboard, Mars dust prerequisite, non-aligned cable starts, distinct extraction actions, once-only reward/save depletion, all remote operator stances and walkable exits, terrain/rendered-height agreement, rotated chassis collision, driving exits, tutorials, simulation, adventures and save compatibility.
- Live browser: inspected final NASA rover from multiple angles and confirmed game bounds. Boarded, drove at 6.0 m/s, braked to zero and exited on Mars. Lowered seat removed the visible helmet/roof overlap. Solid boulders required steering or walking around them.
- Live browser: completed remote salvage by lifting over the rail, sliding onto the tray and lowering; received one part and regained movement. Completed ice drilling, overheating/cooling, seam exposure and pumping; received water and the map reported one fewer ice site. Task labels stayed hidden during active work.
- Live browser: entered the enclosed habitat airlock, which advanced the mission and restored suit air. The upgraded front pressure facade, windows and door details rendered with photographic wear.
- Earlier working-build browser check confirmed a moving lunar jump continued after movement keys were released. Automated tests independently verify it on both worlds.

## Limits

No physical school laptop was available, so smooth performance on every school computer is not guaranteed. Vehicle physics, suited jump impulse and resource rates remain child-friendly approximations. NASA cabin hatches do not animate as separate doors; the closed HDU annex has no accessible interior. Full campaigns and every optional combination have not all been replayed in this update; focused playtests and the regression suite cover the changed mechanics. Credits and source hashes are in ASSET_CREDITS.md and the public asset manifests.

Final browser checks: the lunar buggy reached 7.8 m/s, braked to zero and began its clear-space exit. The field dynamo accepted 14 alternating A/D strokes, then E unplugged the pack; the low-power warning cleared. The School computer preset reported 59 FPS in this desktop preview. Browser warning/error log was empty. Production build passed; Vite retains its non-fatal bundle-size advisory. No physical school hardware was tested.


Installed check: 53 changed files plus README were copied to C:\Users\donov\Desktop\NASA-SPACE-GAME with SHA-256 verification after confirming the original source still matched round7-backup. Port 5173 loaded the existing Moon Power the outpost save, rendered the updated habitat/annex and tangled solar leads, and logged no warnings/errors. The game was left paused. Browser QA used the separate port 5180 save, not the user's mission.


