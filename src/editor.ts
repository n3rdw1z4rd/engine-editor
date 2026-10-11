import { Engine, Script, getFields } from '@n3rdw1z4rd/engine';
import { BoxHelper, Camera, Euler, Object3D, PerspectiveCamera, Quaternion, Raycaster, Vector2, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { buildDemoScene } from './demo/scene';
import { gizmoMode, liveTick, playing, pushLog, sceneVersion, selection } from './state';

/**
 * Everything the editor does to the engine lives here; UI components only call
 * these functions and read signals. (Edits are direct for now — the command
 * stack for undo/redo is the next layer to add, see the architecture doc.)
 */

export let engine: Engine;
let editorCamera: PerspectiveCamera;
let orbit: OrbitControls;
let gizmo: TransformControls;
const selectionBox = new BoxHelper(new Object3D(), 0x3fd1a4);

export function mountEditor(container: HTMLElement): () => void {
    engine = new Engine({ container });
    const world = engine.world;
    const canvas = engine.renderer.domElement;

    // Editor camera: separate from any camera in the game.
    editorCamera = new PerspectiveCamera(55, 1, 0.05, 2000);
    editorCamera.position.set(5.5, 4, 8.5);
    engine.camera = editorCamera;

    // OrbitControls is pointer-event based: one finger orbits, two fingers pinch-zoom and pan.
    orbit = new OrbitControls(editorCamera, canvas);
    orbit.enableDamping = true;
    orbit.target.set(0, 0.3, 0);

    gizmo = new TransformControls(editorCamera, canvas);
    gizmo.size = matchMedia('(pointer: coarse)').matches ? 1.4 : 1; // bigger handles for fingers
    gizmo.addEventListener('dragging-changed', (e) => { orbit.enabled = !(e as unknown as { value: boolean }).value; });
    gizmo.addEventListener('objectChange', () => liveTick.value++);
    engine.overlay.add(gizmo.getHelper(), selectionBox);
    selectionBox.visible = false;

    gizmoMode.subscribe((m) => gizmo.setMode(m));
    selection.subscribe((obj) => {
        if (obj && !playing.peek()) gizmo.attach(obj);
        else gizmo.detach();
        selectionBox.visible = !!obj && !playing.peek();
        if (obj) selectionBox.setFromObject(obj);
    });
    playing.subscribe((p) => { selectionBox.visible = !p && !!selection.peek(); });

    world.onChange.subscribe((e) => {
        sceneVersion.value++;
        if (e.kind === 'object-removed' && selection.peek() === e.object) selection.value = null;
    });
    world.onScriptError.subscribe(({ object, script, phase, error }) => {
        pushLog('error', `${script.constructor.name}.${phase}() on "${object.name || object.type}" threw and was disabled — ${error instanceof Error ? error.message : String(error)}`);
    });

    bindPicking(canvas);

    let tickAcc = 0;
    engine.onFrame = (dt) => {
        if (orbit.enabled) orbit.update(dt);
        const sel = selection.peek();
        if (sel) selectionBox.setFromObject(sel);
        if (playing.peek() && (tickAcc += dt) > 0.1) {
            tickAcc = 0;
            liveTick.value++;
        }
    };

    buildDemoScene(world);
    engine.start();
    pushLog('log', 'Demo scene loaded. Tap an object to select it, then press Play.');

    return () => {
        orbit.dispose();
        gizmo.dispose();
        engine.dispose();
    };
}

/* ------------------------------------------------------------------ */
/* Picking: a tap (not a drag) selects the game object under the pointer */
/* ------------------------------------------------------------------ */

function bindPicking(canvas: HTMLCanvasElement): void {
    const raycaster = new Raycaster();
    raycaster.params.Points = { threshold: 0.05 };
    const ndc = new Vector2();
    const downs = new Map<number, { x: number; y: number; t: number; onGizmo: boolean }>();

    canvas.addEventListener('pointerdown', (e) => {
        downs.set(e.pointerId, { x: e.clientX, y: e.clientY, t: e.timeStamp, onGizmo: gizmo.axis !== null });
    });
    canvas.addEventListener('pointercancel', (e) => downs.delete(e.pointerId));
    canvas.addEventListener('pointerup', (e) => {
        const d = downs.get(e.pointerId);
        const multiTouch = downs.size > 1;
        downs.delete(e.pointerId);
        if (!d || d.onGizmo || multiTouch) return;
        if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || e.timeStamp - d.t > 400) return; // a drag, not a tap

        const rect = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        raycaster.setFromCamera(ndc, engine.camera!);
        const hits = raycaster.intersectObjects(engine.world.scene.children, true);
        const hit = hits.find((h) => h.object.type !== 'Points') ?? null; // the starfield shouldn't steal taps
        selection.value = engine.world.ownerOf(hit?.object ?? null);
    });
}

/* ------------------------------------------------------------------ */
/* Camera helpers                                                       */
/* ------------------------------------------------------------------ */

export function frameSelection(): void {
    const obj = selection.peek();
    if (!obj) return;
    const center = obj.getWorldPosition(new Vector3());
    const offset = editorCamera.position.clone().sub(orbit.target);
    orbit.target.copy(center);
    editorCamera.position.copy(center).add(offset.setLength(Math.max(2.5, offset.length() * 0.5)));
}

/* ------------------------------------------------------------------ */
/* Play / Stop                                                          */
/* ------------------------------------------------------------------ */

interface Snapshot {
    transforms: Map<Object3D, { p: Vector3; q: Quaternion; s: Vector3; parent: Object3D | null }>;
    fields: Map<Script, Record<string, unknown>>;
}
let snapshot: Snapshot | null = null;

/**
 * Interim play mode: snapshot transforms + script fields, run, restore on Stop.
 * The real one serializes the scene and runs a disposable copy (architecture doc).
 */
export function play(): void {
    if (playing.peek()) return;
    const world = engine.world;
    snapshot = { transforms: new Map(), fields: new Map() };

    for (const obj of world.objects()) {
        snapshot.transforms.set(obj, { p: obj.position.clone(), q: obj.quaternion.clone(), s: obj.scale.clone(), parent: obj.parent });
        for (const c of world.componentsOf(obj)) {
            if (!(c instanceof Script)) continue;
            const values: Record<string, unknown> = {};
            for (const f of getFields(c.constructor)) values[f.name] = (c as unknown as Record<string, unknown>)[f.name];
            snapshot.fields.set(c, values);
        }
    }

    gizmo.detach();
    world.restartScripts();
    engine.simulating = true;
    engine.camera = findGameCamera() ?? editorCamera;
    orbit.enabled = engine.camera === editorCamera;
    playing.value = true;
    pushLog('log', engine.camera === editorCamera ? '▶ Playing (no game camera found — using the editor camera)' : `▶ Playing through "${engine.camera.name}"`);
}

export function stop(): void {
    if (!playing.peek() || !snapshot) return;
    engine.simulating = false;

    for (const [obj, t] of snapshot.transforms) {
        if (t.parent && obj.parent !== t.parent) t.parent.add(obj);
        obj.position.copy(t.p);
        obj.quaternion.copy(t.q);
        obj.scale.copy(t.s);
    }
    for (const [script, values] of snapshot.fields) Object.assign(script, values);
    snapshot = null;

    engine.camera = editorCamera;
    orbit.enabled = true;
    playing.value = false;
    const sel = selection.peek();
    if (sel) gizmo.attach(sel);
    liveTick.value++;
    pushLog('log', '■ Stopped — scene restored');
}

function findGameCamera(): Camera | null {
    for (const obj of engine.world.objects()) if ((obj as Camera).isCamera) return obj as Camera;
    return null;
}

/* ------------------------------------------------------------------ */
/* Inspector writes (become commands once undo lands)                   */
/* ------------------------------------------------------------------ */

export function setTransform(obj: Object3D, part: 'position' | 'rotation' | 'scale', axis: 'x' | 'y' | 'z', value: number): void {
    if (!Number.isFinite(value)) return;
    if (part === 'rotation') {
        const e = new Euler().copy(obj.rotation);
        e[axis] = (value * Math.PI) / 180;
        obj.rotation.copy(e);
    } else {
        obj[part][axis] = value;
    }
    liveTick.value++;
}

export function setField(target: object, name: string, value: unknown): void {
    (target as Record<string, unknown>)[name] = value;
    liveTick.value++;
}

export function rename(obj: Object3D, name: string): void {
    obj.name = name;
    sceneVersion.value++;
}

export function deleteSelection(): void {
    const obj = selection.peek();
    if (obj && !playing.peek()) engine.world.destroy(obj);
}
