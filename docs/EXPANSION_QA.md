# Recovery, research, construction and servicing expansion

## Implemented loop

Each world has two stranded robots and four research samples. Repair a robot's tow connector by holding E nearby (1 spare part and 8% power), park the buggy close, and press E to hitch it. The real robot follows behind a visible tow cable. Towing limits speed to 4 m/s and checks the cart's path. Stop on the recovery pad to deliver it once, earning 3 parts and 10% power. Returned robots move to the service area rather than appearing inside the buggy. J tracks rescues, samples, research and four earned patches; M can guide players back to their parked buggy.

Samples are recorded once and grant one research point. The field workshop spends two points while retaining the sample records. New games reset campaign progress; saves and tutorial return snapshots retain it.

U opens project planning; actual construction requires the fabricator inside the habitat. Projects are built once and consume real reserves:

| Project | Cost | Visible and simulated effect |
|---|---|---|
| Helios solar wing | 2 parts, 12% power | New exterior solar canopy; solar generation multiplied by 1.35 |
| Water recovery module | 2 parts, 10% power, 8% water | Exterior tanks; enabled water recovery increases from .025 to .045 units/tick |
| Field workshop | 3 parts, 15% power, 2 research | Exterior robot-service gantry; supply collection and connector repairs take 2 rather than 3 seconds |

Water supports oxygen production and plants as well as construction. Parts support equipment repairs, robot repairs, backup power and construction. Power supports habitat systems, robot repairs and construction. Samples support research, upgrades and explorer patches. Harvested food affects crew health if reserves become critically low. Junior Explorer retains safety floors.

## Sticking and false-collision fixes

- Precise vehicle/triangle intersection follows the visible geometry after a broad chassis check. It no longer fills empty space in diagonal beam or hollow-object bounding boxes. Closed-solid containment checks recover vehicles saved entirely inside a large boulder. Partial dishes remain open geometry. Built module meshes use the same precise check; moving doors and robots use current positions.
- Solar servicing was physically too close to a tilted array. The console, station target and cabinet moved into clear space. The greenhouse work panel also moved away from the table edge. Repair panels have visible support pedestals.
- Movable plugs, brushes and cartridges no longer remain in the static scenery collision map. Structural panels and housings remain solid.
- Repair entry selects a clear stance. The camera uses the astronaut's actual standing location. Completion/cancellation uses a collision-checked short exit path, including sideways movement where a work-zone partition blocks a step back. Exit recovery is applied only on exit, not on entry. Inputs and vertical velocity are released appropriately.
- Repairs have a saved 45-second gameplay cooldown. Airlocks have a 3-second post-cycle cooldown; pressure animation itself prevents reentry. Menus pause the cooldown clock. Finite samples, rescue rewards and supply sites cannot be repeated for duplicate rewards.
- Airlock now has solid side walls, a roof, floor and interior detailing. Progress follows the actual pressure cycle rather than an independent wall-clock timer. Doors are interlocked. Pausing preserves the current phase; saving during transit stores the safe starting position.

## Graphics

Smoother rock geometry, denser terrain, revised exposure and ambient lighting, tighter player-following shadow coverage, lower shadow bias, contact shading on High/Ultra, a vehicle contact shadow, and multisampled HDR postprocessing improve the existing renderer. New local photographic color, normal and roughness maps add fine surface detail. Moon rendering neutralizes the terrain color; Mars retains the warm material. These are Earth-analog art assets, not NASA surface scans. No texture displacement changes collision geometry.

Terrain material: Terrain Red 01, Rob Tuytel / Poly Haven, CC0. Source and checksums: public/materials/sources.json. The assets load locally; generated regolith remains a fallback.

## Checks actually performed

- 66 tests across seven files, including the existing simulation, tutorial, repair and gathering tests.
- New checks: research/cost accounting, one-time rescue rewards, construction effects, save validation with towing/cooldowns/projects, diagonal and hollow geometry, closed-solid containment, dynamic module geometry, exact solar service clearance, and clear stances plus collision-free exit paths at every workstation on both worlds.
- Airlock geometry, center clearance, solid walls and door interlocks tested without a renderer. Scene tests tow a real robot, deliver it once and place it clear of the buggy.
- Browser: completed a full lunar robot repair → buggy approach → hitch → tow → recovery delivery. The journal recorded 1/2 returned robots and the reward was charged/granted once.
- Browser: collected two samples; verified First Discovery, spent research at the fabricator, constructed all three projects and earned Outpost Engineer. Reopened the save and confirmed projects, samples, research spending and rescue progress persisted.
- Browser: entered and exited the enclosed airlock; paused while both doors were sealed, resumed the same pressure phase, and completed the exit normally.
- Browser: completed all three physical solar cable connections after relocating the console. A retry showed the settling cooldown. Walking away reduced the next-waypoint distance from 10 m to 7 m rather than trapping the astronaut.
- Local photographic materials rendered without browser console errors on the Moon. Asset downloads were verified against official MD5 manifests.
- Production build includes TypeScript checks. Vite retains its existing Three.js chunk-size advisory.

## Limits

This is a substantially expanded stylized browser game, not a claim of AAA production quality. The robots and vehicles are authored procedural models, towing is a simplified rigid connection, and the astronaut uses source walk/run clips plus authored poses and hand reach. The full Mars campaign and every terrain boundary have not been manually replayed in this pass; shared planet parameters and repair stances/exits are covered by tests. School hardware, mobile/controller input, extended sessions and cross-browser performance require broader verification.
