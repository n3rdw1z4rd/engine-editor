import { useEffect, useRef } from 'preact/hooks';
import { mountEditor, play, stop } from '../editor';
import { gizmoMode, playing, sheetSize, sheetTab, uiHidden, type GizmoMode, type SheetSize, type SheetTab } from '../state';
import { Console } from './Console';
import { Inspector } from './Inspector';
import { SceneTree } from './SceneTree';

/* ------------------------------------------------------------------ */
/* Full screen: hide every panel; also use the Fullscreen API where it   */
/* exists (not on iPhone Safari, where hidden panels + PWA standalone    */
/* mode is the full-screen story).                                      */
/* ------------------------------------------------------------------ */

export function setFullScreen(on: boolean): void {
    uiHidden.value = on;
    const doc = document as Document & { webkitFullscreenElement?: Element };
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    try {
        if (on && !document.fullscreenElement && el.requestFullscreen) void el.requestFullscreen().catch(() => {});
        else if (!on && (document.fullscreenElement || doc.webkitFullscreenElement)) void document.exitFullscreen?.().catch(() => {});
    } catch { /* unsupported: hidden panels are enough */ }
}

function Toolbar() {
    const modes: { mode: GizmoMode; label: string; icon: string; key: string }[] = [
        { mode: 'translate', label: 'Move', icon: '✥', key: 'W' },
        { mode: 'rotate', label: 'Rotate', icon: '⟳', key: 'E' },
        { mode: 'scale', label: 'Scale', icon: '⤢', key: 'R' },
    ];
    return (
        <header class="toolbar" aria-label="Editor toolbar">
            <strong class="brand">engine</strong>
            <div class="segmented" role="group" aria-label="Gizmo">
                {modes.map((m) => (
                    <button
                        type="button"
                        key={m.mode}
                        class={gizmoMode.value === m.mode ? 'seg active' : 'seg'}
                        title={`${m.label} (${m.key})`}
                        aria-label={m.label}
                        disabled={playing.value}
                        onClick={() => (gizmoMode.value = m.mode)}
                    >
                        <span class="seg-icon" aria-hidden="true">{m.icon}</span>
                        <span class="seg-label">{m.label}</span>
                    </button>
                ))}
            </div>
            <span class="spacer" />
            <button
                type="button"
                class={playing.value ? 'btn play stop' : 'btn play'}
                title={playing.value ? 'Stop (Esc)' : 'Play (P)'}
                onClick={() => (playing.value ? stop() : play())}
            >
                {playing.value ? '■ Stop' : '▶ Play'}
            </button>
            <button type="button" class="btn icon" title="Full screen (F)" aria-label="Full screen" onClick={() => setFullScreen(true)}>
                ⛶
            </button>
        </header>
    );
}

function Viewport() {
    const host = useRef<HTMLDivElement>(null);
    useEffect(() => mountEditor(host.current!), []);
    return <main class="viewport" ref={host} aria-label="Viewport" />;
}

/* ------------------------------------------------------------------ */
/* The sheet: on phones, one tabbed panel that snaps to peek/half/full.  */
/* On wide screens it's `display: contents`, so its panels dock around   */
/* the viewport as ordinary grid items.                                 */
/* ------------------------------------------------------------------ */

const SIZES: SheetSize[] = ['peek', 'half', 'full'];

function SheetHandle() {
    const drag = useRef<{ y: number; start: number } | null>(null);

    const sizeToPx = (s: SheetSize) => {
        const h = window.innerHeight;
        return s === 'peek' ? 56 : s === 'half' ? h * 0.42 : h * 0.82;
    };

    return (
        <button
            type="button"
            class="sheet-handle"
            aria-label={`Resize panel (now ${sheetSize.value})`}
            onPointerDown={(e) => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                drag.current = { y: e.clientY, start: sizeToPx(sheetSize.value) };
            }}
            onPointerUp={(e) => {
                const d = drag.current;
                drag.current = null;
                if (!d) return;
                const moved = d.y - e.clientY;
                if (Math.abs(moved) < 8) {
                    // a tap cycles sizes
                    sheetSize.value = SIZES[(SIZES.indexOf(sheetSize.value) + 1) % SIZES.length];
                    return;
                }
                const target = d.start + moved;
                sheetSize.value = SIZES.reduce((best, s) => (Math.abs(sizeToPx(s) - target) < Math.abs(sizeToPx(best) - target) ? s : best));
            }}
            onPointerCancel={() => (drag.current = null)}
        >
            <span aria-hidden="true" />
        </button>
    );
}

function Sheet() {
    const tabs: { id: SheetTab; label: string }[] = [
        { id: 'scene', label: 'Scene' },
        { id: 'inspector', label: 'Inspector' },
        { id: 'console', label: 'Console' },
    ];
    return (
        <div class="sheet">
            <SheetHandle />
            <nav class="sheet-tabs" role="tablist" aria-label="Panels">
                {tabs.map((t) => (
                    <button
                        type="button"
                        role="tab"
                        key={t.id}
                        aria-selected={sheetTab.value === t.id}
                        class={sheetTab.value === t.id ? 'tab active' : 'tab'}
                        onClick={() => {
                            sheetTab.value = t.id;
                            if (sheetSize.value === 'peek') sheetSize.value = 'half';
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>
            <SceneTree />
            <Inspector />
            <Console />
        </div>
    );
}

export function App() {
    return (
        <div
            class={['app', uiHidden.value && 'ui-hidden', playing.value && 'is-playing'].filter(Boolean).join(' ')}
            data-tab={sheetTab.value}
            data-sheet={sheetSize.value}
        >
            <Toolbar />
            <Viewport />
            <Sheet />
            {uiHidden.value && (
                <button type="button" class="fab" aria-label="Show panels" title="Show panels (F)" onClick={() => setFullScreen(false)}>
                    UI
                </button>
            )}
        </div>
    );
}
