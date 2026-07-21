-- Conversion dossier → participation : transférer L'ENSEMBLE du dossier.
--
-- Déjà repris avant cette migration (0038 + schéma) : présentation, promoteur + éval,
-- sous-secteurs, KPIs, ESG (diagnostic/actions/rating), adhésions programme, NOTES du
-- Suivi, contacts et documents.
--
-- Ce que cette migration ajoute au transfert :
--   • DUE DILIGENCE réalisée (dd_items) → suit la société (entity_type 'company').
--     Foyer d'affichage : onglet « Origine / instruction » (lecture seule) — la DD est un
--     travail d'instruction, on la garde en mémoire sans la rejouer.
--   • PASSAGES / DÉCISIONS DE COMITÉ (committee_passages) → rattachés à la société
--     (company_id posé, deal_id retiré, comme les notes en 0038 : on DÉPLACE, on ne
--     duplique pas). Foyer d'affichage : onglet « Décisions » — la décision d'entrée
--     (Favorable / Investissement) ouvre la chronologie des décisions de la participation.
--
-- Cohérent avec l'exemple donné : « décision de comités peuvent passer aux décisions
-- dans portefeuille ».

create or replace function public.convert_deal_to_portfolio(
  p_deal_id uuid, p_invested_date date, p_invested_amount numeric,
  p_ownership numeric, p_valuation numeric, p_country text default null::text
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare d deals%rowtype; new_id uuid; inv numeric;
begin
  select * into d from deals where id = p_deal_id;
  if not found then raise exception 'Dossier introuvable'; end if;
  if exists (select 1 from portfolio_companies where origin_deal_id = p_deal_id) then
    raise exception 'Ce dossier est déjà converti en participation';
  end if;
  inv := coalesce(p_invested_amount, d.amount);

  insert into portfolio_companies(
    fund_id, name, description, founded_year, city, development_stage,
    promoter_name, promoter_bio, promoter_diploma, promoter_age, promoter_gender, promoter_eval,
    primary_sub_sector_id, country, invested_date, invested_amount, currency, ownership_pct,
    current_valuation, tvpi, tri, status, origin_deal_id, investment_officer_id, analyst_id,
    program_id, tracking_type
  ) values (
    d.fund_id, d.company_name, d.description, d.founded_year, d.city, d.development_stage,
    d.promoter_name, d.promoter_bio, d.promoter_diploma, d.promoter_age, d.promoter_gender, d.promoter_eval,
    d.primary_sub_sector_id, p_country, p_invested_date, inv, coalesce(d.currency, 'XOF'),
    coalesce(p_ownership, d.ownership_target), coalesce(p_valuation, inv),
    round(coalesce(p_valuation, inv) / nullif(inv, 0), 2), null, 'Actif', p_deal_id,
    d.investment_officer_id, d.analyst_id, d.program_id, 'equity'
  ) returning id into new_id;

  insert into company_sub_sectors(company_id, sub_sector_id)
    select new_id, sub_sector_id from deal_sub_sectors where deal_id = p_deal_id on conflict do nothing;
  update tracked_kpis      set entity_type = 'company', entity_id = new_id where entity_type = 'deal' and entity_id = p_deal_id;
  update esg_assessments   set entity_type = 'company', entity_id = new_id where entity_type = 'deal' and entity_id = p_deal_id;
  update esg_actions       set entity_type = 'company', entity_id = new_id where entity_type = 'deal' and entity_id = p_deal_id;
  update esg_impact_ratings set entity_type = 'company', entity_id = new_id where entity_type = 'deal' and entity_id = p_deal_id;
  update program_memberships set entity_type = 'company', entity_id = new_id where entity_type = 'deal' and entity_id = p_deal_id;
  -- Due diligence réalisée pendant l'instruction : suit la société.
  update dd_items          set entity_type = 'company', entity_id = new_id where entity_type = 'deal' and entity_id = p_deal_id;
  -- Le journal du Suivi (notes) suit la société.
  update notes             set entity_type = 'company', entity_id = new_id where entity_type = 'deal' and entity_id = p_deal_id;
  -- Les passages en comité DEVIENNENT les décisions de la participation (on déplace).
  update committee_passages set company_id = new_id, deal_id = null where deal_id = p_deal_id;
  update contacts  set company_id = new_id where deal_id = p_deal_id;
  update documents set company_id = new_id where deal_id = p_deal_id;
  update deals set status = 'investi', updated_at = now() where id = p_deal_id;
  return new_id;
end;
$function$;

-- Backfill des conversions DÉJÀ faites (données de démonstration) pour que la due diligence
-- et les décisions d'instruction apparaissent aussi sur les participations existantes.
-- Chaque UPDATE est borné au dossier d'origine de chaque participation.

update dd_items dd
  set entity_type = 'company', entity_id = pc.id
  from portfolio_companies pc
  where pc.origin_deal_id is not null
    and dd.entity_type = 'deal' and dd.entity_id = pc.origin_deal_id;

update committee_passages cp
  set company_id = pc.id, deal_id = null
  from portfolio_companies pc
  where pc.origin_deal_id is not null
    and cp.deal_id = pc.origin_deal_id
    and cp.company_id is null;
