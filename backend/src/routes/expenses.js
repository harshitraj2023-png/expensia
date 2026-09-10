import express from 'express';
import { supabase } from '../supabase.js';
import { fetchAllRows } from '../paginate.js';
import { monthRange, num } from '../month.js';

const router = express.Router();

const FIELDS = '*, categories(name, color)';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_AMOUNT = 9999999999.99;

function isValidAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function exceedsMaxAmount(value) {
  return Number(value) > MAX_AMOUNT;
}

function shape(row) {
  return {
    id: row.id,
    amount: num(row.amount),
    category_id: row.category_id,
    category_name: row.categories ? row.categories.name : null,
    category_color: row.categories ? row.categories.color : null,
    date: row.date,
    note: row.note,
    created_at: row.created_at
  };
}

router.get('/', async (req, res) => {
  let range = null;

  if (req.query.month) {
    try {
      range = monthRange(req.query.month);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  const { data, error } = await fetchAllRows(() => {
    const query = supabase.from('expenses').select(FIELDS);
    const scoped = range ? query.gte('date', range.start).lt('date', range.end) : query;
    return scoped
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });
  });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(shape));
});

router.post('/', async (req, res) => {
  const { amount, category_id, date, note } = req.body;

  if (!isValidAmount(amount)) return res.status(400).json({ error: 'Amount must be greater than 0' });
  if (exceedsMaxAmount(amount)) return res.status(400).json({ error: `Amount must be ${MAX_AMOUNT} or less` });
  if (!DATE_PATTERN.test(date)) return res.status(400).json({ error: 'Invalid date' });

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      amount: Number(amount),
      category_id: category_id || null,
      date,
      note: note || null
    })
    .select(FIELDS)
    .single();

  if (error) {
    if (error.code === '23503') return res.status(400).json({ error: 'Category not found' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(shape(data));
});

router.put('/:id', async (req, res) => {
  const patch = {};

  if (req.body.amount !== undefined) {
    if (!isValidAmount(req.body.amount)) return res.status(400).json({ error: 'Amount must be greater than 0' });
    if (exceedsMaxAmount(req.body.amount)) return res.status(400).json({ error: `Amount must be ${MAX_AMOUNT} or less` });
    patch.amount = Number(req.body.amount);
  }

  if (req.body.date !== undefined) {
    if (!DATE_PATTERN.test(req.body.date)) return res.status(400).json({ error: 'Invalid date' });
    patch.date = req.body.date;
  }

  if (req.body.category_id !== undefined) patch.category_id = req.body.category_id || null;
  if (req.body.note !== undefined) patch.note = req.body.note || null;

  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  const { data, error } = await supabase
    .from('expenses')
    .update(patch)
    .eq('id', req.params.id)
    .select(FIELDS)
    .maybeSingle();

  if (error) {
    if (error.code === '23503') return res.status(400).json({ error: 'Category not found' });
    return res.status(500).json({ error: error.message });
  }
  if (!data) return res.status(404).json({ error: 'Expense not found' });
  res.json(shape(data));
});

router.delete('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', req.params.id)
    .select('id')
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Expense not found' });
  res.status(204).end();
});

export default router;
