-- Précision / nom de la source d'entrée (ex. type « Incubateur » → nom « Etrilabs »).
-- À exécuter dans Supabase → SQL Editor.
alter table public.deals
  add column if not exists deal_source_detail text;
