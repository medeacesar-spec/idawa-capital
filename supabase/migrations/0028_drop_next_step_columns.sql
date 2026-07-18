-- Retrait des colonnes next_step / next_step_date, ajoutées à tort par la 0027.
--
-- Une tâche du Suivi porte déjà un titre, un responsable, une échéance et un statut.
-- Un champ « prochaine étape » distinct offrait un second endroit où noter la même chose :
-- les deux auraient fini par se contredire, et rien n'aurait dit lequel faisait foi.
--
-- La prochaine étape est désormais DÉDUITE : c'est la tâche ouverte à l'échéance la plus
-- proche, simplement remontée en tête de fiche. Aucune donnée à stocker, donc aucune à
-- désynchroniser. Les colonnes n'ont jamais été alimentées, leur retrait ne perd rien.
--
-- post_mortem est conservée : elle n'a pas d'équivalent ailleurs.

alter table deals
  drop column if exists next_step,
  drop column if exists next_step_date;
