import express from 'express';
import { supabase } from '../supabase.js';
import { fetchAllRows } from '../paginate.js';
import { monthRange, num, currentMonth } from '../month.js';

const router = express.Router();

const UNCATEGORIZED_NAME = 'Uncategorized';
const UNCATEGORIZED_COLOR = '#8A93A6';

function firstError(results) {
  return results.find((result) => result.error);
}

function bySpentThenName(a, b) {
  return b.spent - a.spent || a.name.localeCompare(b.name);
}

function toPaise(value) {
  return Math.round(num(value) * 100);
}

function toRupees(paise) {
  return paise / 100;
}

router.get('/year', async (req, res) => {
  const year = Number(req.query.year ?? currentMonth().slice(0, 4));
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    return res.status(400).json({ error: 'Invalid year' });
  }

  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;

  const [expenses, income, savings, categories] = await Promise.all([
    fetchAllRows(() =>
      supabase
        .from('expenses')
        .select('amount, date, category_id')
        .gte('date', start)
        .lt('date', end)
        .order('id')
    ),
    fetchAllRows(() =>
      supabase.from('income').select('amount, date').gte('date', start).lt('date', end).order('id')
    ),
    fetchAllRows(() =>
      supabase.from('savings').select('amount, date').gte('date', start).lt('date', end).order('id')
    ),
    fetchAllRows(() => supabase.from('categories').select('id, name, color').order('id'))
  ]);

  const failed = firstError([expenses, income, savings, categories]);
  if (failed) return res.status(500).json({ error: failed.error.message });

  const buckets = [];
  const byMonth = new Map();
  for (let index = 1; index <= 12; index += 1) {
    const bucket = { month: `${year}-${String(index).padStart(2, '0')}`, income: 0, expense: 0, savings: 0 };
    buckets.push(bucket);
    byMonth.set(bucket.month, bucket);
  }

  const spentByCategory = new Map();
  let uncategorizedPaise = 0;

  for (const row of expenses.data) {
    const amount = toPaise(row.amount);
    const bucket = byMonth.get(String(row.date).slice(0, 7));
    if (bucket) bucket.expense += amount;
    if (row.category_id) {
      spentByCategory.set(row.category_id, (spentByCategory.get(row.category_id) ?? 0) + amount);
    } else {
      uncategorizedPaise += amount;
    }
  }

  for (const row of income.data) {
    const bucket = byMonth.get(String(row.date).slice(0, 7));
    if (bucket) bucket.income += toPaise(row.amount);
  }

  for (const row of savings.data) {
    const bucket = byMonth.get(String(row.date).slice(0, 7));
    if (bucket) bucket.savings += toPaise(row.amount);
  }

  const spentEntries = categories.data.map((category) => ({
    name: category.name,
    color: category.color,
    spentPaise: spentByCategory.get(category.id) ?? 0
  }));

  if (uncategorizedPaise > 0) {
    spentEntries.push({
      name: UNCATEGORIZED_NAME,
      color: UNCATEGORIZED_COLOR,
      spentPaise: uncategorizedPaise
    });
  }

  const breakdown = spentEntries
    .filter((entry) => entry.spentPaise > 0)
    .map((entry) => ({ name: entry.name, color: entry.color, spent: toRupees(entry.spentPaise) }))
    .sort(bySpentThenName);

  const months = buckets.map((bucket) => ({
    month: bucket.month,
    income: toRupees(bucket.income),
    expense: toRupees(bucket.expense),
    savings: toRupees(bucket.savings)
  }));

  res.json({
    year,
    months,
    income_total: toRupees(buckets.reduce((total, bucket) => total + bucket.income, 0)),
    expense_total: toRupees(buckets.reduce((total, bucket) => total + bucket.expense, 0)),
    savings_total: toRupees(buckets.reduce((total, bucket) => total + bucket.savings, 0)),
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
    fetchAllRows(() =>
      supabase
        .from('expenses')
        .select('amount, category_id')
        .gte('date', range.start)
        .lt('date', range.end)
        .order('id')
    ),
    fetchAllRows(() =>
      supabase.from('income').select('amount').gte('date', range.start).lt('date', range.end).order('id')
    ),
    fetchAllRows(() =>
      supabase.from('savings').select('amount').gte('date', range.start).lt('date', range.end).order('id')
    ),
    fetchAllRows(() => supabase.from('categories').select('id, name, color').order('id')),
    fetchAllRows(() =>
      supabase.from('budgets').select('category_id, limit_amount').eq('month', month).order('id')
    )
  ]);

  const failed = firstError([expenses, income, savings, categories, budgets]);
  if (failed) return res.status(500).json({ error: failed.error.message });

  const spentByCategory = new Map();
  let expensePaise = 0;
  let uncategorizedPaise = 0;

  for (const row of expenses.data) {
    const amount = toPaise(row.amount);
    expensePaise += amount;
    if (row.category_id) {
      spentByCategory.set(row.category_id, (spentByCategory.get(row.category_id) ?? 0) + amount);
    } else {
      uncategorizedPaise += amount;
    }
  }

  const incomePaise = income.data.reduce((total, row) => total + toPaise(row.amount), 0);
  const savingsPaise = savings.data.reduce((total, row) => total + toPaise(row.amount), 0);
  const limits = new Map(budgets.data.map((row) => [row.category_id, toPaise(row.limit_amount)]));

  const breakdown = categories.data.map((category) => {
    const spent = spentByCategory.get(category.id) ?? 0;
    const limit = limits.get(category.id) ?? 0;
    return {
      category_id: category.id,
      name: category.name,
      color: category.color,
      spent: toRupees(spent),
      limit: toRupees(limit),
      over: limit > 0 && spent > limit,
      pct: limit > 0 ? Math.round((spent / limit) * 100) : 0
    };
  });

  if (uncategorizedPaise > 0) {
    breakdown.push({
      category_id: null,
      name: UNCATEGORIZED_NAME,
      color: UNCATEGORIZED_COLOR,
      spent: toRupees(uncategorizedPaise),
      limit: 0,
      over: false,
      pct: 0
    });
  }

  breakdown.sort(bySpentThenName);

  res.json({
    month,
    income_total: toRupees(incomePaise),
    expense_total: toRupees(expensePaise),
    savings_total: toRupees(savingsPaise),
    balance: toRupees(incomePaise - expensePaise - savingsPaise),
    categories: breakdown
  });
});

export default router;
