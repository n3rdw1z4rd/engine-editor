import { render } from 'preact';
import { deleteSelection, play, stop } from './editor';
import { gizmoMode, playing, pushLog, selection, uiHidden } from './state';
import { App, setFullScreen } from './ui/App';
import './styles.css';

// Mirror console output from scripts into the editor's Console panel.
for (const level of ['log', 'warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
        original(...args);
        pushLog(level, args.map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : safeJson(a))).join(' '));
    };
}
window.addEventListener('error', (e) => pushLog('error', e.message));
window.addEventListener('unhandledrejection', (e) => pushLog('error', String(e.reason)));

function safeJson(v: unknown): string {
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
}

// Keyboard shortcuts (desktop); everything also has an on-screen control.
window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    switch (e.key.toLowerCase()) {
        case 'w': gizmoMode.value = 'translate'; break;
        case 'e': gizmoMode.value = 'rotate'; break;
        case 'r': gizmoMode.value = 'scale'; break;
        case 'p': playing.value ? stop() : play(); break;
        case 'escape': if (playing.value) stop(); else selection.value = null; break;
        case 'f': setFullScreen(!uiHidden.value); break;
        case 'delete': case 'backspace': deleteSelection(); break;
        default: return;
    }
    e.preventDefault();
});

// Leaving browser full screen (e.g. the Esc key or a system gesture) restores the panels.
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && uiHidden.value) uiHidden.value = false;
});

render(<App />, document.getElementById('root')!);
