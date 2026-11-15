# Challenge and browser QA — 3 November 2026

## Verification

- 77 tests across 8 files pass; TypeScript and the production Vite build pass. Vite retains its informational Three.js chunk-size advisory.
- Source-wide compiler validation plus focused review of simulation conservation, save validation, camera/input, task cleanup, static/dynamic collisions, terrain, vehicle entry/exit, tutorial state, airlock interlocking, towing, research and construction. This is not a claim that every possible bug has been eliminated.
- New tests check every resource activity requires alignment and three separate actions, prevents a continuously held tool completing subsequent steps, applies rewards once and restores depletion. Actual scene-tool integration is also exercised.
- Safe exit tests cover 16 parking angles on each planet, as well as obstructed exits. Dynamic equipment is included in exit checks.
- Ground tests compare rendered school-preset terrain with physical ground at all resource, sample and rescue sites on both worlds (under 0.25 m difference). School terrain has 135,200 triangles; High has 352,800. Ground physics is unchanged by quality selection.
- Static scenery batching is tested to reduce rendering objects while retaining original collision volumes. Existing tests cover exact chassis geometry, open torus holes, angled beams, closed-volume recovery, all workstations on both planets, tow delivery and airlock interlocking.
- Save tests include legacy saves, invalid state, duplicate objectives, pending radio messages, future request times, research, upgrades, cooldowns and towing.

## Browser sessions actually played

1. Moon: complete first-time tutorial, including move/look/reset, quick-tap jump and landing, trail navigation, all three real cable drags, enclosed airlock entry, objective/help/air explanations, and completion into a fresh mission. Resources reset to their proper starting values.
2. Tutorial: cursor unlocked at first launch and replay; clickable Skip works; K skips a first-run Mars lesson. Replay Skip restores the prior mission. No instructions require holding the mouse button to look.
3. Resources: completed solar recovery, all three buried-ice operations on Mars, and all three salvage operations on Mars. Cancelled salvage after the first clamp, walked away, restarted and earned the proper reward once. The ice cover visibly sinks to uncover the deposit; clamp and solar-wing mechanisms move in the world.
4. Driving: boarded, drove, steered, braked and exited both vehicle types. A Mars drive on the final starting lane reached 5.7 m/s without a collision hint. Real boulders and the habitat stopped the vehicle appropriately. Reversing allowed escape. Starting direction and nearby terrain now provide a clear first drive; sample/robot obstructions have clearer names.
5. Radio: sent Moon and Mars requests, waited during play, received advice, applied a plan, and observed the resend cooldown. A pending Moon reply saved at three seconds remaining survived reload/Continue, arrived during play and remained usable.
6. Graphics: rendered the local NASA Apollo asset and PBR terrain; switched High to School computer and back without console errors. A school-preset sample was around 59 FPS on this test environment (capped at 60); this is not evidence about an actual school computer.
7. Phase-one expansion checks also completed a robot connector repair, buggy hitch/tow/delivery, two samples and all three real-cost construction projects. Save/Continue retained them. Pausing an airlock with both doors sealed resumed the same phase. Completed repairs showed cooldowns and allowed walking away.

## Bugs corrected during this pass

- Tutorial captured the cursor, making Skip difficult to reach.
- Fast Space taps could disappear between render frames.
- Resource-stage text did not refresh at the exact stage boundary.
- Cancelled extraction could leave partially moved visual equipment behind.
- Diagonal vehicle bounds rejected otherwise safe exits; offsets and dynamic checks now prevent trapped exits.
- A starting rover route led into a sample station hidden by its cab. New vehicles face a clear, flattened departure lane.
- The Find buggy objective remained after boarding; it now clears.
- Shelter reinforcement had no direct resource cost; it now spends parts and power.
- Radio was missing as an engineering decision; delayed, power-costed advice is now implemented and saved.

## Limits and next checks

No physical school laptop, child participant, mobile/gamepad controls or browser matrix was available. The complete Mars campaign, all optional mission combinations and long-duration soak tests were not all replayed end-to-end in this final pass. Shared mechanics have regression coverage, and both worlds had live playtests. Scenarios remain authored, not random; no live NASA feed, research-grade radiation calculation, foot IK or full environmental audio is claimed. AAA production quality requires broader art, animation, audio and QA work.

The official Resources tab is scheduled for November 13; re-audit published materials then. The event banner asks participants not to start project work before the hackathon, so confirm entry eligibility for this existing project with organisers. These do not prevent continuing development locally.

Installed verification: the original project at port 5173 loaded its existing Moon save at Power the outpost, produced no browser warnings/errors, and was left safely paused. The temporary playtest tab was closed.
