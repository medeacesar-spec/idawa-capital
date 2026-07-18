-- Aligner la valorisation affichée sur la dernière valorisation ARRÊTÉE.
--
-- portfolio_companies.current_valuation était saisie à part, sans lien avec l'historique :
-- la fiche pouvait afficher 720 M alors que le comité d'audit avait arrêté 1 050 M.
-- Désormais la référence, c'est l'arrêté le plus récent — et l'application la recalcule
-- à chaque validation. Cette migration rattrape l'existant.
--
-- Les sociétés sans aucune valorisation arrêtée gardent leur valeur saisie : on ne
-- l'efface pas, faute de mieux, tant qu'aucun arrêté n'existe.

update portfolio_companies pc
   set current_valuation = v.amount
  from (
    select distinct on (company_id) company_id, amount
      from company_flows
     where type = 'Valorisation' and status = 'Validée'
     order by company_id, fiscal_year desc, flow_date desc
  ) v
 where v.company_id = pc.id
   and (pc.current_valuation is distinct from v.amount);
