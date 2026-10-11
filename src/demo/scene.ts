import { AsteroidMesh, CreateStarfield, rng } from '@n3rdw1z4rd/core';
import type { World } from '@n3rdw1z4rd/engine';
import { AmbientLight, BoxGeometry, DirectionalLight, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, type PointsMaterial } from 'three';
import { Bob, LookAt, Spin, Tag } from './scripts';

// Workaround for @n3rdw1z4rd/core 0.18.4: AsteroidMesh passes `rng.nextFloat`
// unbound to createNoise3D, so `this` is undefined and construction throws.
// Remove once core binds it (`() => rng.nextFloat()`).
rng.nextFloat = rng.nextFloat.bind(rng);

/** A small scene that exercises the engine: core prefabs, scripts, fields, attachments. */
export function buildDemoScene(world: World): void {
    rng.seed = 7;

    const sun = new DirectionalLight(0xffffff, 2.2);
    sun.name = 'Sun';
    sun.position.set(5, 8, 6);
    world.add(sun);

    const ambient = new AmbientLight(0x8899aa, 0.6);
    ambient.name = 'Ambient';
    world.add(ambient);

    const stars = CreateStarfield(300, 2500, 0xffffff);
    (stars.material as PointsMaterial).size = 1.2;
    world.add(stars);

    // Planet: a core prefab with a Spin script.
    const planet = new AsteroidMesh({ radius: 1.4, detail: 4, displacement: 0.12, noiseScale: 1.4, secondaryNoise: true, color: 0x9a8f86 });
    planet.name = 'Planet';
    world.add(planet, new Spin(), new Tag('home world'));

    // Orbit: moons attached to a spinning pivot, so they orbit via Three's scene graph.
    const pivot = new Group();
    pivot.name = 'Moon Orbit';
    world.add(pivot, Object.assign(new Spin(), { speed: 0.8 }));

    const moon = new AsteroidMesh({ radius: 0.32, detail: 2, displacement: 0.2, color: 0xc9c2b8 });
    moon.name = 'Moon';
    moon.position.set(3, 0.4, 0);
    world.add(moon, Object.assign(new Spin(), { speed: 2, tilt: true }));
    world.attach(moon, pivot);

    const pebble = new AsteroidMesh({ radius: 0.14, detail: 1, displacement: 0.25, color: 0x8a7f74 });
    pebble.name = 'Pebble';
    pebble.position.set(3.6, 0.6, 0.3);
    world.add(pebble);
    world.attach(pebble, moon); // nested attachment: orbits the moon while the moon orbits the planet

    const beacon = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshStandardMaterial({ color: 0x3fd1a4, roughness: 0.4 }));
    beacon.name = 'Beacon';
    beacon.position.set(-2.8, 1.2, 1.2);
    world.add(beacon, new Bob());

    // The game's own camera. The editor uses it in Play; edit mode has its own camera.
    const camera = new PerspectiveCamera(55, 1, 0.1, 1000);
    camera.name = 'Main Camera';
    camera.position.set(0, 2.5, 8);
    world.add(camera, Object.assign(new LookAt(), { target: planet }));
}
