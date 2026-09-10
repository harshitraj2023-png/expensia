import express from 'express';
import { supabase } from '../supabase.js';

const router = express.Router();

const DEFAULT_COLOR = '#94A3B8';
const FIELDS = 'id, name, color';

function cleanName(value) {
  return typeof value === 'string' ? value.trim() : '';
}

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select(FIELDS)
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const name = cleanName(req.body.name);
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const color = cleanName(req.body.color) || DEFAULT_COLOR;

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, color })
    .select(FIELDS)
    .single();

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Category already exists' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

router.put('/:id', async (req, res) => {
  const patch = {};

  if (req.body.name !== undefined) {
    const name = cleanName(req.body.name);
    if (!name) return res.status(400).json({ error: 'Name is required' });
    patch.name = name;
  }

  if (req.body.color !== undefined) {
    const color = cleanName(req.body.color);
    if (!color) return res.status(400).json({ error: 'Color is required' });
    patch.color = color;
  }

  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', req.params.id)
    .select(FIELDS)
    .maybeSingle();

  if (error) {
    if (error.code === '23505') return res.status(400).json({ error: 'Category already exists' });
    return res.status(500).json({ error: error.message });
  }
  if (!data) return res.status(404).json({ error: 'Category not found' });
  res.json(data);
});

router.delete('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .delete()
    .eq('id', req.params.id)
    .select('id')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Category not found' });
  res.status(204).end();
});

export default router;
