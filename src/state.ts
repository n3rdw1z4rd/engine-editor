import { signal } from '@preact/signals';
import type { Object3D } from 'three';

export type SheetTab = 'scene' | 'inspector' | 'console';
export type SheetSize = 'peek' | 'half' | 'full';
export type GizmoMode = 'translate' | 'rotate' | 'scale';

export interface LogEntry {
    id: number;
    level: 'log' | 'warn' | 'error';
    text: string;
    time: number;
}

/** Currently selected game object. */
export const selection = signal<Object3D | null>(null);
export const playing = signal(false);
/** Full-screen view: every panel hidden, only the viewport and a floating button. */
export const uiHidden = signal(false);
export const sheetTab = signal<SheetTab>('scene');
export const sheetSize = signal<SheetSize>('half');
export const gizmoMode = signal<GizmoMode>('translate');

/** Bumped whenever objects, components or the hierarchy change (drives the scene tree). */
export const sceneVersion = signal(0);
/** Bumped ~10×/s while playing, and on gizmo drags, so the inspector shows live values. */
export const liveTick = signal(0);

export const logs = signal<LogEntry[]>([]);

let nextLogId = 1;
export function pushLog(level: LogEntry['level'], text: string): void {
    const next = [...logs.value, { id: nextLogId++, level, text, time: performance.now() }];
    logs.value = next.length > 300 ? next.slice(-300) : next;
}
