-- Décisions structurantes prises en Comité d'investissement, validées par la Direction :
--   • Investissement (sur un dossier) → débloque la conversion en participation
--   • Sortie / Radiation (sur une société) → bascule le statut Sorti / Radié
-- Rend committee_passages rattachable à une société + mémorise la nature de la décision.
-- À exécuter dans Supabase → SQL Editor.

alter table public.committee_passages
  add column if not exists company_id uuid references public.portfolio_companies(id) on delete cascade,
  add column if not exists outcome text check (outcome in ('Investissement', 'Sortie', 'Radiation'));

-- Colonnes de validation (déjà présentes si le circuit comités a été appliqué ;
-- « if not exists » les rend sûres à rejouer).
alter table public.committee_passages
  add column if not exists status text default 'Proposée',
  add column if not exists validated_by uuid references public.profiles(id),
  add column if not exists validated_at timestamptz;
