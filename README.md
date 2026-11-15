# FRONTIER — Moon & Mars Mission Trainer

A browser-based third-person astronaut adventure and educational outpost simulation. Built with React, TypeScript, Three.js and Vite. No backend, login or API keys.

## Play the live game

[Open FRONTIER in your browser](https://spacefrontier.vercel.app). Use a computer with a keyboard and mouse.

1. Choose **Visit the Moon** or **Visit Mars**. Keep **Junior Explorer** selected in the briefing and choose **Launch mission**. The first-time tutorial lets you practice while your supplies are safe.
2. Follow the on-screen objective and its trail. Use **WASD** to move, the **mouse** to look around, **Space** to jump, and **E** to use equipment. Press **H** for help, **M** for the map, and **Esc** to pause.
3. Cycle through the airlock, repair the outpost systems, and reach the shelter during the emergency. If the game assigns a rover supply run, board with **E**, drive with **WASD**, and use **Space** to brake before getting out.
4. To finish the expedition, press **U** and choose **Earthbound**. Use the fabricator to build the return rocket, then follow the game's guidance to the launch pad. Get out of the rover before boarding.

If you stop partway through, choose **Continue saved mission** from the opening screen in the same browser.

## Run

Requires Node.js 22.12 or newer within Node 22.x, matching the Vercel build runtime pinned in `package.json`.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

Open the Local URL printed by Vite. For deployment, run `npm run build` and deploy `dist/` to Netlify or Vercel (framework: Vite). The app uses only the root route; no server functions are needed.

## Live game and automatic deployment

Vercel is connected to this repository. Pushing a commit to `main` automatically runs the test suite and production build before publishing the game. Either check failing prevents publication. Local file saves become live after they are committed and pushed. Codex should run `npm test` and `npm run build`, then commit and push completed changes as described in `AGENTS.md`. Ask to keep work local when you do not want it published.

The opening screen lets players select a rotating 3D Moon or Mars. Selection begins a 24-second spacecraft approach, engine failure, and crash landing, followed by the surface mission. Skip and reduced-motion options are available.

## Play

### Junior Explorer and first-time tutorial

Junior Explorer is the default in the briefing. First new games begin with a playable seven-part lesson: walking, mouse look (including R to reset), jumping and landing, following a trail, a matching repair, entering the airlock, and finding the objective/help/air meter. Each action must actually be completed. Supplies and emergencies are frozen throughout practice, including repairs. Instructions use large text and control pictures, with opt-in browser speech and automatic extra hints after 18 seconds. Speech support depends on the browser; all instructions remain available as text.

The tutorial keeps the mouse cursor visible; click Skip tutorial or press K. Skip tutorial starts a fresh mission without marking the lesson complete. Finishing remembers completion locally. Replay from the main menu, Academy or Pause; an in-mission replay restores the captured mission state and does not overwrite its save. Settings can reset completion. Help me also turns the view toward the next trail destination. R resets the view behind the astronaut.

Junior Explorer uses easier resource consumption, minimum safety reserves, checkpoint retry, larger interaction zones, hands-on cable, valve and filter repairs, automatically enabled greenhouse lights after irrigation repair, and one-button emergency power preparation at the shelter. Specialist retains manual systems management. Autosaves are local to this browser, every 30 seconds and on objective changes. Try again returns to the most recent in-memory objective checkpoint.

These features are designed for young players; they have not been usability-tested with children. Keyboard and mouse are supported; controller and touch gameplay are not advertised.

Choose New mission → Moon or Mars → briefing → Launch mission. Move your mouse to look around; no held mouse button is required. Launch/resume request captured mouse look where the browser permits it; free mouse movement over the world works as a fallback. Escape pauses and releases the cursor for menus. WASD moves; Shift sprints; Space jumps; E interacts; F toggles the lamp; R resets the camera; H gives help; scroll zooms; Tab opens systems; M opens the map; J opens the journal.

The camera follows a visible, animated rigged astronaut. Exterior distance defaults to 4.7 m; zoom range is 3–7 m. Interior distance shortens automatically. Camera rays check large rocks, habitat walls and roof, and solar panels; terrain sampling prevents the view crossing slopes. There is no first-person or free-flight gameplay mode.

## Exploration upgrade

- Rebuilt the suit with curved armor, fabric bump detail, reflective gold visor, mission patches, hoses, service connectors, life-support tanks, venting, articulated gloves and boot tread.
- Separate shoulder, elbow, hip, knee and ankle joints blend idle breathing, walking, running, airborne poses, landing compression and equipment servicing. Repairs turn the astronaut toward the equipment.
- Deterministic lunar craters and Martian ridges replace the shared undulating ground; terrain material detail, thousands of instanced rocks, localized walking dust and contact shadows add surface scale.
- Arched pressure hull, modular flooring, utility pipes, command workstation, hydroponic plant clusters, grow-light racks, crew bunks, medical storage, life-support manifolds, battery racks and reinforced shelter.
- In-world displays show actual simulation resources and history; lights and ventilation respond to available power.
- Move the mouse to look around without holding a button. Wheel zoom, camera reset and adjustable sensitivity are available.

## Walkthrough

1. Follow the illuminated markers to the central airlock. E checks the suit and cycles pressure, moving you through the doorway into the habitat.
2. Exit and visit the solar panels east of the airlock. On the Moon, connect three matching leads. On Mars, brush the contacts clean, then connect two leads.
3. Return inside; visit hydroponics on the west side. Turn both supply and return handwheels on either destination. Grow lights in the Tab dashboard must be on to complete this objective.
4. Visit life support in the northeastern portion of the habitat and perform the filter repair.
5. The environmental emergency begins. In Tab, enable backup and disable grow lights; reach the shelter at the north end and press E. The mission debrief grades survival and reserves.

Simulated resources continue to change during repairs, and pause in menus. Crop growth requires restored irrigation, available water, energy and lights; harvest is available at 100%. Emergency power consumes spare parts. Save from Escape; Continue restores the destination, astronaut position and simulation. Saves stay in this browser.

## Science and assets

See [requirements mapping](docs/CHALLENGE_REQUIREMENTS.md), [science assumptions](docs/SCIENCE.md), [asset credits](docs/ASSET_CREDITS.md), and the in-game Science screen. Independent educational project; no NASA endorsement. The primary astronaut is a locally hosted, rigged CC0 Grab3D spacesuit with walk/run animations. The publisher discloses AI-assisted source creation. Additional poses and environment elements are authored for this project. Optional Google Fonts load Barlow Condensed and DM Sans, with system fallbacks. Original music and sound effects are synthesized locally with Web Audio after user input; no external audio downloads are required.

## Current scope and limitations

This is a playable vertical slice, not a finished AAA game. Five sequential objectives exist per destination, sharing system mechanics; expanded campaigns remain future work. The astronaut uses a skinned GLB with source walk/run clips and authored idle, jump, landing and repair poses, with two-bone hand reach for actual equipment and the steering wheel; foot IK remains future work. Except for the credited NASA Apollo, HDU and SEV models and Poly Haven photographic materials, environment assets and the decorative Earth texture are authored interpretations; no NASA terrain dataset is bundled. Habitat work areas use an open plan with partitions. Airlock pressure cycling is simplified. Scenarios are authored rather than random. Sound effects and music are procedural interpretations rather than field recordings; optional tutorial speech remains available. Controller support, remapping and comprehensive cross-device profiling remain future work. Radiation is an educational exposure index. Resource rates and Junior Explorer safety floors are game balance choices.

### Graphics presets

The Moon has no atmospheric fog or suspended dust. Mars retains haze and airborne dust. Terrain has generated normal and bump maps, while outpost pressure panels, portholes, cables and a lander provide landmarks. School computer is the default: 1× pixel ratio, 1024-pixel shadows, no ambient occlusion or multisample offscreen buffers, and a 60 FPS cap. Low uses reduced resolution, no directional shadows and a 30 FPS cap. Medium uses 1024-pixel shadows; High uses 2048; Ultra uses 4096. High and Ultra enable ambient occlusion and multisampled rendering. A snapped, player-following shadow region improves coverage. Contact shadows remain available at lower quality. Settings shows a local FPS sample; it is not a cross-device performance guarantee.

Tests cover deterministic resource conservation, power trade-offs, irrigation prerequisites, exposure protection, failure and serialization. Production builds run TypeScript checks. See `docs/QA.md` for the exact checks performed.


## Solid scenery and physical repairs

Scenery, furniture, solar arrays, the rover, lander and rock instances now contribute solid collision volumes. The astronaut slides along obstacles, steps over tiny debris, lands on supported surfaces and cannot jump through ceilings. Hull interiors remain walkable and moving doors use their current positions. Most props use conservative collision bounds. Airlock travel approaches the doorway center before passing through it.

All repairs now happen on equipment in the 3D world, with tool-following hands and no popup puzzle. Both destinations have two indoor water-loop handwheels and a removable life-support filter cartridge. Outdoors, the Moon has three tangled power leads; Mars requires dust clearing before connecting two crossing leads. Completion is automatic once the task is done; supplies are charged only on successful repair. Keyboard alternatives use Space to grab/drop, arrow keys to move tools or turn valves, and 1/2/3 to select a lead or valve.

The gameplay interface now shows one goal, suit air, Help/Pause and nearby interaction. Camera reset and checkpoint retry are in Pause; detailed resources remain available in Tab. Jumping blends takeoff, rising, falling and landing poses.


## Drive and repair in the world

The four-wheel Luna Buggy and NASA SEV-based Ares Scout with six paired wheel modules (12 wheels) are parked left of the starting area. Press E nearby to climb in, W/S to drive, A/D to steer, Space to brake, then E to get out once stopped. Wheels and steering animate, buildings and rocks stop the vehicle, and exit placement checks for clear space. Mars has an enclosed cabin that replenishes suit air. Parked position and occupancy are saved; old saves remain supported. Vehicle handling is deliberately simplified for children, with no rollover or fuel penalty.

Repairs use a steady equipment camera and short instruction card. Drag plugs, trace clockwise circles on valve handles, brush only the outdoor Martian solar contacts, or move cartridges between the marked trays and slot. Escape cancels an unfinished task. Completed equipment remains visibly fixed. Tutorial repairs are free; normal repairs consume one spare part on completion. See docs/EXPEDITION_QA.md for verification.



## Gather surface supplies

Press G for needed supplies, or choose a type on M. Six finite sites span all four quadrants, roughly 68–112 metres from the outpost origin, with smaller rewards: 34 water, three parts and 38 power in total per map. Ice: hold E to drill, release to cool the hot tool, then release/hold E to pump purified water. Power: alternate discrete A and D crank strokes, then press E to unplug the charged pack. Salvage: W lifts the circuit cartridge above a real retaining lip, D slides it out, and S lowers it onto the recovery tray. Q cancels. Hands and machinery move in the world. Used sites stay empty across saves; existing collected IDs remain valid. Water supplies electrolysis and crops; power runs life support, lighting, radio and projects; spare parts fund repairs, backup, rescues, shielding and construction. Food comes from greenhouse harvest. Workshop upgrades shorten drilling and pumping.
Buggy clearance now follows the rotated chassis. Wheels roll over small surface gravel, including gravel on slopes; large boulders and buildings remain solid. Real obstructions show a reverse/steer hint. See docs/RESOURCE_DRIVING_QA.md for tests and limits.



## Recovery, research and construction

J opens the explorer journal: two robot rescues, four samples, research data, and earned patches per world. Repair a stranded robot with 1 part and 8% power, bring the buggy close, hitch with E, and tow it to the blue recovery pad. Stop to deliver it for 3 parts and 10% power. M can find a parked buggy. Samples earn research and stay recorded after research is spent.

U plans visible outpost projects; build them at the habitat fabricator. The Helios solar canopy boosts generation by 35%; recovery tanks improve active water recycling; the field workshop uses two research points and speeds collection/robot repairs. All consume real parts and power, with water also required for recovery tanks. Food shortages now affect crew health, while Junior Explorer keeps safety floors.

Service stances, collision-checked exits, and a 45-second repair cooldown prevent immediate repeat repairs and trapped task exits. Airlock walls, roof, floor and interlocked doors enclose its pressure cycle, which pauses safely in menus. The buggy checks actual nearby geometry rather than treating every bounding-box corner as solid.

High/Ultra add soft contact shading and improved shadow coverage. Local 2K color and 1K normal/roughness maps, smoother rocks, denser terrain and revised exposure improve surface detail; Low/Medium retain simpler rendering. The material is Earth-analog CC0 artwork, not planetary scan data. See docs/EXPANSION_QA.md for the 66 checks, live playtests and remaining production limits.


## Challenge audit and browser performance pass

The full official Details page is now mapped in docs/CHALLENGE_REQUIREMENTS.md. Radio Earth in Tab spends 5% battery and delays its simulated advice: 3 game seconds on the Moon, 24 on Mars. Menus pause the wait; close them to continue. Requests survive saving/reloading. Accept the suggested power plan or keep your own. Source science distinguishes real signal delay and the deliberately shortened play timing. Shelter reinforcement spends one part and 6% power.

The Moon landmark now uses NASA/Michael D. Carbajal's Apollo Lunar Module, optimized to 61,525 triangles and a 1.40 MB local GLB with 1024px-or-smaller textures. Vehicles add suspension coils, radiator grilles, service panels and detailed wheel hubs. Fixed scenery is batched by material. Large rocks retain detailed surfaces while small stones use simpler instanced geometry. Ground vertices concentrate around the playable outpost; the school terrain uses 135,200 triangles versus 352,800 on High. Physics ground does not change when presets change. Tests check rendered ground at activity sites against physical height.

The final regression suite has 77 tests. Manual sessions cover complete Moon tutorial, first-run/replay skip, extraction, driving, airlocks, radio, save/continue and graphical presets. See docs/CHALLENGE_QA.md for exact coverage and limits. There is no guarantee of a particular frame rate on an untested school machine, and this remains a browser prototype rather than a finished AAA production.


## Detailed equipment and ballistic movement — 3 November update

The playable habitat retains its rooms and interlocked airlock, with beveled pressure panels, portholes, locks, ribs and photographic metal surfaces. The sealed NASA HDU annex has been removed. Build the Crew recovery room at the fabricator to open an east-side doorway into a furnished, pressurized room. The lunar buggy is rebuilt with mesh tires, suspension, two seats, lenses, clasps and tubing. The Mars rover uses a locally optimized NASA SEV concept model with separately animated wheel modules. Repair housings have flanges, vents, pressure gauges, pleated cartridges and looping cable routes.

Jumping preserves horizontal takeoff momentum when keys are released or the camera turns; ground friction returns at landing. Current movement uses game-tuned assisted gravity: 5 m/s² on the Moon and 7.5 m/s² on Mars, with a 3.7 m/s launch speed and gentle air steering. Scientific fact panels retain natural gravity. Trajectories use exact per-step ballistic displacement. Suited jump impulse, vehicle suspension and handling remain educational approximations.

The School computer preset automatically limits rendering to roughly one million internal pixels, 1024 shadows, no screen-space AO or MSAA and a 60 FPS cap. Static panels, station frames and lunar vehicle parts batch by material; industrial textures share GPU allocations and model textures are at most 1024px. See docs/DETAIL_UPGRADE_QA.md for validation and remaining limits.


## Walk-in recovery room, survey map and browser performance

At the fabricator, build **Crew recovery room** for 3 spare parts, 18% power and one research earned from a sample. Select **Visit recovery room** to follow its trail through the east-side doorway. Its cot, scanner, cabinets and recovery equipment have a purpose: resting inside restores health and suit air while consuming a little food and power. Treatment stops when reserves are full. The sealed NASA HDU exterior and utility neck are no longer rendered or loaded.

Hydroponics servicing now immediately restores up to 8% water, 12% food and 25% crop progress, and enables irrigation. Filter replacement restores up to 18% oxygen, 20% suit air and 4% health while lowering CO₂. Solar repair restores up to 12% battery and generation. Each task consumes a spare part, retains its 45-second cooldown, and reports actual capped gains. These reserve increases are deliberately simplified gameplay rewards.

The solar wiring board has ordered left leads and a different order of matching symbols/colours on the right: no matching pair is directly opposite. Wrong sockets reject the wire. The map now plots every finite water, battery and salvage site, with exact-site navigation, distance, yield and depleted status. Water remains buried until drilled; battery packs require charging at field dynamos.

The former ±97 m driving and ±100 m walking fences are removed. A bounded set of outer terrain tiles follows exploration beyond the original terrain. Saves accept valid distant positions. Small and medium surface rocks (up to about 2.2 m full bounding height and 4.2 m width/depth) are traversable; the buggy rides a rounded wheel-support envelope, tilts and articulates its wheel groups. Larger boulders, walls and equipment stay solid. This is forgiving game handling, not a full vehicle solver.

School mode now creates a non-antialiased WebGL canvas, never allocates AO/post-processing buffers unless High or Ultra is selected, limits internal pixels, keeps the selected preset resolution stable, reduces small-rock counts and shadow work, and uses at most two nearby interior lights. Pause menus render at a low rate; hidden tabs stop drawing. Camera wall avoidance pulls closer without reversing the view. Indoor camera height clears the door lintels. The settings panel reports live draw calls/triangles and has a one-click School mode button. See **docs/RECOVERY_PERFORMANCE_QA.md** for tests and limitations.


## Earthbound, manual camera and frame pacing

The yellow trail remains; objectives, forward walking and buggy travel no longer steer the camera. Move the mouse freely while exploring. During any world activity, right-drag to orbit 360 degrees and scroll to zoom; left-drag operates repair hardware. Solar cables rest in separate short loops, with matching right-hand sockets still scrambled.

Each planet now has twelve finite gathering sites: four ice seams, four salvage locations and four battery generators spread out to remote terrain. Original depletion IDs remain compatible. A cache must fit before extraction starts so finite supplies are not silently wasted. The map includes every site and the rocket pad.

Open Outpost projects or the pause menu and choose **Earthbound**. Build three rocket sections at the indoor fabricator: six parts, 34% power, 24% water, 12% oxygen, 8% food and one sample research in total. Finish the five outpost missions, visit the pad, get out of the buggy and board. The fictional 36-second finale shows countdown, liftoff from your current world, stage separation and flight toward Earth using a locally bundled NASA globe texture. Flight can be paused and does not consume simulation resources. Arrival ends and saves the expedition; a saved assembled rocket can be launched after reloading.

The frame limiter now retains fractional refresh time; invisible source meshes are removed from the live scenery graph while preserving their frozen collision matrices. Batches retain every triangle, normal and UV seam and reuse indexed vertices. Graphics are precompiled before gameplay begins, hidden-tab timing resets on return, and automatic resolution degradation is removed. Local development diagnostics record CPU stages, optional GPU timing and recent gameplay windows to diagnostics/ without sending anything off this computer. See docs/FRAME_ROCKET_QA.md for actual measurements and remaining verification.

## Soundscape and smoother materials

Game audio now covers movement, tools, vehicles, habitats, radio, the crash and rocket flight. Use the header sound button or Settings to mute; Settings also includes a persistent volume control. Terrain uses softer distance-aware normal detail and blended texture scales, and painted metal has a more restrained finish. Medium adds lightweight edge smoothing while School/Low retain their rendering budgets. See docs/AUDIO_POLISH_QA.md for verification and limits.

## Campaign control recovery

Graphics warm-up now tolerates materials replaced during model loading and cannot hold movement, driving or repairs indefinitely. Resources wait for the world to be ready. Both five-objective Moon and Mars campaigns were replayed through their A-grade debriefs, including normal buggy controls and every campaign repair. See docs/CAMPAIGN_PLAYTHROUGH_QA.md for the reproduced fault, fixes and verification scope. Reload an older open game tab to receive updates; browser saves are retained.
