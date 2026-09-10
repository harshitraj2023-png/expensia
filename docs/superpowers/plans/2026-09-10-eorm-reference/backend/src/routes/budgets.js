import express from 'express';
import { supabase } from '../supabase.js';
import { num, currentMonth } from '../month.js';

const router = express.Router();

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

router.get('/', async (req, res) => {
  const month = req.query.month || currentMonth();
  if (!MONTH_PATTERN.test(month)) {
    return res.status(400).json({ error: 'Invalid month' });
  }

  const categories = await supabase.from('categories').select('id, name, color').order('name');
  if (categories.error) return res.status(500).json({ error: categories.error.message });

  const budgets = await supabase.from('budgets').select('category_id, limit_amount').eq('month', month);
  if (budgets.error) return res.status(500).json({ error: budgets.error.message });

  const limits = new Map(budgets.data.map((row) => [row.category_id, num(row.limit_amount)]));

  res.json(
    categories.data.map((category) => ({
      category_id: category.id,
      category_name: category.name,
      category_color: category.color,
      limit_amount: limits.get(category.id) ?? 0
    }))
  );
});

router.put('/', async (req, res) => {
  const { month, category_id, limit_amount } = req.body || {};

  if (typeof month !== 'string' || !MONTH_PATTERN.test(month)) {
    return res.status(400).json({ error: 'Invalid month' });
  }
  if (!category_id) {
    return res.status(400).json({ error: 'category_id is required' });
  }

  const limit = Number(limit_amount);
  if (!Number.isFinite(limit) || limit < 0) {
    return res.status(400).json({ error: 'limit_amount must be a number of 0 or more' });
  }

  const { data, error } = await supabase
    .from('budgets')
    .upsert({ category_id, month, limit_amount: limit }, { onConflict: 'category_id,month' })
    .select('id, category_id, month, limit_amount')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  res.json({
    id: data.id,
    category_id: data.category_id,
    month: data.month,
    limit_amount: num(data.limit_amount)
  });
});

export default router;
