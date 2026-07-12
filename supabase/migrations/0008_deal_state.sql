-- État du dossier dans le pipeline, distinct de l'étape (funnel) :
--   Actif (en cours) · En veille (à réexaminer) · Écarté (abandonné, avec motif)
-- « Investi » n'est pas un état stocké : il se déduit de l'existence de la participation liée.
-- À exécuter dans Supabase → SQL Editor.

alter table public.deals
  add column if not exists deal_state text default 'Actif' check (deal_state in ('Actif', 'En veille', 'Écarté')),
  add column if not exists rejection_reason text;
