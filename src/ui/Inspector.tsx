import { Script, fieldKind, getFields, type FieldInfo } from '@n3rdw1z4rd/engine';
import { Color, Object3D } from 'three';
import { deleteSelection, engine, frameSelection, rename, setField, setTransform } from '../editor';
import { liveTick, playing, sceneVersion, selection } from '../state';

const AXES = ['x', 'y', 'z'] as const;
const round = (v: number, p = 1000) => Math.round(v * p) / p;

function NumberInput({ value, onCommit, step = 0.1, label }: { value: number; onCommit: (v: number) => void; step?: number; label: string }) {
    return (
        <input
            class="num"
            type="number"
            inputMode="decimal"
            step={step}
            value={round(value)}
            aria-label={label}
            onChange={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        />
    );
}

function TransformSection({ obj }: { obj: Object3D }) {
    const rows: { part: 'position' | 'rotation' | 'scale'; get: (a: (typeof AXES)[number]) => number; step: number }[] = [
        { part: 'position', get: (a) => obj.position[a], step: 0.1 },
        { part: 'rotation', get: (a) => (obj.rotation[a] * 180) / Math.PI, step: 5 },
        { part: 'scale', get: (a) => obj.scale[a], step: 0.1 },
    ];
    return (
        <div class="card">
            <div class="card-title">Transform <span class="muted">(local)</span></div>
            {rows.map(({ part, get, step }) => (
                <div class="row vec3" key={part}>
                    <span class="row-label">{part}</span>
                    {AXES.map((a) => (
                        <label class={`axis axis-${a}`} key={a}>
                            <span aria-hidden="true">{a}</span>
                            <NumberInput value={get(a)} step={step} label={`${part} ${a}`} onCommit={(v) => setTransform(obj, part, a, v)} />
                        </label>
                    ))}
                </div>
            ))}
        </div>
    );
}

function FieldRow({ target, info }: { target: Record<string, unknown>; info: FieldInfo }) {
    const value = target[info.name];
    const kind = fieldKind(info, value);
    const label = info.label ?? info.name;

    let control;
    switch (kind) {
        case 'number': {
            const n = value as number;
            const hasRange = info.min !== undefined && info.max !== undefined;
            control = (
                <div class="field-number">
                    {hasRange && (
                        <input
                            type="range"
                            min={info.min}
                            max={info.max}
                            step={info.step ?? 0.01}
                            value={n}
                            aria-label={label}
                            onInput={(e) => setField(target, info.name, Number((e.target as HTMLInputElement).value))}
                        />
                    )}
                    <NumberInput value={n} step={info.step ?? 0.1} label={label} onCommit={(v) => setField(target, info.name, v)} />
                </div>
            );
            break;
        }
        case 'boolean':
            control = <input type="checkbox" class="check" checked={value as boolean} aria-label={label} onChange={(e) => setField(target, info.name, (e.target as HTMLInputElement).checked)} />;
            break;
        case 'string':
            control = <input type="text" class="text" value={value as string} aria-label={label} onChange={(e) => setField(target, info.name, (e.target as HTMLInputElement).value)} />;
            break;
        case 'color': {
            const hex = value instanceof Color ? `#${value.getHexString()}` : String(value);
            control = (
                <input
                    type="color"
                    class="color"
                    value={hex}
                    aria-label={label}
                    onInput={(e) => {
                        const v = (e.target as HTMLInputElement).value;
                        if (value instanceof Color) value.set(v);
                        else setField(target, info.name, v);
                    }}
                />
            );
            break;
        }
        case 'ref': {
            const objects = [...engine.world.objects()];
            const current = value as Object3D | null;
            control = (
                <select
                    class="select"
                    aria-label={label}
                    value={current ? current.uuid : ''}
                    onChange={(e) => {
                        const id = (e.target as HTMLSelectElement).value;
                        setField(target, info.name, objects.find((o) => o.uuid === id) ?? null);
                    }}
                >
                    <option value="">— none —</option>
                    {objects.map((o) => <option key={o.uuid} value={o.uuid}>{o.name || o.type}</option>)}
                </select>
            );
            break;
        }
        default:
            control = <span class="muted">{String(value)}</span>;
    }

    return (
        <div class="row">
            <span class="row-label">{label}</span>
            {control}
        </div>
    );
}

/** Plain data components have no @field metadata, so show their primitive own properties read-only. */
function DataComponent({ component }: { component: object }) {
    const entries = Object.entries(component).filter(([, v]) => ['number', 'string', 'boolean'].includes(typeof v) || v instanceof Color);
    return (
        <>
            {entries.map(([k, v]) => (
                <div class="row" key={k}>
                    <span class="row-label">{k}</span>
                    <span class="value">{v instanceof Color ? `#${v.getHexString()}` : String(v)}</span>
                </div>
            ))}
        </>
    );
}

function ComponentCard({ component }: { component: object }) {
    const isScript = component instanceof Script;
    const fields = isScript ? getFields(component.constructor) : [];
    return (
        <div class="card">
            <div class="card-title">
                {isScript && (
                    <input
                        type="checkbox"
                        class="check"
                        checked={(component as Script).enabled}
                        aria-label={`${component.constructor.name} enabled`}
                        onChange={(e) => {
                            (component as Script).enabled = (e.target as HTMLInputElement).checked;
                            liveTick.value++;
                        }}
                    />
                )}
                <span>{component.constructor.name}</span>
                <span class="pill">{isScript ? 'script' : 'data'}</span>
            </div>
            {isScript
                ? fields.map((f) => <FieldRow key={f.name} target={component as unknown as Record<string, unknown>} info={f} />)
                : <DataComponent component={component} />}
            {isScript && fields.length === 0 && <div class="muted small">No @field properties.</div>}
        </div>
    );
}

export function Inspector() {
    liveTick.value; // live values while playing / dragging
    sceneVersion.value;
    const obj = selection.value;

    return (
        <section class="panel panel-inspector" aria-label="Inspector">
            <header class="panel-header">Inspector</header>
            {!obj || !engine ? (
                <p class="empty">Tap an object in the viewport or the scene list.</p>
            ) : (
                <div class="inspector-body" key={obj.uuid}>
                    <div class="row name-row">
                        <input class="text name" type="text" value={obj.name} aria-label="Name" onChange={(e) => rename(obj, (e.target as HTMLInputElement).value)} />
                        <span class="pill">{obj.type}</span>
                    </div>
                    <div class="row-buttons">
                        <button type="button" class="btn" onClick={frameSelection}>Frame</button>
                        <button type="button" class="btn danger" disabled={playing.value} onClick={deleteSelection}>Delete</button>
                    </div>
                    <TransformSection obj={obj} />
                    {engine.world.componentsOf(obj).map((c, i) => <ComponentCard key={`${c.constructor.name}-${i}`} component={c} />)}
                </div>
            )}
        </section>
    );
}
