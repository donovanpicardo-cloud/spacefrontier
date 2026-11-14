# Science assumptions and provenance

| Value or principle | Units / classification | Source and simplification |
| --- | --- | --- |
| Moon gravity 1.62 | m/s²; rounded physical constant | NASA lunar context: https://science.nasa.gov/moon/facts/ ; game acceleration is applied to vertical velocity each render step |
| Mars gravity 3.71 | m/s²; rounded physical constant | NASA Mars context: https://science.nasa.gov/mars/facts/ ; same jump launch velocity exposes the different gravity |
| Neither environment is breathable | Physical environmental fact | Same NASA planetary references; spacesuit resources are finite outside |
| Oxygen production requires water and power | Engineering principle | https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/ ; simplified reservoir model rather than chemical mass flow |
| Water recovery reduces losses | Engineering principle | Same ECLSS reference; recovery is less than modeled total consumption |
| Resource capacities, consumption, growth, exposure, health effects | Simulated game balance; percent capacity and arbitrary exposure index | `src/simulation/engine.ts`; not observed NASA data, not medical forecasts |
| Short day/night and event schedules | Accelerated authored simulation | Not actual lunar day lengths, Mars sols or historical space weather |
| Initial cabin pressure 101 | kPa; illustrative near-Earth cabin target | Game parameter, independent from stored oxygen percentage |

NASA pages were consulted for qualitative environmental and life-support grounding. The full challenge Details tab was reviewed on 3 November 2026; its Resources tab is scheduled to open November 13. Source links are bundled in `src/data/science/sources.ts` and exposed in the menu. This project does not claim research-grade atmosphere, radiation transport, thermal or crop modeling.


## Archived solar event and communication

The in-game historical example is the NASA SDO X8.7 flare of 14 May 2024, peak 12:51 p.m. ET. Source: https://science.nasa.gov/blogs/solar-cycle-25/2024/05/14/strong-solar-flare-erupts-from-sun-15/ . This is a small static record, not a live feed. Flare strength is not converted into astronaut dose. The final campaign emergency is a fictional combined solar-risk/power-loss exercise; Mars dust and solar radiation are separate phenomena.

Moon radio round trip is about 2.6 seconds (about 1.3 seconds each way). NASA describes one-way Mars delays reaching 21–23 minutes, depending on trajectory. Game replies use 3 and 24 seconds respectively for an age-appropriate wait, explicitly shortened on Mars. https://www.nasa.gov/wp-content/uploads/2024/01/mars-communications-disruption-and-delay.pdf and https://science.nasa.gov/wp-content/uploads/2023/05/188_fed0ad8278e728107533d509b24dc68b_SmithsimmonsDrew.pdf . Advice is simulated locally, not sent to NASA.


## Jump motion

Planet fact panels retain natural gravity: Moon 1.62 m/s² and Mars 3.71 m/s². Following the requested space-game movement change, the controller uses assisted game-feel values: effective downward acceleration 5 / 7.5 m/s², launch speed 3.7 m/s, and gentle in-air directional acceleration. Releasing controls preserves momentum. These jump trajectories are gameplay approximations, not a reproduction of unassisted astronaut motion. Hydroponics/filtration repair reserve bonuses, medical-room treatment and forgiving boulder suspension are also deliberate educational game abstractions.
