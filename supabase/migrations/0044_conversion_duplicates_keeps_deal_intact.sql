-- Conversion dossier → participation : DUPLIQUER, ne pas déplacer. Le dossier reste ARCHIVÉ
-- et INTACT (état converti) ; la société garde toute l'information historique du pipeline.
--
-- Correctif de doctrine (Médéa, 2026-07-21) : « quand je dis déplacer, je veux dire dupliquer.
-- La fiche du dossier est archivée, conservée telle quelle. La fiche du portefeuille garde
-- toute l'information historique du pipeline pour que rien ne se perde. »
-- Les versions 0038/0043 DÉPLAÇAIENT (le dossier se retrouvait vidé). On corrige.
--
-- Trois mécaniques, selon la nature de la donnée et le schéma :
--   1) Données qui se POURSUIVENT après investissement (la société continue de les alimenter)
--      → COPIE de lignes indépendantes : tracked_kpis (+ kpi_values), esg_*, program_memberships.
--      Le dossier garde ses originaux ; la société démarre avec une copie qu'elle fait vivre.
--   2) Données d'INSTRUCTION affichées en historique (notes, due diligence)
--      → AUCUNE copie : elles restent sur le dossier et la société les lit « en transparence »
--      dans l'onglet « Origine / instruction » (lecture seule). Voir companyDetail.ts.
--   3) Tables à DOUBLE CLÉ (deal_id ET company_id sur la même ligne)
--      → on garde deal_id et on ajoute company_id : une ligne, visible des deux côtés
--      (committee_passages, contacts, documents).

create or replace function public.convert_deal_to_portfolio(
  p_deal_id uuid, p_invested_date date, p_invested_amount numeric,
  p_ownership numeric, p_valuation numeric, p_country text default null::text
) returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare d deals%rowtype; new_id uuid; inv numeric; k record; new_kpi uuid;
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

  -- Sous-secteurs : copie (le dossier garde deal_sub_sectors).
  insert into company_sub_sectors(company_id, sub_sector_id)
    select new_id, sub_sector_id from deal_sub_sectors where deal_id = p_deal_id on conflict do nothing;

  -- (1) KPIs + historique de valeurs : COPIE avec nouveaux identifiants.
  for k in select * from tracked_kpis where entity_type = 'deal' and entity_id = p_deal_id loop
    insert into tracked_kpis(entity_type, entity_id, kind, category, name, unit, target, direction)
      values ('company', new_id, k.kind, k.category, k.name, k.unit, k.target, k.direction)
      returning id into new_kpi;
    insert into kpi_values(tracked_kpi_id, period, value)
      select new_kpi, period, value from kpi_values where tracked_kpi_id = k.id;
  end loop;

  -- (1) ESG (diagnostic, plan d'action, rating d'impact) : copies.
  insert into esg_assessments(entity_type, entity_id, exclusion_ok, ehs_sector, risk_category)
    select 'company', new_id, exclusion_ok, ehs_sector, risk_category
    from esg_assessments where entity_type = 'deal' and entity_id = p_deal_id;
  insert into esg_actions(entity_type, entity_id, category, action, priority, responsible_code,
      cost_estimate, deliverable, benefit, status, date_start_plan, date_end_plan,
      date_start_real, date_end_real, comment, assignee_id)
    select 'company', new_id, category, action, priority, responsible_code,
      cost_estimate, deliverable, benefit, status, date_start_plan, date_end_plan,
      date_start_real, date_end_real, comment, assignee_id
    from esg_actions where entity_type = 'deal' and entity_id = p_deal_id;
  insert into esg_impact_ratings(entity_type, entity_id, dimension, score, max_score, note)
    select 'company', new_id, dimension, score, max_score, note
    from esg_impact_ratings where entity_type = 'deal' and entity_id = p_deal_id;

  -- (1) Adhésions programme : copies.
  insert into program_memberships(entity_type, entity_id, program_id, date_start, date_end, note)
    select 'company', new_id, program_id, date_start, date_end, note
    from program_memberships where entity_type = 'deal' and entity_id = p_deal_id
    on conflict do nothing;

  -- (2) Notes et due diligence : PAS de copie. Elles restent sur le dossier et sont lues en
  --     transparence par la société (onglet « Origine / instruction »). Le dossier reste intact.

  -- (3) Comités, contacts, documents : double clé → on garde deal_id, on ajoute company_id.
  update committee_passages set company_id = new_id where deal_id = p_deal_id;
  update contacts  set company_id = new_id where deal_id = p_deal_id;
  update documents set company_id = new_id where deal_id = p_deal_id;

  update deals set status = 'investi', updated_at = now() where id = p_deal_id;
  return new_id;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Réparation des dossiers déjà convertis que 0043 avait VIDÉS (déplacement).
-- On rétablit chaque dossier intact ; la lecture en transparence côté société reprend alors.
-- Idempotent.
-- ---------------------------------------------------------------------------

-- DD : 0043 avait déplacé dd_items du dossier vers la société. On les REMET sur le dossier
-- (la société n'a pas d'onglet DD propre : elle lit ceux du dossier en transparence).
update dd_items dd
  set entity_type = 'deal', entity_id = pc.origin_deal_id
  from portfolio_companies pc
  where dd.entity_type = 'company' and dd.entity_id = pc.id and pc.origin_deal_id is not null
    and not exists (
      select 1 from dd_items d2 where d2.entity_type = 'deal' and d2.entity_id = pc.origin_deal_id
    );

-- Comités : 0043 avait retiré deal_id. On rétablit le partage (deal_id + company_id).
update committee_passages cp
  set deal_id = pc.origin_deal_id
  from portfolio_companies pc
  where cp.company_id = pc.id and cp.deal_id is null and pc.origin_deal_id is not null;
