import preact from '@preact/preset-vite';
import { decorators } from '@n3rdw1z4rd/engine/vite';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig({
    plugins: [decorators(), preact()],
    resolve: {
        // Resolve @n3rdw1z4rd/engine to its TypeScript source (its "n3rdw1z4rd-source"
        // export), so engine edits hot-reload here with no engine build step. Works the
        // same whether the engine is a sibling checkout (file:../engine) or from npm.
        conditions: ['n3rdw1z4rd-source', ...defaultClientConditions],
        // With file:../engine, the engine has its own node_modules. Without dedupe the
        // editor would bundle a second copy of each of these, and two copies of Three.js
        // break `instanceof` checks between engine and editor objects.
        dedupe: ['three', '@n3rdw1z4rd/core', 'simplex-noise', 'preact', '@preact/signals'],
    },
    server: {
        host: true,
    },
    build: {
        target: 'es2022',
        chunkSizeWarningLimit: 900,
    },
});
