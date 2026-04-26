import { Router, Request, Response } from 'express';
import { dbExec, getSql, DB_UNAVAILABLE_MESSAGE } from '../db.js';

const router = Router();

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_FROM = '2026-05-25';
const DEFAULT_TO   = '2026-06-04';

function dbGuard(res: Response): boolean {
  if (getSql() === null) {
    res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
    return false;
  }
  return true;
}

interface CalendarRow {
  id: number;
  user_name: string;
  entity_type: string | null;
  entity_slug: string | null;
  on_date: string;
  time_anchor: string | null;
  note: string | null;
  custom_title: string | null;
  custom_body: string | null;
  created_at: string;
}

// GET / — list calendar items; accepts ?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req: Request, res: Response): Promise<void> => {
  if (!dbGuard(res)) return;
  const userName: string = (req as any).userName;

  const fromParam = req.query.from as string | undefined;
  const toParam   = req.query.to   as string | undefined;

  // If either is provided, validate both as ISO dates
  if (fromParam !== undefined && !ISO_DATE_RE.test(fromParam)) {
    res.status(400).json({ error: 'from must be a valid ISO date (YYYY-MM-DD)' });
    return;
  }
  if (toParam !== undefined && !ISO_DATE_RE.test(toParam)) {
    res.status(400).json({ error: 'to must be a valid ISO date (YYYY-MM-DD)' });
    return;
  }

  const from = fromParam ?? DEFAULT_FROM;
  const to   = toParam   ?? DEFAULT_TO;

  try {
    const rows = await dbExec<CalendarRow>`
      select id, user_name, entity_type, entity_slug,
             to_char(on_date, 'YYYY-MM-DD') as on_date,
             time_anchor, note, custom_title, custom_body, created_at
      from calendar_items
      where user_name = ${userName}
        and on_date >= ${from}::date
        and on_date <= ${to}::date
      order by on_date asc, created_at asc
    `;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST / — add a calendar item
router.post('/', async (req: Request, res: Response): Promise<void> => {
  if (!dbGuard(res)) return;
  const userName: string = (req as any).userName;
  const { on_date, entity_type, entity_slug, time_anchor, note, custom_title, custom_body } =
    req.body ?? {};

  if (typeof on_date !== 'string' || !ISO_DATE_RE.test(on_date)) {
    res.status(400).json({ error: 'on_date is required and must be a valid ISO date (YYYY-MM-DD)' });
    return;
  }

  const hasEntityRef =
    typeof entity_type === 'string' && entity_type.trim() !== '' &&
    typeof entity_slug === 'string' && entity_slug.trim() !== '';
  const hasCustomTitle = typeof custom_title === 'string' && custom_title.trim() !== '';

  if (!hasEntityRef && !hasCustomTitle) {
    res.status(400).json({
      error: 'must provide either (entity_type + entity_slug) or custom_title',
    });
    return;
  }

  const et = hasEntityRef ? entity_type : null;
  const es = hasEntityRef ? entity_slug : null;
  const ct = hasCustomTitle ? custom_title : null;
  const cb = custom_body   ?? null;
  const ta = time_anchor   ?? null;
  const n  = note          ?? null;

  try {
    const rows = await dbExec<CalendarRow>`
      insert into calendar_items
        (user_name, entity_type, entity_slug, on_date, time_anchor, note, custom_title, custom_body)
      values
        (${userName}, ${et}, ${es}, ${on_date}::date, ${ta}, ${n}, ${ct}, ${cb})
      returning id, user_name, entity_type, entity_slug,
               to_char(on_date, 'YYYY-MM-DD') as on_date,
               time_anchor, note, custom_title, custom_body, created_at
    `;
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PATCH /:id — merge-and-update pattern
router.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  if (!dbGuard(res)) return;
  const userName: string = (req as any).userName;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: 'id must be a valid integer' });
    return;
  }

  // Fetch existing row
  const existing = await dbExec<CalendarRow>`
    select id, user_name, entity_type, entity_slug,
           to_char(on_date, 'YYYY-MM-DD') as on_date,
           time_anchor, note, custom_title, custom_body, created_at
    from calendar_items
    where id = ${id} and user_name = ${userName}
  `;
  if (existing.length === 0) {
    res.status(404).json({ error: 'calendar item not found' });
    return;
  }
  const row = existing[0];

  const body = req.body ?? {};

  // Validate on_date if provided
  if ('on_date' in body && !ISO_DATE_RE.test(body.on_date)) {
    res.status(400).json({ error: 'on_date must be a valid ISO date (YYYY-MM-DD)' });
    return;
  }

  const on_date      = 'on_date'      in body ? body.on_date      : row.on_date;
  const time_anchor  = 'time_anchor'  in body ? body.time_anchor  : row.time_anchor;
  const note         = 'note'         in body ? body.note         : row.note;
  const custom_title = 'custom_title' in body ? body.custom_title : row.custom_title;
  const custom_body  = 'custom_body'  in body ? body.custom_body  : row.custom_body;

  try {
    const updated = await dbExec<CalendarRow>`
      update calendar_items
      set
        on_date      = ${on_date}::date,
        time_anchor  = ${time_anchor},
        note         = ${note},
        custom_title = ${custom_title},
        custom_body  = ${custom_body}
      where id = ${id} and user_name = ${userName}
      returning id, user_name, entity_type, entity_slug,
               to_char(on_date, 'YYYY-MM-DD') as on_date,
               time_anchor, note, custom_title, custom_body, created_at
    `;
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /:id — return 204
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  if (!dbGuard(res)) return;
  const userName: string = (req as any).userName;
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: 'id must be a valid integer' });
    return;
  }

  try {
    await dbExec`
      delete from calendar_items
      where id = ${id} and user_name = ${userName}
    `;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
