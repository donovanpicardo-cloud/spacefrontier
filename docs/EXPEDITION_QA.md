# In-world repairs and destination vehicles

## Behavior

- Repair controls are actual Three.js equipment at the outpost. No popup puzzle remains in the runtime. The astronaut approaches the board; hands reach toward the moved plug, valve, brush or cartridge using two-bone IK. A small instruction/progress card replaces the objective during servicing.
- Moon power uses three symbol-matched cables. Mars requires clearing twelve red dust patches before connecting two leads.
- Moon irrigation opens a single valve through 240 degrees. Mars requires both supply (180) and return (270) valves.
- Moon life support uses a brush-cleaned filter. Mars requires removing the dirty cartridge to the left tray, then inserting a clean cartridge from the right tray.
- The open four-wheel Luna Buggy and enclosed six-wheel Ares Scout have separate geometry and speed limits (8 and 6 m/s). WASD driving, Space braking, E boarding/exiting, visible driver and steering/wheel animation, scenery collision and clear-space exits are included. Pressurized Mars cabin recharges suit air.
- Saves retain parked position, heading and occupancy; vehicles resume stopped. Legacy saves get a vehicle. Parking recovery handles scenery overlapping an old saved location. New games choose a clear parking location.

## Automated verification

`npm test`: 44 tests, including prior simulation, tutorial, collision, save and jump checks, plus:

- Projected pointer rays grab and connect all three actual 3D cable meshes, circle a real valve, and sweep the filter. Completion callbacks fire only after each action is complete.
- Mars brush prerequisite transitions to wiring; both valves are required; dirty and clean cartridges follow separate removal/insertion stages.
- Cancel and completed-equipment restoration.
- Hand IK reaches a target without stretching the arm segments, including under a rotated parent.
- Vehicle acceleration, steering, reverse, braking, thin-obstacle substeps, world bounds, four/six-wheel geometry, boarding, moving-exit refusal, blocked-exit refusal and safe placement.
- Legacy/parked/occupied saves and malformed vehicle data; blocked spawn/save parking recovery.

`npm run build` runs TypeScript and the production build. The existing Three.js bundle remains over Vite's recommended 500 kB warning threshold.

## Browser verification

- Entered the lunar buggy, drove it, and exited after stopping. Parked vehicle blocked on-foot movement as expected.
- Entered and exited the airlock with the new vehicle system active.
- Reached the lunar power station; dragged the real cables into their sockets; the mission advanced. Adjusted camera/standing position after finding a solar-panel obstruction. Verified connected cables and reachable sockets in the 3D scene.
- Launched Mars, boarded the visibly different Scout, restored occupied state after a reload, drove and exited. Found an initially obstructed parking position during this check; added clear-parking recovery and verified the recovered vehicle moved.
- Checked the Mars cabin and seated astronaut from a side view. Vehicle controls remain visible while driving.
- In the installed original project, directly dragged both Mars water valves clockwise on the habitat equipment; the repair completed and returned to exploration. Captured the hands reaching the valve in the world.

## Remaining verification limits

The full Mars campaign and the life-support repair camera have not been manually replayed end to end in this update. Their interaction/completion paths are covered by automated 3D equipment checks. Long driving sessions, all terrain slopes, mobile/controller input and performance across devices remain unverified. Driving and hand-reach animation are authored game approximations, not a physics or motion-capture simulation.

