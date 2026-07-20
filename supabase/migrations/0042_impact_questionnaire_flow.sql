-- Circuit d'envoi/collecte du questionnaire d'impact : l'entrepreneur remplit via un lien
-- public (jeton non devinable), Idawa relit et valide.
alter table public.impact_questionnaires
  add column if not exists token uuid not null default gen_random_uuid(),
  add column if not exists status text not null default 'Brouillon' check (status in ('Brouillon', 'Envoyé', 'Reçu', 'Validé')),
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists sent_at timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by uuid references public.profiles(id) on delete set null;

create unique index if not exists impact_q_token_idx on public.impact_questionnaires (token);
