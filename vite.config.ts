import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { decorators } from './vite-plugin-decorators.ts';

export default defineConfig({
    plugins: [decorators(), preact()],
    resolve: {
        // Develop against the engine's source, so engine edits hot-reload in the editor
        // without a separate build step. Published builds use the engine's dist.
        alias: {
            '@n3rdw1z4rd/engine': fileURLToPath(new URL('../engine/src/index.ts', import.meta.url)),
        },
    },
    server: {
        host: true,
    },
    build: {
        target: 'es2022',
        chunkSizeWarningLimit: 900,
    },
});
