-- Multi-programmes pour les DOSSIERS aussi.
--
-- La 0026 avait ouvert le rattachement multiple aux sociétés du portefeuille, mais s'était
-- arrêtée là. Or un dossier en instruction peut relever de plusieurs programmes tout autant
-- qu'une participation — c'est même souvent à ce moment qu'on hésite entre deux enveloppes.
-- La table des adhésions prévoit déjà entity_type = 'deal' : elle n'était simplement pas
-- alimentée pour eux.
--
-- Comme pour les sociétés, deals.program_id RESTE le programme PRINCIPAL : lui seul compte
-- dans l'entonnoir et les montants en jeu, sinon un dossier rattaché à deux programmes
-- serait compté deux fois.

insert into program_memberships (entity_type, entity_id, program_id, date_start, note)
select 'deal', d.id, d.program_id, coalesce(d.created_at::date, current_date), 'Reprise du rattachement existant'
  from deals d
 where d.program_id is not null
   and not exists (
     select 1 from program_memberships m
      where m.entity_type = 'deal' and m.entity_id = d.id and m.program_id = d.program_id
   );
