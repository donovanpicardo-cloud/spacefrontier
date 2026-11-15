# Official challenge audit — FRONTIER

Reviewed 3 November 2026 against the complete rendered Details tab:
https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/?tab=details

The official Resources tab currently says resources will be available Friday, November 13. No dataset list is currently published there. Recheck it before submission. The page also asks participants to wait until the hackathon begins before project work; confirm the eligibility of this existing project with the event organisers before entering it.

## Core objective mapping

| Brief topic | Working implementation and evidence |
| --- | --- |
| Ages 7–12 | Junior Explorer mode, one objective at a time, large prompts, optional spoken lessons, safe retries. Eight-year-old usability still needs a supervised child playtest. |
| Interactive outpost | Explorable Moon and Mars, habitat, service equipment, two drivable vehicles. |
| Life support | Oxygen production spends water and power; CO2, cabin integrity and suit air have consequences. |
| Radiation shielding | Shelter reduces the illustrative exposure index. Reinforcement costs 1 part and 6% battery; emergency backup consumes parts. |
| Power budgeting | Toggle oxygen, grow lights, recovery and backup; see the resulting battery trend. Solar repair, solar expansion and charged field packs affect reserves. |
| Food production | Repair irrigation, spend water and electrical power, grow crops over time and harvest food. Low food affects crew health. |
| Communication delay | Radio Earth costs 5% battery. Simulated replies take 3 seconds on the Moon and 24 on Mars while resources continue changing. Apply advice or retain the local plan. Actual propagation and deliberately shortened play timings are explained. Pending messages save locally. |
| Mission consequences | Five connected goals, changing reserves, environmental emergency, success debrief, Specialist failure and Junior recovery. |
| Meaningful trade-offs | Sheltering spends parts/power; lights stop crop growth when disabled; oxygen competes with other loads for water and electricity. Research/construction and robot rescues have real costs. |
| Working prototype | Browser game, local save/continue, no account or runtime NASA API key. |

## Encouraged and optional considerations

- NASA grounding: in-game source links for gravity and ECLSS; a real historical NASA SDO flare record (14 May 2024, X8.7, peak 12:51 p.m. ET) is bundled and explicitly identified as an archive. Radio timing cites NASA's Moon-to-Mars communications analysis. The historical flare inspires the shelter lesson; it does not calculate astronaut dose.
- Dataset scope: no live DONKI feed, OSDR integration or measured terrain elevation is claimed. These are encouraged examples rather than mandatory integrations. A single curated event is a small provenance example, not a substantial scientific dataset. Event-specific datasets must be reconsidered when the Resources tab opens.
- Accessibility: main exploration shows suit air and one objective; advanced reserves are in the dashboard. Captions and optional narration, repeated hints, visible tutorial cursor, K skip and replay/reset are included. Keyboard and mouse are supported; touch/gamepad input and screen-reader navigation of the 3D world are not complete.
- Replay: two worlds, Junior/Specialist choices, alternate field missions and multiple construction/gathering routes. Campaign emergency timing remains authored rather than procedurally varied.
- Traceability: SCIENCE.md, ASSET_CREDITS.md, this mapping and in-game Science links distinguish observed facts, model provenance and invented balance values.
- Presentation: include a short demonstration of switching a load off, observing its consequence, waiting for Earth, and paying for shelter. Submission video/slides and an event-hosted judging URL are not created automatically.

## Honest scope

This is a significantly expanded browser prototype, not a production AAA game. Real hardware and child testing are still needed. The published brief's core systems have implementations; this audit is not an official judging or eligibility determination. No future resources, unpublished rubric or tutorial video transcript is represented as reviewed.

## Earthbound and final frame-performance pass

See FRAME_ROCKET_QA.md for the current 116-test validation, source-preserving scene optimization, manual camera, expanded finite supplies and return-to-Earth ending. The return flight is authored fiction with a NASA Earth Observatory globe, not a required real-flight simulation or a NASA mission claim. The earlier challenge mapping and its remaining child/hardware testing and unpublished-resources limitations still apply.

