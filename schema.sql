drop table if exists budgets cascade;
drop table if exists expenses cascade;
drop table if exists income cascade;
drop table if exists savings cascade;
drop table if exists categories cascade;

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null,
  created_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  category_id uuid references categories (id) on delete set null,
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table income (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  source text,
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table savings (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories (id) on delete cascade,
  month text not null,
  limit_amount numeric(12,2) not null default 0 check (limit_amount >= 0),
  unique (category_id, month)
);

create index expenses_date_idx on expenses (date desc);
create index income_date_idx on income (date desc);
create index savings_date_idx on savings (date desc);
create index budgets_month_idx on budgets (month);

alter table categories enable row level security;
alter table expenses enable row level security;
alter table income enable row level security;
alter table savings enable row level security;
alter table budgets enable row level security;

insert into categories (name, color) values
  ('Food', '#F97316'),
  ('Transport', '#3B82F6'),
  ('Shopping', '#EC4899'),
  ('Health', '#10B981'),
  ('Rent', '#F59E0B'),
  ('Entertainment', '#06B6D4')
on conflict (name) do nothing;
