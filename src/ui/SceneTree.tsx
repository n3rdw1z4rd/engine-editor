import type { Object3D } from 'three';
import { engine } from '../editor';
import { sceneVersion, selection, sheetTab } from '../state';

function iconFor(obj: Object3D): string {
    const o = obj as Object3D & { isCamera?: boolean; isLight?: boolean; isMesh?: boolean; isPoints?: boolean };
    if (o.isCamera) return '◫';
    if (o.isLight) return '✺';
    if (o.isPoints) return '⁘';
    if (o.isMesh) return '◆';
    return '○';
}

/** Registered children of `parent`, looking through any unregistered Three objects in between (e.g. sockets). */
function gameChildren(parent: Object3D): Object3D[] {
    const out: Object3D[] = [];
    for (const child of parent.children) {
        if (engine.world.has(child)) out.push(child);
        else out.push(...gameChildren(child));
    }
    return out;
}

function Node({ obj, depth }: { obj: Object3D; depth: number }) {
    const kids = gameChildren(obj);
    const selected = selection.value === obj;
    return (
        <>
            <li>
                <button
                    type="button"
                    class={selected ? 'tree-row selected' : 'tree-row'}
                    style={{ paddingLeft: `${12 + depth * 18}px` }}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => {
                        selection.value = obj;
                    }}
                    onDblClick={() => {
                        selection.value = obj;
                        sheetTab.value = 'inspector';
                    }}
                >
                    <span class="tree-icon" aria-hidden="true">{iconFor(obj)}</span>
                    <span class="tree-name">{obj.name || obj.type}</span>
                    {depth > 0 && <span class="tree-badge" title="attached to its parent">attached</span>}
                </button>
            </li>
            {kids.map((k) => <Node key={k.uuid} obj={k} depth={depth + 1} />)}
        </>
    );
}

export function SceneTree() {
    sceneVersion.value; // re-render when the world changes
    if (!engine) return null;
    const roots = gameChildren(engine.world.scene);
    return (
        <section class="panel panel-scene" aria-label="Scene">
            <header class="panel-header">Scene</header>
            <ul class="tree" role="list">
                {roots.map((o) => <Node key={o.uuid} obj={o} depth={0} />)}
            </ul>
        </section>
    );
}
