import express, { Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { isDbConfigured } from './db.js';
import favoritesRouter from './routes/favorites.js';
import itineraryRouter from './routes/itinerary.js';
import calendarRouter from './routes/calendar.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3001;

// ---------------------------------------------------------------------------
// Auth types and constants
// ---------------------------------------------------------------------------

export type ActiveUser = 'brooks' | 'angela';

export const ACTIVE_USERS: readonly ActiveUser[] = ['brooks', 'angela'] as const;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('x-user-name');
  if (!header || !(ACTIVE_USERS as readonly string[]).includes(header)) {
    res.status(400).json({ error: 'invalid x-user-name header' });
    return;
  }
  (req as any).userName = header;
  next();
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

const app = express();

app.use(cors());
app.use(express.json());

// Health check — no auth required
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Authenticated API router
// ---------------------------------------------------------------------------

const apiRouter = Router();
apiRouter.use(requireUser);

// GET /api/whoami — returns the active user from the validated header
apiRouter.get('/whoami', (req: Request, res: Response) => {
  res.json({ user: (req as any).userName });
});

apiRouter.use('/favorites', favoritesRouter);
apiRouter.use('/itinerary', itineraryRouter);
apiRouter.use('/calendar', calendarRouter);

app.use('/api', apiRouter);

// ---------------------------------------------------------------------------
// Production static serving
// ---------------------------------------------------------------------------

if (process.env.NODE_ENV === 'production') {
  // server/src/ is two levels below site/dist/
  const distPath = path.resolve(__dirname, '../../dist');

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));

    // SPA fallback — any non-/api GET serves index.html
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.warn(
      `[server] WARNING: dist directory not found at ${distPath}. ` +
        'Static client serving is disabled. Run the Vite build first.'
    );
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

if (!isDbConfigured()) {
  console.warn('[server] DATABASE_URL not set; /api routes will return 503 until devops provisions Neon');
}

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
