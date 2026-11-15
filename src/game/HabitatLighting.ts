import * as T from "three";

// Keep the shader's point-light count constant across doors and room upgrades.
// The detailed fixtures are sources; only these reusable slots illuminate the scene.
export class HabitatLighting {
  readonly slots: T.PointLight[];
  private fixtures: { light: T.PointLight; position: T.Vector3 }[];
  constructor(scene: T.Scene, sources: T.PointLight[]) {
    sources.forEach((light) => {
      light.visible = false;
    });
    this.fixtures = sources.map((light) => ({
      light,
      position: light.getWorldPosition(new T.Vector3()),
    }));
    this.slots = Array.from({ length: 4 }, () => {
      const light = new T.PointLight(0xc3e9e5, 0, 8, 2);
      scene.add(light);
      return light;
    });
  }
  update(
    position: T.Vector3,
    inside: boolean,
    power: number,
    limit: number,
    dt: number,
  ) {
    const nearest = inside
      ? this.fixtures
          .filter(({ light, position: fixturePosition }) => {
            for (let parent = light.parent; parent; parent = parent.parent)
              if (!parent.visible) return false;
            return fixturePosition.distanceToSquared(position) < 18 * 18;
          })
          .sort(
            (a, b) =>
              a.position.distanceToSquared(position) -
              b.position.distanceToSquared(position),
          )
      : [];
    this.slots.forEach((slot, index) => {
      const fixture = index < limit ? nearest[index] : undefined;
      const source = fixture?.light;
      if (source && fixture) {
        slot.position.copy(fixture.position);
        slot.color.copy(source.color);
        slot.distance = source.distance;
        slot.decay = source.decay;
      }
      slot.intensity = T.MathUtils.damp(
        slot.intensity,
        source ? 8 + power * 0.24 : 0,
        8,
        dt,
      );
    });
  }
}

