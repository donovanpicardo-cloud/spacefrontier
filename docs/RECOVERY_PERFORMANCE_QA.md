# Recovery-room, resource discovery and performance update

## Current behavior

- The sealed NASA HDU annex/neck is removed from the active scene. A new Crew recovery room can be built for three parts, 18% power and one sample research. It opens a real east-side passage through the main pressure hull. Existing saves remain valid, including built-room state and positions inside it.
- Main interior adds woven padded chairs, stitched bedding/retention straps, keyboards, galley fixtures, medical monitor/drawers, regulators, grilles, cable/pipe detailing and ceiling lights. The new room contains a medical cot, scanner, recovery seating and storage. Fixed detail batches by material.
- Resting in the built powered room restores health/suit air and consumes food and power until full. The HUD identifies treatment and full reserves. Hydroponics/filter/solar work now grants different visible capped benefits, at a spare-part cost and with the existing 45-second cooldown.
- Solar source wires are ordered. Destination colours/symbols are permuted with no matching source and socket on the same row, on both worlds. Dragging to a wrong colour/symbol does not complete a lead.
- Full surface survey plots all six finite resource sites. Buttons select an exact deposit and report distance/yield or depletion. Buried ice becomes water through drilling/pumping; battery packs require the crank generator. Resources remain scarce and collected IDs remain depleted across saves.
- Fixed walking/driving fences are removed. Recycled outer ground tiles support travel beyond the original central terrain, with bounded geometry and distant-save validation. These expanses do not add unlimited resources or handcrafted locations.
- Space-game jump tuning replaces raw planetary gravity in the controller. Moon remains floatier than Mars, with persistent release momentum and limited suit air steering. Natural-gravity facts remain labelled separately.
- Both vehicles traverse small and medium surface rocks using smooth wheel support, visible body pitch/roll and wheel articulation. Large rocks and buildings remain solid. Individual and instanced rock classification are both covered.

## Performance work

School computer mode avoids canvas MSAA and completely skips allocating the heavy AO/composer targets. It caps internal pixels near one million, adapts under sustained slow frames, uses 80,000 central terrain triangles (previously 135,200), reduces decorative scatter and disables pebble shadows. Distant unselected resource rigs are culled. At most two nearby interior point lights run, with none lighting the outside scene. Telemetry textures update indoors only. Pause rendering is capped; hidden tabs stop rendering. Wall-camera collision now casts one ray instead of searching seven alternate angles and changing apparent heading.

The full-resolution interface stays sharp independently of the 3D canvas. High/Ultra still enable extra effects. Settings show FPS, draw calls, triangles and a School-mode shortcut. The page cannot change Brave GPU settings.

## Automated validation

102 tests across ten files passed after the functional changes. TypeScript passed. Regressions cover physical room entry/exit with the complete dressed habitat, its pre-build seal, economy/persistence and treatment costs; distinct capped service rewards; scrambled wiring and actual projected pointer drags; controlled airborne steering/momentum; travel/saves beyond the former fence; bounded terrain recycling; rendering pixel budget/adaptation; medium-versus-large boulder collision on both worlds; and the existing tutorial, vehicle, repair, simulation and expedition behavior.

## Live verification so far

In the isolated preview, collected a sample, spent its research at the fabricator, constructed the recovery room, saved/reloaded it, walked through its physical connection and saw its health/suit status. The first walkthrough exposed an early-turn navigation hint and high camera at the lintel; both were corrected. The survey menu lists and plots water and battery sites that were absent from the old map.

## Limits

Direct native Brave inspection was blocked because the computer-use tool could not reliably identify that browser's current page. No browser/GPU/security settings were changed, and no Brave-specific frame-rate guarantee is made. No physical school computer was available. If Brave remains slow in School mode, check its normal graphics acceleration setting; software WebGL can remain slow despite scene optimizations. Full campaign/soak and every optional combination have not all been replayed during this update. Rock traversal, treatment and assisted jumps are intentionally forgiving game mechanics.

Final preview check: walked into the recovery room after camera corrections; its cot/scanner, padded chair, fixtures and status display rendered. The full survey map opens with both water and battery markers visible without scrolling. School mode reported 60 FPS, 202 draw calls and about 511k submitted triangles on this desktop preview; the browser warning/error log was empty. Production build passed with Vite's existing non-fatal chunk-size advisory. This is not a measurement from Brave or a physical school laptop.


Installed verification: 37 changed files plus README were copied into C:\Users\donov\Desktop\NASA-SPACE-GAME with hash verification after comparing the original source to round8-backup. The latest existing Moon save opened at Survive the darkness, logged no browser warnings/errors, and was left paused. Its mission progress and resource levels were preserved; the isolated port-5180 test save was not copied into it.


