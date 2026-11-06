# Asset credits and provenance

## Primary astronaut

- Asset: Astronaut in Spacesuit, rigged variant, published by Grab3D.
- Source: https://grab3d.com/models/characters/astronaut-in-spacesuit/
- Download: https://grab3d.com/dl/astronaut-in-spacesuit-rigged/astronaut-in-spacesuit-rigged.glb
- License: CC0 1.0. Source page and supplied LICENSE.txt checked on 2026-11-02.
- Source license: https://grab3d.com/dl/astronaut-in-spacesuit/LICENSE.txt
- The publisher discloses AI-assisted creation with Meshy followed by Blender cleanup. This is a third-party asset, not a NASA scan or official NASA suit model.
- Local distribution: public/models/astronaut.glb, LICENSE.txt, source-manifest.json. No runtime hotlinking or account required.
- Modifications: simplified from 300,000 to 65,998 triangles; embedded textures resized to 1024 pixels and converted to WebP; duplicate data removed. Source file approximately 14 MB; local optimized file approximately 3.4 MB.
- Runtime: scaled to 2.05 m and rotated for the existing controller. Source walk/run clips crossfade with authored idle, airborne, landing and service poses. These authored poses are not motion capture or full hand/foot IK.
- Attribution is not required by CC0. Credit is provided in the game and here as provenance.

The original procedural character remains available only as a loading/error fallback. Quaternius candidates were evaluated and rejected; their files are not distributed in the upgraded game.

## Environment and interface

Terrain, material maps, outpost detailing, lander, guidance trail, interface and original fallback suit are authored within this project. Optional Google Fonts and package dependencies retain their existing licenses. No paid assets, accounts or external API keys are required.


## Photographic terrain material

Terrain Red 01 by Rob Tuytel / Poly Haven: https://polyhaven.com/a/terrain_red_01 . CC0 license: https://polyhaven.com/license . Local files are public/materials/terrain_red_01_color.jpg (2K), normal.jpg and roughness.jpg (1K); exact filenames, source URLs and verified MD5 values are in public/materials/sources.json. The Moon uses a neutral shader treatment; Mars retains the source palette. These Earth-analog textures are art assets, not NASA observations. Procedural regolith is retained as a fallback. Source images are unchanged.


## NASA Apollo Lunar Module

Source: NASA / Michael D. Carbajal, https://science.nasa.gov/3d-resources/apollo-lunar-module/ . Original asset https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/apollo-lunar-module/Apollo%20Lunar%20Module.glb . Used for educational simulation under NASA's media guidelines https://www.nasa.gov/nasa-brand-center/images-and-media/ ; NASA acknowledgement does not imply endorsement. Optimized locally from 97,588 to 61,525 triangles, WebP textures up to 1024px, Draco removed to avoid an extra browser decoder. Local file 1,398,700 bytes. Moon historical landmark, not a claimed Artemis vehicle. The lunar buggy remains an authored interpretation. The Mars rover now adapts the NASA SEV concept below.


## NASA habitat and crew-rover concepts

Habitat Demonstration Unit: NASA / LaRC / Advanced Concepts Lab, https://science.nasa.gov/3d-resources/habitat-demonstration-unit/ . Optimized from 516,748 to 103,576 bytes, 2,264 triangles, textures up to 1024px in WebP. Retired from the active scene in the recovery-room update; the game no longer loads this annex.

Space Exploration Vehicle: NASA / LaRC / Advanced Concepts Lab, https://science.nasa.gov/3d-resources/space-exploration-vehicle/ . Educational adaptation as the Mars Ares Scout; this is a concept vehicle, not a claim of a deployed Mars rover. Source 22,431,576 bytes and 413,198 triangles; game asset 4,609,336 bytes and 83,713 triangles, 1024px WebP textures, with six separately animated paired wheel modules. Draco removed to avoid a separate runtime decoder.

The NASA assets are credited with NASA acknowledgement under https://www.nasa.gov/nasa-brand-center/images-and-media/ ; no endorsement is implied. Exact local hashes and source URLs are in public/models/nasa-detail-sources.json.

## Photographic industrial surfaces

Metal Plate and Blue Metal Plate from Poly Haven: https://polyhaven.com/a/metal_plate and https://polyhaven.com/a/blue_metal_plate . CC0: https://polyhaven.com/license . The six local 1K JPEGs include color, normal and roughness maps; download URLs and verified MD5 values are in public/materials/industrial-sources.json. Source images are unchanged; shaders tint their wear to suit the outpost. Authored 3D geometry includes the lunar buggy, playable habitat facade, service machinery and gathering rigs.


## Current habitat interior and recovery-room upgrade

The new walk-in recovery room and interior furniture are authored 3D geometry: padded fabric chairs, quilted bunk coverings, keyboards, galley faucet and sink, medical scanner/cot, drawers, grilles and fixtures. Fabric weave is a small authored canvas material; metal surfaces use the already credited Poly Haven CC0 maps. No additional remote runtime assets or paid model licenses are required. Shared materials and batched fixed geometry keep these details inexpensive. The old HDU model is no longer requested by the game.


## Return-to-Earth globe and spacecraft

Earth texture: NASA Earth Observatory / Reto Stöckli, Blue Marble: Next Generation, January 2004 global base map. Source https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/ ; original JPEG https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.200401.3x5400x2700.jpg . Locally resized from 5400×2700 to 2048×1024, JPEG quality 85 (259,608 bytes), in public/materials/earth-nasa.jpg. Attribution: NASA Earth Observatory. NASA acknowledgement does not imply endorsement. The rocket, pad, atmospheric rim shader and staged flight sequence are authored game artwork; the spacecraft, fuel processor and compressed trajectory are fictional.

Surface photographs are served locally. The Mars plate uses [PIA23727, Perseverance Mastcam-Z panorama](https://images.nasa.gov/details/PIA23727), NASA/JPL-Caltech/MSSS/ASU. The lunar plate uses [AS17-134-20476, Eugene Cernan beside the rover](https://images.nasa.gov/details/as17-134-20476), NASA.

Arrival uses the [NASA/JPL Mars globe](https://science.nasa.gov/resource/planet-mars-3d-model/) with its embedded normal map and [NASA SVS lunar color and displacement maps](https://svs.gsfc.nasa.gov/4720/) derived from LRO observations. The fictional crash uses the [Apollo Lunar Module](https://science.nasa.gov/3d-resources/apollo-lunar-module/) on the Moon and the [NASA/JPL-Caltech InSight lander](https://science.nasa.gov/resource/insight-3d-model/) on Mars. InSight is optimized from 22.36 MB to 10.44 MB with lossless Meshopt geometry compression, shared duplicate textures and lossless WebP textures resized to at most 1024px. All vertex attributes, triangle topology/winding, names, hierarchy and transforms are verified unchanged after decoding; the breakaway assemblies remain intact. Reproduce with `npm run optimize:insight -- path/to/original-insight.glb`; see `public/models/insight-optimization.json` for its checksum.
