import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const dataDir = path.resolve(process.cwd(), 'data');
  const dbFilePath = path.join(dataDir, 'app_db.json');

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
      if (fs.existsSync(dbFilePath)) {
        const raw = fs.readFileSync(dbFilePath, 'utf-8');
        const data = JSON.parse(raw);
        return res.json({ success: true, data });
      }
      return res.json({ success: true, data: null });
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

      fs.writeFileSync(dbFilePath, JSON.stringify(syncData, null, 2), 'utf-8');
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
