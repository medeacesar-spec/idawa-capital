-- Une société peut relever de PLUSIEURS programmes en même temps.
--
-- Jusqu'ici le rattachement tenait dans une seule colonne, portfolio_companies.program_id.
-- Or une même PME peut être suivie au titre d'Agri-PME et de Femmes Entrepreneures, et
-- l'obliger à choisir fausse le pilotage des deux programmes.
--
-- La table program_memberships existait déjà — datée, prévue pour l'historique — mais
-- n'avait jamais été alimentée. On s'appuie dessus plutôt que d'ajouter un nouveau modèle.
--
-- program_id RESTE sur la société et devient le programme PRINCIPAL. C'est lui, et lui
-- seul, qui compte dans les répartitions et les totaux du fonds : sans programme de
-- référence, une société rattachée à deux programmes serait comptée deux fois.
-- Même principe que le sous-secteur principal.

-- Reprise : chaque société rattachée obtient une adhésion ouverte à son programme actuel.
insert into program_memberships (entity_type, entity_id, program_id, date_start, note)
select 'company', pc.id, pc.program_id, coalesce(pc.invested_date, current_date), 'Reprise du rattachement existant'
  from portfolio_companies pc
 where pc.program_id is not null
   and not exists (
     select 1 from program_memberships m
      where m.entity_type = 'company' and m.entity_id = pc.id and m.program_id = pc.program_id
   );

-- Une société ne peut pas adhérer deux fois au même programme sur une période ouverte.
-- Les adhésions closes (date_end renseignée) restent libres : c'est l'historique.
create unique index if not exists program_memberships_one_open_per_program
  on program_memberships (entity_type, entity_id, program_id)
  where date_end is null;

create index if not exists program_memberships_entity_idx
  on program_memberships (entity_type, entity_id)
  where date_end is null;
