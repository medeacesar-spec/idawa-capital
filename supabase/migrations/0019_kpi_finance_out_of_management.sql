-- Les KPIs financiers doivent vivre dans la famille « Financier », jamais dans
-- « Management » (RH & Management). Huit indicateurs sectoriels avaient échappé
-- au nettoyage précédent (produit net bancaire, ROE, coût du risque, etc.).

-- 1) Supprimer ceux qui existent déjà à l'identique en Financier (même sous-secteur).
delete from public.kpi_library m
 where m.category = 'Management'
   and exists (
     select 1 from public.kpi_library f
      where f.category = 'Financier'
        and f.name = m.name
        and f.sub_sector_id is not distinct from m.sub_sector_id
   );

-- 2) Basculer les autres en Financier.
update public.kpi_library
   set category = 'Financier'
 where category = 'Management'
   and name in (
     'Coût de production / ha',
     'Produits d''intérêts',
     'Coût du risque',
     'Résultat technique',
     'Produit net bancaire',
     'Rendement des fonds propres (ROE)',
     'Coût matière (%)',
     'Revenus récurrents (droits)'
   );
