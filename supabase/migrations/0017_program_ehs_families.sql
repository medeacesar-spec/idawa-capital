-- Un PROGRAMME peut couvrir PLUSIEURS familles de secteurs EHS (et non une seule).
-- Ces familles ne sont qu'un défaut : une société peut relever d'une autre famille.

alter table public.programs
  add column if not exists ehs_families text[];

-- Reprise de l'ancienne valeur unique (colonne ehs_sector) dans le tableau.
update public.programs
   set ehs_families = array[ehs_sector]
 where ehs_sector is not null
   and ehs_sector <> ''
   and (ehs_families is null or cardinality(ehs_families) = 0);
