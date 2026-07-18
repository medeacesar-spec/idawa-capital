-- PHASE 1b-2 — Suivi des créances réelles par échéance d'un instrument de dette.
-- L'échéancier prévisionnel est calculé ; ici on enregistre le RÉALISÉ :
-- ce qui a été facturé, ce qui a été encaissé, et à quelle date.

create table if not exists public.instrument_payments (
  id uuid primary key default gen_random_uuid(),
  instrument_id uuid references public.financing_instruments(id) on delete cascade,
  period_no integer not null,          -- n° de l'échéance dans l'échéancier
  due_date date,                       -- date d'échéance (report de l'échéancier)
  amount_invoiced numeric,             -- facturé
  amount_paid numeric,                 -- encaissé
  paid_date date,                      -- date d'encaissement
  note text,
  created_at timestamptz default now(),
  unique (instrument_id, period_no)
);

create index if not exists idx_instrument_payments_instrument on public.instrument_payments(instrument_id);

alter table public.instrument_payments enable row level security;
do $$ begin
  create policy instrument_payments_auth_all on public.instrument_payments
    for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
