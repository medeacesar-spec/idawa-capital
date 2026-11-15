-- Début du suivi des dépôts : les périodes antérieures (entreprise entrée en cours d'année)
-- ne sont pas attendues et ne doivent jamais apparaître « en retard ».
alter table public.company_reporting_setup
  add column if not exists starts_on date not null default date_trunc('month', now())::date;
