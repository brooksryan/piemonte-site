import { Router, Request, Response } from 'express';
import { dbExec, getSql, DB_UNAVAILABLE_MESSAGE } from '../db.js';

const router = Router();

function dbGuard(res: Response): boolean {
  if (getSql() === null) {
    res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
    return false;
  }
  return true;
}

interface ItineraryRow {
  id: number;
  user_name: string;
  entity_type: string | null;
  entity_slug: string | null;
  position: number;
  note: string | null;
  custom_title: string | null;
  custom_body: string | null;
  time_anchor: string | null;
  created_at: string;
}

// GET / — list itinerary items for the active user, ordered by position asc
router.get('/', async (req: Request, res: Response): Promise<void> => {
  if (!dbGuard(res)) return;
  const userName: string = (req as any).userName;
  try {
    const rows = await dbExec<ItineraryRow>`
      select * from itinerary_items
      where user_name = ${userName}
      order by position asc
    `;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST / — add an itinerary item; server assigns position = max(position) + 1
router.post('/', async (req: Request, res: Response): Promise<void> => {
  if (!dbGuard(res)) return;
  const userName: string = (req as any).userName;
  const { entity_type, entity_slug, custom_title, custom_body, time_anchor, note } = req.body ?? {};

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

  try {
    // Determine next position
    const maxRows = await dbExec<{ max_pos: number | null }>`
      select max(position) as max_pos from itinerary_items
      where user_name = ${userName}
    `;
    const maxPos = maxRows[0]?.max_pos ?? 0;
    const nextPos = maxPos + 1;

    const et = hasEntityRef ? entity_type : null;
    const es = hasEntityRef ? entity_slug : null;
    const ct = hasCustomTitle ? custom_title : null;
    const cb = custom_body ?? null;
    const ta = time_anchor ?? null;
    const n = note ?? null;

    const rows = await dbExec<ItineraryRow>`
      insert into itinerary_items
        (user_name, entity_type, entity_slug, position, note, custom_title, custom_body, time_anchor)
      values
        (${userName}, ${et}, ${es}, ${nextPos}, ${n}, ${ct}, ${cb}, ${ta})
      returning *
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
  const existing = await dbExec<ItineraryRow>`
    select * from itinerary_items
    where id = ${id} and user_name = ${userName}
  `;
  if (existing.length === 0) {
    res.status(404).json({ error: 'itinerary item not found' });
    return;
  }
  const row = existing[0];

  const body = req.body ?? {};
  const position    = 'position'    in body ? body.position    : row.position;
  const note        = 'note'        in body ? body.note        : row.note;
  const custom_title = 'custom_title' in body ? body.custom_title : row.custom_title;
  const custom_body  = 'custom_body'  in body ? body.custom_body  : row.custom_body;
  const time_anchor  = 'time_anchor'  in body ? body.time_anchor  : row.time_anchor;

  try {
    const updated = await dbExec<ItineraryRow>`
      update itinerary_items
      set
        position     = ${position},
        note         = ${note},
        custom_title = ${custom_title},
        custom_body  = ${custom_body},
        time_anchor  = ${time_anchor}
      where id = ${id} and user_name = ${userName}
      returning *
    `;
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /:id — delete by id for active user, return 204
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
      delete from itinerary_items
      where id = ${id} and user_name = ${userName}
    `;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
