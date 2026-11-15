# Soundscape and material polish

Original Web Audio music and effects cover footsteps, jumping, landing, Mars wind, habitat ventilation, buggy motors, tools, airlocks, low-air warnings, radio, service rewards, the crash and rocket flight. Sound starts after a pointer or keyboard gesture. Mute and volume persist locally. Hidden tabs suspend audio. Paused gameplay fades movement and machinery while retaining quiet background music. Moon exterior effects represent vibrations heard through the suit and cinematic sound design.

Native browser checks at 65% volume measured nonzero footsteps (RMS 0.0080), impact (0.0498) and motor (0.0135). Muted output measured exactly zero. Hiding suspended the audio context; returning restored running state. Eight ambient voices are reused, and one-shot nodes disconnect after playback. These signal checks do not guarantee perceived loudness on every device.

Automated tests cover footstep cadence at 30/60/144 Hz, no footsteps while airborne/driving/paused, jump and landing transitions, exact crash and rocket cue boundaries, replay, pause, airlocks and rate-limited warnings. Existing gameplay tests remain required.

Material changes retain terrain heights and collisions: trilinear filtering, anisotropic sampling, gentler normal detail with distance fading, blended terrain scales, and restrained painted-metal shading. Medium uses lightweight FXAA; School/Low keep direct rendering and existing pixel budgets. High/Ultra keep their MSAA/AO path. Browser checks cover Moon and Mars loading, shader errors, and persistent audio controls. Cross-device listening and GPU profiling remain limited to the current browser.

