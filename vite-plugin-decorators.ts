import { transform, type Loader } from 'esbuild';
import type { Plugin } from 'vite';

/**
 * Lowers standard (TC39) decorators with esbuild.
 *
 * Vite 8 transforms TS with Oxc, which only supports legacy `experimentalDecorators`
 * and passes standard decorators through untouched — no browser can run that yet.
 * This runs first on any source file that uses a decorator; Oxc then sees plain TS/JS.
 *
 * The in-browser script compiler uses esbuild-wasm for the same reason, so editor
 * code and user scripts get identical decorator semantics.
 */
export function decorators(): Plugin {
    const file = /\.[cm]?[jt]sx?$/;
    const usesDecorator = /(^|[\s;{(])@[A-Za-z_$][\w$]*\s*(\(|\n|\s+[A-Za-z_$#])/m;

    return {
        name: 'n3rdw1z4rd:standard-decorators',
        enforce: 'pre',
        async transform(code, id) {
            const path = id.split('?')[0];
            if (!file.test(path) || path.includes('/node_modules/') || !usesDecorator.test(code)) return null;

            const ext = path.slice(path.lastIndexOf('.') + 1).replace(/^[cm]/, '') as Loader;
            const result = await transform(code, {
                loader: ext,
                sourcefile: path,
                sourcemap: true,
                target: 'es2022',
                jsx: 'preserve', // leave JSX to the Preact preset
                tsconfigRaw: { compilerOptions: { useDefineForClassFields: true, verbatimModuleSyntax: true } },
            });
            return { code: result.code, map: result.map };
        },
    };
}
