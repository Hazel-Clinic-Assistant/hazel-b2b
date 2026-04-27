drop table if exists demo_requests;

create table demo_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_name text not null,
  name text not null,
  clinic_url text not null,
  email text not null,
  created_at timestamptz not null default now()
);
