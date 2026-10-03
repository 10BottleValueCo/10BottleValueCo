import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { darkenNeutralColorsInSource } from './neutral-color-transform.js';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;
const isBuild = process.argv.includes('build');

if (!rawPort && !isBuild) {
  throw new Error('PORT environment variable is required but was not provided.');
}

const port = Number(rawPort || '3000');

if (!isBuild && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;
if (!basePath && !isBuild) {
  throw new Error('BASE_PATH environment variable is required but was not provided.');
}

function darkenInlineNeutralColors() {
  return {
    name: 'darken-inline-neutral-colors',
    enforce: 'pre',
    transform(code, id) {
      if (
        !id.includes('/src/') ||
        !/\.(?:[jt]sx?|css)(?:\?|$)/.test(id) ||
        id.includes('/node_modules/')
      ) {
        return null;
      }
      const transformed = darkenNeutralColorsInSource(code);
      return transformed === code ? null : { code: transformed, map: null };
    },
  };
}

export default defineConfig({
  base: basePath || '/',
  plugins: [
    darkenInlineNeutralColors(),
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    ),
    'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(
      process.env.STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    ),
  },
  root: path.resolve(import.meta.dirname),
  build: {
    rollupOptions: {
      input: {
        storefront: path.resolve(import.meta.dirname, 'index.html'),
        meritTest: path.resolve(import.meta.dirname, 'merit-test.html'),
        meritReview: path.resolve(import.meta.dirname, 'merit-review.html'),
      },
    },
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
