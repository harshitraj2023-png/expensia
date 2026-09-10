import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Copy backend/.env.example to backend/.env and fill in both values from your Supabase project settings.'
  );
}

export const supabase = createClient(url, serviceKey);
