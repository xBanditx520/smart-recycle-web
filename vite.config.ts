import react from '@vitejs/plugin-react';
import { copyFileSync, createReadStream, existsSync, mkdirSync } from 'fs';
import { extname, resolve } from 'path';
import { defineConfig } from 'vite';

const ORT_WASM_FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
];

// Copies ort-web WASM files to public/ort-wasm/ and serves them via a raw-byte
// middleware that bypasses Vite's module transform pipeline (?import stripping).
// Only active in dev — in prod, Vite bundles WASM into dist/assets/ automatically.
function ortWasmDevPlugin() {
  return {
    name: 'ort-wasm-local',
    apply: 'serve' as const,
    buildStart() {
      const dir = resolve('public/ort-wasm');
      mkdirSync(dir, { recursive: true });
      for (const file of ORT_WASM_FILES) {
        const dst = resolve(dir, file);
        if (!existsSync(dst)) {
          copyFileSync(resolve('node_modules/onnxruntime-web/dist', file), dst);
        }
      }
    },
    configureServer(server) {
      // Must run before Vite's module-transform middleware so the ?import query
      // does not trigger Vite's JS/TS pipeline on these raw WASM runtime files.
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (!url.startsWith('/ort-wasm/ort-wasm-')) return next();

        const filename = url.split('/').pop() ?? '';
        const filePath = resolve('public/ort-wasm', filename);
        if (!existsSync(filePath)) return next();

        const mime = extname(filename) === '.wasm'
          ? 'application/wasm'
          : 'text/javascript; charset=utf-8';
        res.setHeader('Content-Type', mime);
        res.setHeader('Cache-Control', 'no-cache');
        createReadStream(filePath).pipe(res);
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), ortWasmDevPlugin()],
  server: {
    host: '0.0.0.0'
  }
});
