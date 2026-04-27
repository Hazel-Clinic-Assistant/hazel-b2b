create table if not exists demo_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null,
  contact_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);
