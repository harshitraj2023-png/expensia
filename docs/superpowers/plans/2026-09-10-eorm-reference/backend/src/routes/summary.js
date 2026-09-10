import express from 'express';
import { supabase } from '../supabase.js';
import { monthRange, num, currentMonth } from '../month.js';

const router = express.Router();

function firstError(results) {
  return results.find((result) => result.error);
}

function bySpentThenName(a, b) {
  return b.spent - a.spent || a.name.localeCompare(b.name);
}

router.get('/year', async (req, res) => {
  const year = Number(req.query.year ?? currentMonth().slice(0, 4));
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    return res.status(400).json({ error: 'Invalid year' });
  }

  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;

  const [expenses, income, savings, categories] = await Promise.all([
    supabase.from('expenses').select('amount, date, category_id').gte('date', start).lt('date', end),
    supabase.from('income').select('amount, date').gte('date', start).lt('date', end),
    supabase.from('savings').select('amount, date').gte('date', start).lt('date', end),
    supabase.from('categories').select('id, name, color')
  ]);

  const failed = firstError([expenses, income, savings, categories]);
  if (failed) return res.status(500).json({ error: failed.error.message });

  const months = [];
  const byMonth = new Map();
  for (let index = 1; index <= 12; index += 1) {
    const bucket = { month: `${year}-${String(index).padStart(2, '0')}`, income: 0, expense: 0, savings: 0 };
    months.push(bucket);
    byMonth.set(bucket.month, bucket);
  }

  const spentByCategory = new Map();

  for (const row of expenses.data) {
    const amount = num(row.amount);
    const bucket = byMonth.get(String(row.date).slice(0, 7));
    if (bucket) bucket.expense += amount;
    if (row.category_id) {
      spentByCategory.set(row.category_id, (spentByCategory.get(row.category_id) ?? 0) + amount);
    }
  }

  for (const row of income.data) {
    const bucket = byMonth.get(String(row.date).slice(0, 7));
    if (bucket) bucket.income += num(row.amount);
  }

  for (const row of savings.data) {
    const bucket = byMonth.get(String(row.date).slice(0, 7));
    if (bucket) bucket.savings += num(row.amount);
  }

  const breakdown = categories.data
    .map((category) => ({
      name: category.name,
      color: category.color,
      spent: spentByCategory.get(category.id) ?? 0
    }))
    .filter((category) => category.spent > 0)
    .sort(bySpentThenName);

  res.json({
    year,
    months,
    income_total: months.reduce((total, bucket) => total + bucket.income, 0),
    expense_total: months.reduce((total, bucket) => total + bucket.expense, 0),
    savings_total: months.reduce((total, bucket) => total + bucket.savings, 0),
    categories: breakdown
  });
});

router.get('/', async (req, res) => {
  const month = req.query.month || currentMonth();

  let range;
  try {
    range = monthRange(month);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const [expenses, income, savings, categories, budgets] = await Promise.all([
    supabase.from('expenses').select('amount, category_id').gte('date', range.start).lt('date', range.end),
    supabase.from('income').select('amount').gte('date', range.start).lt('date', range.end),
    supabase.from('savings').select('amount').gte('date', range.start).lt('date', range.end),
    supabase.from('categories').select('id, name, color'),
    supabase.from('budgets').select('category_id, limit_amount').eq('month', month)
  ]);

  const failed = firstError([expenses, income, savings, categories, budgets]);
  if (failed) return res.status(500).json({ error: failed.error.message });

  const spentByCategory = new Map();
  let expense_total = 0;
  for (const row of expenses.data) {
    const amount = num(row.amount);
    expense_total += amount;
    if (row.category_id) {
      spentByCategory.set(row.category_id, (spentByCategory.get(row.category_id) ?? 0) + amount);
    }
  }

  const income_total = income.data.reduce((total, row) => total + num(row.amount), 0);
  const savings_total = savings.data.reduce((total, row) => total + num(row.amount), 0);
  const limits = new Map(budgets.data.map((row) => [row.category_id, num(row.limit_amount)]));

  const breakdown = categories.data
    .map((category) => {
      const spent = spentByCategory.get(category.id) ?? 0;
      const limit = limits.get(category.id) ?? 0;
      return {
        category_id: category.id,
        name: category.name,
        color: category.color,
        spent,
        limit,
        over: limit > 0 && spent > limit,
        pct: limit > 0 ? Math.round((spent / limit) * 100) : 0
      };
    })
    .sort(bySpentThenName);

  res.json({
    month,
    income_total,
    expense_total,
    savings_total,
    balance: income_total - expense_total - savings_total,
    categories: breakdown
  });
});

export default router;
