-- Source d'entrée d'un dossier dans le pipeline (pour analyses par source de deal flow).
-- À exécuter dans Supabase → SQL Editor.
alter table public.deals
  add column if not exists deal_source text;
