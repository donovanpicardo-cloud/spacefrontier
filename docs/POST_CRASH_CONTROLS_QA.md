# Post-crash movement fixes

Sprint accepts left or right Shift and reconciles the browser's modifier state on key events. Holding Shift through loading or a focus change no longer requires releasing and pressing it again. Releasing Shift or receiving an unshifted movement event restores walking.

The wreck previously registered one enclosing collision box with stale pre-lift matrices. It could block empty space on the buggy's departure route. Collision now uses each hull mesh at its final resting transform, with triangle checks for the vehicle. The buggy also checks for a clear initial departure heading when it resets. Solid hull geometry remains collidable.

Regression tests cover both Shift keys, release, held modifiers after input clearing, missed releases, final-pose collision transforms, separated hull bounds and driving away from an obstructed parking heading.

A local browser harness loaded the actual crash assets and full world, advanced the crash, boarded the buggy and exercised the normal update loop at 60 simulation steps per second. On the Moon, walking settled at 2.1 m/s; left/right Shift and held-Shift recovery each settled at 4.5 m/s. The buggy travelled 16.96 m in three simulated seconds and reached 8 m/s. The prior build stopped after 3.95 m with a solid-obstacle hint. These are deterministic scene checks, not device frame-rate claims.

Mars likewise reached 2.1 m/s walking and 4.5 m/s for all three sprint cases. Its buggy travelled 14.05 m in three simulated seconds and reached 6 m/s. Both scenes reported clear parking and no browser console errors in this run.

