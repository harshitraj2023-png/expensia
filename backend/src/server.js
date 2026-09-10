import express from 'express';
import cors from 'cors';
import { timingSafeEqual } from 'node:crypto';
import categoriesRouter from './routes/categories.js';
import expensesRouter from './routes/expenses.js';
import incomeRouter from './routes/income.js';
import savingsRouter from './routes/savings.js';
import budgetsRouter from './routes/budgets.js';
import summaryRouter from './routes/summary.js';

const app = express();

const apiKey = process.env.API_KEY || '';
const apiKeyEnabled = apiKey.length > 0;
const apiKeyBuffer = Buffer.from(apiKey, 'utf8');
const isDeployed = process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';

if (isDeployed && !apiKeyEnabled) {
  console.error(
    [
      '',
      'REFUSING TO START: API_KEY is not set on a deployed server.',
      '',
      'This API talks to Supabase with the service_role key, which bypasses every',
      'database permission. Without API_KEY, anyone who learns this URL can read,',
      'modify and delete all of your financial records.',
      '',
      'Fix: in the Render dashboard open this service, go to Environment, and add',
      'an API_KEY value. Generate one with:  openssl rand -hex 32',
      'Then enter the identical value in the app under the Settings tab.',
      ''
    ].join('\n')
  );
  process.exit(1);
}

function isValidApiKey(provided) {
  if (typeof provided !== 'string' || provided.length === 0) {
    return false;
  }
  const providedBuffer = Buffer.from(provided, 'utf8');
  if (providedBuffer.length !== apiKeyBuffer.length) {
    return false;
  }
  return timingSafeEqual(providedBuffer, apiKeyBuffer);
}

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use((req, res, next) => {
  if (!apiKeyEnabled) {
    next();
    return;
  }
  if (isValidApiKey(req.get('x-api-key'))) {
    next();
    return;
  }
  res.status(401).json({ error: 'Invalid or missing API key' });
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
  console.log(
    apiKeyEnabled
      ? `API key authentication ENABLED (${isDeployed ? 'deployed' : 'local'} mode, x-api-key required on all routes except /health)`
      : 'API key authentication DISABLED (local mode, API_KEY unset — all requests are accepted without authentication)'
  );
});
