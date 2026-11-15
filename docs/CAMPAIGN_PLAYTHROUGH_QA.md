# Campaign playthrough and control-lock recovery

The local browser playthrough uses the actual React game, normal keyboard/pointer interactions, model assets, resource simulation and mission progression. An ignored local overlay observes positions, inputs, collisions and warm-up state. It does not teleport the astronaut, complete repairs or advance mission state. Local diagnostic bundles are excluded from publication.

## Reproduced control lock

Three.js `compileAsync()` can throw from a later timer when a material is replaced/disposed during model loading. Its promise then remains unresolved. The world retains `warming = true`, so its render/update loop exits before walking, driving, airlocks and repairs. The independent React resource interval previously continued consuming reserves. This was reproduced during save/resume, including the `isReady` console exception and a permanently frozen player with no collision blockers.

Warm-up now polls safely, tolerates replaced GPU programs, cancels disposed/superseded worlds and has a two-second bound. Resource consumption waits until the world is available and no longer warming. Tests cover disposal between polls, cancellation, a driver that never becomes ready, readiness exceptions, and the simulation readiness gate.

The open production browser tab was also confirmed to be running `/assets/index-BQujMSTT.js`, an older release predating the audio and latest control fixes. Reloading is needed to replace an already-running client; saves remain in local storage.

## Moon campaign

- Normal crash playback and handoff; sprinting to the buggy; E boarding, forward driving, steering, braking and E exit.
- Contact with the wreck produces a named collision hint; reverse/steer escapes it. A route around the wreck remains usable.
- Entered/exited the airlock normally and completed the first objective.
- Connected all three lunar power leads by dragging each to its matching symbol/colour.
- Turned both water-loop valves using keyboard alternatives; grow lights and irrigation advanced the third objective.
- Sent a radio request and observed the reply while travelling.
- Removed the used filter to the left tray and installed the clean one by dragging.
- Disabled grow lights, enabled emergency backup, reinforced shelter and survived the emergency.
- Debrief: A grade, 5/5 objectives, 100% crew health, 87% water, 38% battery.

An already protected shelter still displayed the purchase prompt. Its prompt and interaction now clearly acknowledge active protection; the existing guard against repeat spending is preserved.

## Mars campaign

- Played the crash and normal E boarding, drove forward and reversed the pressurized Ares Scout, braked and exited.
- Entered the habitat, saved, reloaded and resumed. The saved mission and parked vehicle position survived; warm-up finished and controls remained responsive.
- Cleared all 12 dust patches by brushing, confirmed a wrong socket rejects its lead, then connected both correct power leads.
- Cancelled an unfinished water-loop repair without spending a part, resumed it, and turned the 180° supply and 270° return valves by pointer dragging.
- Replaced both filter cartridges by dragging and configured emergency power, lights and shelter for the dust storm.
- Debrief: A grade, 5/5 objectives, 100% crew health, 86% water, 35% battery.

The main campaign checks above do not claim exhaustive coverage of every optional gathering site, research project or return-rocket expedition. The visible scenes and physics were exercised in the current browser; this is not a guarantee of frame rate on other computers.

