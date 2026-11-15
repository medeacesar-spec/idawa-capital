-- Classeur de référence de chaque entreprise (conçu par l'équipe à partir du gabarit, puis intégré).
--
-- Les particularités d'une entreprise (produits, matières, stocks…) vivent dans SON classeur Excel :
-- l'ERP n'a rien à paramétrer ligne par ligne. À l'intégration, il vérifie le classeur et retient la
-- liste de ses codes ; à chaque dépôt, un code inconnu (nouveau produit…) est signalé à l'équipe,
-- qui le valide d'un clic.

alter table public.sharepoint_writes drop constraint if exists sharepoint_writes_kind_check;
alter table public.sharepoint_writes add constraint sharepoint_writes_kind_check
  check (kind in ('mensuel', 'annuel', 'releve', 'controle', 'modele'));

create table if not exists public.company_models (
  company_id uuid primary key references public.portfolio_companies(id) on delete cascade,
  write_id uuid references public.sharepoint_writes(id) on delete set null,
  original_name text,
  codes jsonb not null default '[]'::jsonb,      -- codes reconnus (intégration + nouvelles lignes validées)
  lines_count int,
  warnings jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

-- Codes d'un dépôt absents du classeur de référence (à valider par l'équipe).
alter table public.deposits add column if not exists new_codes jsonb not null default '[]'::jsonb;
-- Nature (flux / solde / taux), onglet d'origine et composition des groupes, lus dans la Synthèse ERP V2.
alter table public.deposit_lines add column if not exists meta jsonb;

alter table public.company_models enable row level security;
do $$ begin
  create policy company_models_auth_all on public.company_models for all to authenticated using (true) with check (true);
exception when duplicate_object then null; end $$;
drop trigger if exists trg_audit on public.company_models;
create trigger trg_audit after insert or update or delete on public.company_models for each row execute function public.audit_trigger();
