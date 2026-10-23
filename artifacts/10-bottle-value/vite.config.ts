import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;

if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || '/';

const publishedSite = 'https://10-bottle-value-co.vercel.app';

const configurePublishedSiteProxy: ProxyOptions['configure'] = (proxy) => {
  proxy.on('proxyRes', (proxyResponse) => {
    delete proxyResponse.headers['x-frame-options'];

    const contentSecurityPolicy =
      proxyResponse.headers['content-security-policy'];
    if (typeof contentSecurityPolicy === 'string') {
      const withoutFrameAncestors = contentSecurityPolicy
        .replace(/(?:^|;)\s*frame-ancestors\s+[^;]*/gi, '')
        .replace(/^;\s*|;\s*$/g, '');
      if (withoutFrameAncestors) {
        proxyResponse.headers['content-security-policy'] =
          withoutFrameAncestors;
      } else {
        delete proxyResponse.headers['content-security-policy'];
      }
    }

    const location = proxyResponse.headers.location;
    if (typeof location === 'string') {
      try {
        const redirectedUrl = new URL(location, publishedSite);
        if (redirectedUrl.origin === publishedSite) {
          proxyResponse.headers.location = `/site${redirectedUrl.pathname}${redirectedUrl.search}${redirectedUrl.hash}`;
        }
      } catch {
        // Keep unparseable upstream redirect headers unchanged.
      }
    }
  });
};

const publishedSiteProxy: ProxyOptions = {
  target: publishedSite,
  changeOrigin: true,
  secure: true,
  ws: true,
  rewrite: (requestPath) =>
    requestPath.replace(/^\/site(?=\/|$)/, '') || '/',
  bypass: (request) => {
    const requestPath = request.url ?? '/';
    if (
      /^\/(?:@vite|@react-refresh|src\/|node_modules\/|@id\/|@fs\/|__vite|__open-in-editor)/.test(
        requestPath,
      )
    ) {
      return requestPath;
    }

    const pathname = requestPath.split('?')[0];
    // Serve local branded Melanotan I and II renders instead of the
    // matching production-site asset proxy.
    if (
      pathname.endsWith('/vials-c/melanotan-1-mt1-10mg.webp') ||
      pathname.endsWith('/vials-c/melanotan-2-mt2-10mg.webp')
    ) {
      return requestPath;
    }
    if (pathname.startsWith('/coa-cjc-ipa-5mg-each')) {
      return requestPath;
    }
    if (pathname === '/site' || pathname.startsWith('/site/')) {
      return undefined;
    }

    const isRemoteAsset =
      pathname.startsWith('/images/') ||
      pathname.startsWith('/vials-c/') ||
      pathname.startsWith('/affiliate/') ||
      pathname.startsWith('/crypto/') ||
      pathname.startsWith('/coa-') ||
      /\.(?:png|jpe?g|webp|gif|svg|ico|pdf|woff2?|ttf|otf)$/i.test(pathname);

    return isRemoteAsset ? undefined : requestPath;
  },
  configure: configurePublishedSiteProxy,
};

export default defineConfig({
  base: basePath,
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    ),
    'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(
      process.env.STRIPE_PUBLISHABLE_KEY ||
        process.env.VITE_STRIPE_PUBLISHABLE_KEY ||
        '',
    ),
  },
  plugins: [
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
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '^/(?!@vite|@react-refresh|src/|node_modules/|@id/|@fs/|__vite|__open-in-editor)': publishedSiteProxy,
    },
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
