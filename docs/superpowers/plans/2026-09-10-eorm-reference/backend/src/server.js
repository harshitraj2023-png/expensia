import express from 'express';
import cors from 'cors';
import categoriesRouter from './routes/categories.js';
import expensesRouter from './routes/expenses.js';
import incomeRouter from './routes/income.js';
import savingsRouter from './routes/savings.js';
import budgetsRouter from './routes/budgets.js';
import summaryRouter from './routes/summary.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/categories', categoriesRouter);
app.use('/expenses', expensesRouter);
app.use('/income', incomeRouter);
app.use('/savings', savingsRouter);
app.use('/budgets', budgetsRouter);
app.use('/summary', summaryRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

const port = process.env.PORT || 4000;

app.listen(port, '0.0.0.0', () => {
  console.log(`EORM backend listening on http://0.0.0.0:${port}`);
});
