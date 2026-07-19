-- Journal d'audit : chaque ligne doit être rattachable à SON entreprise / dossier.
--
-- Avant, le libellé (colonne ÉLÉMENT) ne prenait que le nom propre de la ligne :
-- un Document affichait son titre, une Action E&S son intitulé, un Diagnostic ESG « — ».
-- Impossible de savoir SUR QUELLE société. On résout donc l'entité parente (via
-- entity_type/entity_id, ou company_id, ou deal_id) et on préfixe le libellé par son nom.
-- N'affecte que les entrées FUTURES (les libellés déjà enregistrés ne sont pas réécrits).

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
as $function$
declare
  rec jsonb; before jsonb; lbl text; rid uuid; diff jsonb := '{}'::jsonb; k text;
  parent text := null; ent_type text; ent_id uuid; d_id uuid; c_id uuid;
begin
  rec := to_jsonb(coalesce(NEW, OLD));
  begin rid := (rec->>'id')::uuid; exception when others then rid := null; end;

  -- Nom propre de la ligne.
  lbl := coalesce(rec->>'name', rec->>'company_name', rec->>'title', rec->>'action',
                  rec->>'initiative', rec->>'item', rec->>'holder', rec->>'label',
                  rec->>'committee_type', '');

  -- Entité parente : d'abord entity_type/entity_id, sinon company_id, sinon deal_id.
  ent_type := rec->>'entity_type';
  begin ent_id := (rec->>'entity_id')::uuid; exception when others then ent_id := null; end;
  begin d_id := (rec->>'deal_id')::uuid;    exception when others then d_id := null; end;
  begin c_id := (rec->>'company_id')::uuid;  exception when others then c_id := null; end;

  if ent_type = 'company' and ent_id is not null then
    select name into parent from portfolio_companies where id = ent_id;
  elsif ent_type = 'deal' and ent_id is not null then
    select company_name into parent from deals where id = ent_id;
  elsif c_id is not null then
    select name into parent from portfolio_companies where id = c_id;
  elsif d_id is not null then
    select company_name into parent from deals where id = d_id;
  end if;

  -- Préfixer par l'entreprise/dossier, sans dupliquer si le libellé l'est déjà.
  if parent is not null and parent <> '' then
    if lbl is null or lbl = '' then
      lbl := parent;
    elsif lbl <> parent then
      lbl := parent || ' · ' || lbl;
    end if;
  end if;

  if TG_OP = 'UPDATE' then
    before := to_jsonb(OLD);
    for k in select jsonb_object_keys(rec) loop
      if k not in ('id', 'created_at', 'updated_at') and (before -> k) is distinct from (rec -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('avant', before -> k, 'apres', rec -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then
      return coalesce(NEW, OLD);
    end if;
  end if;

  insert into public.audit_log(table_name, row_id, action, actor_id, label, changes)
  values (TG_TABLE_NAME, rid, TG_OP, auth.uid(), left(lbl, 160),
          case when TG_OP = 'UPDATE' then diff else null end);
  return coalesce(NEW, OLD);
end $function$;
