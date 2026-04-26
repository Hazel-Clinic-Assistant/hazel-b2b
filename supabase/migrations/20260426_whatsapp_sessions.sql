create table if not exists whatsapp_sessions (
  id          uuid        primary key default gen_random_uuid(),
  phone       text        not null,
  clinic_id   text        not null default 'demo-clinic',
  messages    jsonb       not null default '[]',
  state       text        not null default 'new',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists whatsapp_sessions_phone_updated
  on whatsapp_sessions (phone, updated_at desc);
