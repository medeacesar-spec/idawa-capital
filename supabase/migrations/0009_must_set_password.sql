-- Force un utilisateur invité à définir son mot de passe avant d'accéder à l'app.
-- À exécuter dans Supabase → SQL Editor.
alter table public.profiles
  add column if not exists must_set_password boolean default false;
