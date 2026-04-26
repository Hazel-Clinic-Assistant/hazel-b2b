-- Add a data column to clinics so dynamic clinic configs can be stored
alter table clinics add column if not exists data jsonb not null default '{}'::jsonb;
