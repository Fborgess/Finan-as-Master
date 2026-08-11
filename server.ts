import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

// Hosting platforms inject $PORT and probe that port to consider the app
// "started". Bind to it when present, else default 3000.
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const DB_FILE = 'app_db.json';

// Atomic JSON write: write to temp file then rename to avoid corrupting the DB
// if the process crashes mid-write.
function writeDbFileAtomic(filePath: string, data: unknown) {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

// Read DB file, returning null if missing. If corrupt, back it up and return
// null so the sync API can recover instead of returning persistent 500s.
function readDbFile(filePath: string): unknown | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error('Sync DB corrupted, backing up and starting fresh:', err);
    try {
      fs.copyFileSync(filePath, `${filePath}.corrupt-${Date.now()}`);
    } catch (e) {
      console.error('Failed to back up corrupted DB:', e);
    }
    return null;
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  const dataDir = path.resolve(process.cwd(), 'data');
  const dbFilePath = path.join(dataDir, DB_FILE);

  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) {
      console.error('Error creating data directory:', e);
    }
  }

  // API health route
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Cloud Sync GET - Pull latest state for all devices
  app.get('/api/sync/pull', (_req, res) => {
    try {
      const data = readDbFile(dbFilePath);
      return res.json({ success: true, data });
    } catch (err) {
      console.error('Error reading sync DB:', err);
      return res.status(500).json({ success: false, error: 'Failed to read sync database' });
    }
  });

  // Cloud Sync POST - Push updated state from any device
  app.post('/api/sync/push', (req, res) => {
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid payload' });
      }

      const syncData = {
        ...payload,
        lastUpdated: new Date().toISOString(),
      };

      writeDbFileAtomic(dbFilePath, syncData);
      return res.json({ success: true, lastUpdated: syncData.lastUpdated });
    } catch (err) {
      console.error('Error writing sync DB:', err);
      return res.status(500).json({ success: false, error: 'Failed to save sync data' });
    }
  });

  // Vite middleware for dev or static server for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Serve index.html for any unhandled routes in dev mode (SPA fallback)
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

  // Handle port already in use without crashing the whole process
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Kill the conflicting process or change PORT.`);
    } else {
      console.error('Server error:', err);
    }
  });

  // Graceful shutdown: close the server so ongoing requests finish
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
    // Force exit if connections hang
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

// Prevent a single unhandled error from taking the whole server down
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server kept alive):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection (server kept alive):', reason);
});

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
