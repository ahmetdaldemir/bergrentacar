import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";

const UPLOADS_ROOT = path.resolve(__dirname, "../backups/bergrentacar/uploads");
const IMAGE_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const PUBLIC_HOSTS = new Set(["bergrentacar.com", "www.bergrentacar.com"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const LOCAL_PORT = "8080";

function isAllowedDevHost(hostHeader: string | undefined): boolean {
  const value = (hostHeader || "").trim().toLowerCase();
  let hostname = value;
  let port = "";
  if (value.startsWith("[")) {
    const end = value.indexOf("]");
    hostname = end === -1 ? value : value.slice(1, end);
    port = end !== -1 && value.slice(end + 1).startsWith(":") ? value.slice(end + 2) : "";
  } else {
    const colon = value.lastIndexOf(":");
    if (colon > 0 && /^\d+$/.test(value.slice(colon + 1))) {
      hostname = value.slice(0, colon);
      port = value.slice(colon + 1);
    }
  }
  if (PUBLIC_HOSTS.has(hostname)) return true;
  return LOCAL_HOSTS.has(hostname) && port === LOCAL_PORT;
}

function localUploads(): Plugin {
  const serve = (
    req: { url?: string },
    res: NodeJS.WritableStream & { statusCode: number; setHeader: (name: string, value: string) => void },
    next: () => void,
  ) => {
    const raw = (req.url || "").split("?")[0];
    if (!raw.startsWith("/uploads/")) {
      next();
      return;
    }
    let relative = "";
    try {
      relative = decodeURIComponent(raw.slice("/uploads/".length));
    } catch {
      next();
      return;
    }
    if (!relative || relative.includes("..") || relative.includes("/") || relative.includes("\\")) {
      next();
      return;
    }
    const file = path.join(UPLOADS_ROOT, relative);
    if (!file.startsWith(UPLOADS_ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      next();
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", IMAGE_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  };

  return {
    name: "local-uploads",
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
  };
}

function bergrentacarHostLock(): Plugin {
  const reject = (
    req: { headers: { host?: string } },
    res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void },
    next: () => void,
  ) => {
    if (isAllowedDevHost(req.headers.host)) {
      next();
      return;
    }
    res.statusCode = 403;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Bu site yalnızca bergrentacar.com veya http://localhost:8080 üzerinde açılır.");
  };

  return {
    name: "bergrentacar-host-lock",
    configureServer(server) {
      server.middlewares.use(reject);
    },
    configurePreviewServer(server) {
      server.middlewares.use(reject);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/', // Base public path when served in production
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    allowedHosts: ["bergrentacar.com", "www.bergrentacar.com", "localhost", "127.0.0.1"],
    historyApiFallback: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: false },
      "/uploads": { target: "http://127.0.0.1:3000", changeOrigin: false },
    },
  },
  preview: {
    host: "::",
    port: 8080,
    strictPort: true,
    allowedHosts: ["bergrentacar.com", "www.bergrentacar.com", "localhost", "127.0.0.1"],
  },
  plugins: [react(), bergrentacarHostLock(), localUploads()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000, // Increase limit to 1MB (default is 500KB)
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          'utils-vendor': ['date-fns', 'lucide-react'],
        },
      },
    },
  },
});
