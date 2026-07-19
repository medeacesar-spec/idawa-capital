-- Présentation du dossier alignée sur celle de la société (Identité + Profil),
-- et bloc Promoteur enrichi + évaluation, sur les dossiers ET les sociétés.

-- 1) Présentation du dossier : mêmes champs d'identité/profil que portfolio_companies.
alter table deals
  add column if not exists description text,           -- Profil de l'entreprise
  add column if not exists founded_year int,           -- Identité : année de création
  add column if not exists city text,                  -- Identité : ville
  add column if not exists development_stage text;      -- Identité : stade de développement

-- 2) Promoteur : descriptif + évaluation, symétriques sur les deux entités.
--    L'évaluation (5 critères notés + justification + synthèse) tient dans un jsonb.
alter table deals
  add column if not exists promoter_name text,
  add column if not exists promoter_bio text,
  add column if not exists promoter_diploma text,
  add column if not exists promoter_age int,
  add column if not exists promoter_gender text,        -- Femme / Homme / Non binaire
  add column if not exists promoter_eval jsonb;

alter table portfolio_companies
  add column if not exists promoter_name text,
  add column if not exists promoter_bio text,
  add column if not exists promoter_diploma text,
  add column if not exists promoter_age int,
  add column if not exists promoter_gender text,
  add column if not exists promoter_eval jsonb;
