-- Échéance sur les points de due diligence.
--
-- Doctrine (Médéa, 2026-07-21) : « toute activité devrait avoir une échéance, sinon le
-- suivi sera infernal ». Les points de due diligence n'avaient AUCUN champ de date —
-- l'équipe doit désormais saisir une échéance dès la constitution de la liste. Colonne
-- ajoutée ici ; l'obligation est posée côté application (DueDiligenceTab), rétroactivement
-- impossible sur les points déjà créés (repérés en rouge « échéance à définir »).

alter table public.dd_items add column if not exists due_date date;
