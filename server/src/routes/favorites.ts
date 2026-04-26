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

// GET / — list favorites for the active user, ordered by created_at desc
router.get('/', async (req: Request, res: Response): Promise<void> => {
  if (!dbGuard(res)) return;
  const userName: string = (req as any).userName;
  try {
    const rows = await dbExec`
      select * from favorites
      where user_name = ${userName}
      order by created_at desc
    `;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST / — add a favorite (idempotent via on conflict do nothing)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  if (!dbGuard(res)) return;
  const userName: string = (req as any).userName;
  const { entity_type, entity_slug } = req.body ?? {};

  if (typeof entity_type !== 'string' || entity_type.trim() === '') {
    res.status(400).json({ error: 'entity_type is required and must be a non-empty string' });
    return;
  }
  if (typeof entity_slug !== 'string' || entity_slug.trim() === '') {
    res.status(400).json({ error: 'entity_slug is required and must be a non-empty string' });
    return;
  }

  try {
    // Insert on conflict do nothing, then select the row regardless
    await dbExec`
      insert into favorites (user_name, entity_type, entity_slug)
      values (${userName}, ${entity_type}, ${entity_slug})
      on conflict (user_name, entity_type, entity_slug) do nothing
    `;
    const rows = await dbExec`
      select * from favorites
      where user_name = ${userName}
        and entity_type = ${entity_type}
        and entity_slug = ${entity_slug}
    `;
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /:id — delete by id where user_name = active user
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
      delete from favorites
      where id = ${id} and user_name = ${userName}
    `;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
