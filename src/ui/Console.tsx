import { useEffect, useRef } from 'preact/hooks';
import { logs } from '../state';

export function Console() {
    const list = useRef<HTMLOListElement>(null);
    const entries = logs.value;

    useEffect(() => {
        const el = list.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [entries.length]);

    return (
        <section class="panel panel-console" aria-label="Console">
            <header class="panel-header">
                Console
                <button type="button" class="btn small" onClick={() => (logs.value = [])}>Clear</button>
            </header>
            <ol class="console" ref={list}>
                {entries.map((e) => (
                    <li key={e.id} class={`log log-${e.level}`}>
                        <time>{(e.time / 1000).toFixed(1)}s</time> {e.text}
                    </li>
                ))}
            </ol>
        </section>
    );
}
