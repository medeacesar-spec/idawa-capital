-- Plusieurs méthodes de valorisation et plusieurs pistes de sortie possibles.
-- Les colonnes texte deviennent des tableaux ; les valeurs existantes sont reprises.

alter table public.portfolio_companies
  add column if not exists valuation_methods_entry text[],
  add column if not exists valuation_methods_current text[],
  add column if not exists exit_scenarios text[];

update public.portfolio_companies
   set valuation_methods_entry = array[valuation_method_entry]
 where valuation_method_entry is not null and valuation_method_entry <> ''
   and (valuation_methods_entry is null or cardinality(valuation_methods_entry) = 0);

update public.portfolio_companies
   set valuation_methods_current = array[valuation_method_current]
 where valuation_method_current is not null and valuation_method_current <> ''
   and (valuation_methods_current is null or cardinality(valuation_methods_current) = 0);

update public.portfolio_companies
   set exit_scenarios = array[exit_scenario]
 where exit_scenario is not null and exit_scenario <> ''
   and (exit_scenarios is null or cardinality(exit_scenarios) = 0);
