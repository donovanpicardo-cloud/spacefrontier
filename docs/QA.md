# Verification — 2026-11-02

## Solid scenery and hands-on repairs

- Added a spatial collision index built from visible static scenery, every rock instance, per-triangle hull/rib bounds, and segmented pipes. Floors support stepping; raised equipment blocks the body only when its height overlaps. Current door bounds participate dynamically. Movement is substepped to prevent sprinting through thin objects. Existing overlapping saves may move outward to recover.
- 34 tests pass across four files. Added checks for thin-wall blocking, wall sliding, overhead clearance, furniture support, ceilings, small rubble, moving doors, overlap recovery, rock instances, hollow interiors, cable matching, valve angle wraparound, filter cleaning coverage and four jump phases. Existing save positions inside newly solid objects are moved to a nearby clear position on load; a separate check verifies that already-clear positions remain unchanged.
- Browser checked closed-airlock blocking, normal entry/exit, collision at the solar service console, and access to greenhouse and life support through the interior aisle. Moved the solar interaction marker to the accessible service console rather than beneath the panels.
- Completed all three new activities using actual pointer drags: connected three cables (also verified that a mismatched socket is rejected), rotated the water valve clockwise, and scrubbed the dusty filter. Each completed activity advanced its campaign objective automatically and required no completion button.
- Inspected the rising jump pose; takeoff, rising, falling and landing have distinct animation selections. The tutorial still advances after landing.
- Simplified the play HUD to a single goal card, suit air, Help/Pause and contextual interaction. Detailed systems remain in the dashboard. Removed the brand/header, mission clock, permanent control legend, compass, reticle and redundant health/battery displays during ordinary play. Short completion messages replace long science notifications; lessons remain in the journal.
- Mouse movement over the world now controls the camera without a held button. Launch/resume also request pointer capture, with free-hover look as the fallback. Repair and menu interactions release camera control. R resets the view, H gives help, and Escape pauses.

The earlier end-to-end Moon/Mars campaign records below predate these collision/activity changes. The three affected mission interactions and the airlock were replayed for this revision; the final emergency sequence was unchanged and was not replayed on both destinations again. Collision uses conservative volumes for most props rather than exact contact against every visible triangle. Tiny debris is stepped over; particles, dust, footprints and the guidance trail are effects, not solid obstacles.

## Junior Explorer, online astronaut and tutorial upgrade

- Production build passes; 23 tests pass across three files. New checks cover ordered tutorial actions, resource freezing during all practice panels, lesson replay reset, valid legacy saves, malformed saves, and aisle/airlock routing.
- Completed the full first-time Moon tutorial through actual keyboard/mouse actions: walking, camera drag, R reset, jump and landing, following a marker, matching repair, airlock entry, and objective/help/oxygen explanations. Practice resources stayed unchanged, including the repair. Finish began a new mission at the starting point with fresh resources.
- Completed all five Moon objectives in Junior Explorer without the systems dashboard: A grade, 100% health, approximately 81% water and 64% battery. One replay/skip from the shelter restored the captured objective, position and reserves.
- Completed all five Mars objectives in Junior Explorer without the systems dashboard: A grade, 100% health, approximately 81% water and 71% battery. The corrected airlock heading and aisle route were exercised on this run.
- Continued a saved lunar mission after reloading and verified recovery. Subsequent new-game launch remembered tutorial completion and proceeded directly to the mission.
- Found and fixed indoor camera collision avoidance changing the movement heading. Collision framing now leaves the requested heading intact. Added aisle waypoints to route children around workstations and recalibrated guidance at the end of airlock transit.
- Loaded the locally served, optimized human Grab3D astronaut, with source walk/run clips and authored idle, airborne, landing and repair poses. Confirmed the detailed model is used instead of the procedural fallback. Source license and AI-assisted provenance are bundled.
- Inspected improved lunar surface detail, model and structure shadows, portholes, panel seams, lander landmark and habitat interior. Moon atmospheric fog and suspended dust were removed; Mars retains atmospheric effects.
- Browser error/warning inspection during the Moon campaign returned no entries.
- Switched Low, Medium, High and Ultra presets. Ultra rendered its ambient-occlusion pass without browser errors. Short local samples at the 1280×720 preview reported roughly 144–149 FPS on High, 146 on Medium and 223 on Low; Ultra varied around 17–34 FPS and is substantially more expensive. These are brief samples on the available desktop, not representative benchmarks or sustained guarantees.
- Final build and 23 tests pass after the completion-screen, quality-switching and navigation corrections. Vite reports a large Three.js chunk (about 586 kB before compression), so further download splitting remains possible.

Child-friendly design is implemented but has not been tested with children. Full hand/foot IK, music, environmental audio, controller support, remapping, expanded campaigns and broad device/browser performance profiling remain unfinished. The source asset loader has an error fallback; network-failure behavior has not been manually forced in the browser.

Earlier verification records below describe prior versions and are retained as history.

## Exploration upgrade verification

- Final `npm run build` succeeded after the model, habitat, cursor-control and camera-framing changes.
- Final `npm test`: 17 tests passed across two files. New coverage checks full yaw rotation, sensitivity, pitch limits, invalid input recovery, tight-camera framing, level outpost foundations and deterministic distinct terrain.
- Visually inspected the redesigned astronaut, gold visor reflections, textured lunar terrain, arched habitat, command monitors, greenhouse plants and modular floors in the browser.
- Continued the existing saved lunar mission into the rebuilt habitat. Walked through the work areas, approached hydroponics and opened its repair interaction; the astronaut remained visible in the world.
- Verified cursor dragging changes the shoulder camera without pointer lock. Verified surface orbit and wheel zoom on both Moon and Mars.
- Verified the rebuilt airlock exits to the surface. Found tight exterior framing while orbiting near its rear wall; extended clear-angle selection outdoors and added bounded adaptive field of view and lower focus for obstructed camera positions.
- Launched the upgraded Mars environment and exercised sprint and jump. Inspected its ridges, surface detail, astronaut pose and camera after landing.
- In-world monitor values and histories now use actual simulation state; plant scales, lights, screens and ventilation are connected to simulation state.
- One intermediate hot-reload error occurred while `updateHabitatScreens` was being introduced across two files. The export was implemented, the production build passed, and the scene was reloaded successfully. No new runtime error appeared during subsequent Moon/Mars checks.

The complete lunar campaign result below predates this art upgrade. After the upgrade, targeted exploration and interaction checks were repeated; neither entire campaign was replayed again. Optional double-click pointer capture, touch gestures, extreme collision-angle combinations and sustained frame rate were not exhaustively tested. Character animation is procedural joint blending, not motion capture or full foot/hand IK.

## Automated checks

- `npm run build`: TypeScript and Vite production build succeeded.
- `npm test`: 11 tests passed, covering oxygen and CO2 consumption, water and power costs, generation under repair and storms, crop prerequisites, shielding, resource bounds and crew failure, deterministic updates, serialization, and destination mission definitions.
- Dependency installation after the Vitest update reported zero known vulnerabilities.
- Local HTTP readiness check returned status 200.

## Browser checks actually performed

Using the in-app browser against the local Vite server:

- Main menu, Moon and Mars destination selection, and controls briefings rendered.
- WASD moved the visible astronaut relative to the camera; the Martian jump input was exercised.
- Lunar airlock entry and exit worked; the campaign advanced after habitat entry.
- The habitat camera initially zoomed too close because of the rear door. Added alternate clear shoulder angles and verified the full astronaut was visible inside after the fix.
- Completed the lunar solar repair through isolate, service, restart; campaign advanced and power generation improved.
- Completed irrigation repair; the objective remained incomplete until grow lights were enabled in the dashboard.
- Completed life-support repair; the environmental emergency activated with a 45-second timer.
- Disabled grow lights, enabled backup, reached the shelter and activated shielding. The timed emergency completed with all five objectives, an A grade, 100% crew health, about 79% water and 60% battery.
- Resource history showed real samples; toggling grow lights changed projected battery loss from approximately 9.0% to 3.1% per simulation minute at that point in the scenario.
- Saved a lunar mission from the pause menu, returned to title and resumed the same objective, position and resource state.
- Launched Mars and visually confirmed rust terrain, warm dusty atmosphere, distinct lighting and a visible third-person astronaut.
- Fixed an input-focus issue where Escape was ignored after changing a dashboard checkbox. Repeated that interaction on Mars and verified Escape closed the dashboard.
- Browser log inspection at the lunar emergency returned no warnings or errors.

## Verification limits

The full Mars campaign was not independently replayed end to end; it shares the tested interaction and progression code with Moon, with different gravity, environment and storm generation reduction. Mouse pointer-lock orbit, wheel zoom, all camera collision angles, all graphics presets and sustained performance were not exhaustively tested across browsers. No claim of 60 FPS, AAA asset quality, scientific certification, complete master-brief coverage or official challenge-rubric compliance is made.
