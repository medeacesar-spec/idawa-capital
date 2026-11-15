-- Suivi des entreprises (feuille de route, phases 2 et 3).
--
-- 1. company_reporting_setup : pour chaque entreprise du portefeuille, QUI dépose (référent),
--    QUAND (ouverture le 25, échéance le 10 du mois suivant, décalages saisonniers fixés à l'avance)
--    et QUI suit chez Idawa (chargé + suppléant). Le jeton servira au lien personnel de dépôt.
-- 2. sharepoint_writes : journal de CHAQUE écriture de l'ERP dans le site « Idawa Depots »
--    (ajout seulement), avec empreintes : SHA-256 calculée par l'ERP et quickXorHash donnée par
--    SharePoint, pour détecter toute modification ultérieure du fichier.

create table if not exists public.company_reporting_setup (
  company_id uuid primary key references public.portfolio_companies(id) on delete cascade,
  referent_name text,
  referent_email text,
  referent_phone text,                    -- avec indicatif, sert aussi au bouton WhatsApp
  charge_id uuid references public.profiles(id) on delete set null,
  suppleant_id uuid references public.profiles(id) on delete set null,
  expects_monthly boolean not null default true,
  expects_annual boolean not null default true,
  open_day smallint not null default 25 check (open_day between 1 and 28),
  due_day smallint not null default 10 check (due_day between 1 and 28),
  annual_due_month smallint not null default 4 check (annual_due_month between 1 and 12),
  annual_due_day smallint not null default 30 check (annual_due_day between 1 and 31),
  -- [{ "months": [4,5,6,7,8], "extra_days": 3 }] : mois de reporting concernés et jours accordés en plus
  seasonal_shifts jsonb not null default '[]'::jsonb,
  token uuid not null unique default gen_random_uuid(),
  token_revoked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sharepoint_writes (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  company_id uuid references public.portfolio_companies(id) on delete set null,
  kind text not null check (kind in ('mensuel', 'annuel', 'releve', 'controle')),
  period text,
  version int,
  path text not null,
  item_id text,
  web_url text,
  size bigint,
  sha256 text not null,
  quick_xor text,
  origin text not null default 'depot',   -- depot (lien personnel) | equipe | controle
  deposit_id uuid,
  last_checked_at timestamptz,
  integrity text                          -- null (pas encore vérifié) | ok | modifie | introuvable
);
create index if not exists idx_sharepoint_writes_company on public.sharepoint_writes(company_id, at desc);

do $$
declare t text;
begin
  foreach t in array array['company_reporting_setup', 'sharepoint_writes'] loop
    execute format('alter table public.%I enable row level security', t);
    begin
      execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', t || '_auth_all', t);
    exception when duplicate_object then null;
    end;
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or delete or update on public.%I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;
