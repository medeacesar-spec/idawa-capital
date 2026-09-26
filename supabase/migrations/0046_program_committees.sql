-- Comités propres à un programme (ex. Catal1.5°T : Comité d'éligibilité, Mandate Fit-Check).
-- Liste JSON [{ "name": text, "opens": bool }] : proposée, en plus des comités Idawa, sur les
-- dossiers rattachés au programme. « opens » = vaut comité d'ouverture de dossier, donc fait
-- passer le dossier en Pipeline avancé comme le Comité d'ouverture de dossier.
alter table public.programs add column if not exists committees jsonb;
