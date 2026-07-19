-- Journal d'audit : consigner CE QUI a changé, pas seulement que quelque chose a changé.
--
-- Le journal disait « Médéa a modifié la participation PayNow le 12 juillet ». Utile pour
-- retracer une activité, insuffisant pour un audit : on ne pouvait pas savoir si elle avait
-- corrigé une faute de frappe ou divisé une valorisation par deux. Devant un auditeur ou un
-- bailleur, c'est précisément la différence qui compte.
--
-- On stocke donc, pour chaque modification, les seuls champs RÉELLEMENT modifiés, avec leur
-- valeur avant et après. Conserver la ligne entière gonflerait le journal sans rien
-- apprendre, et y ferait dormir des données recopiées à chaque écriture.

alter table audit_log add column if not exists changes jsonb;

comment on column audit_log.changes is
  'Champs modifiés : { "champ": { "avant": ..., "apres": ... } }. Null sur création et suppression.';

create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
as $function$
declare
  rec jsonb; before jsonb; lbl text; rid uuid; diff jsonb := '{}'::jsonb; k text;
begin
  rec := to_jsonb(coalesce(NEW, OLD));
  begin rid := (rec->>'id')::uuid; exception when others then rid := null; end;
  lbl := coalesce(rec->>'name', rec->>'company_name', rec->>'title', rec->>'action',
                  rec->>'initiative', rec->>'item', rec->>'holder', rec->>'label',
                  rec->>'committee_type', '');

  if TG_OP = 'UPDATE' then
    before := to_jsonb(OLD);
    for k in select jsonb_object_keys(rec) loop
      -- Les horodatages techniques changent à chaque écriture sans rien signifier.
      if k not in ('id', 'created_at', 'updated_at') and (before -> k) is distinct from (rec -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('avant', before -> k, 'apres', rec -> k));
      end if;
    end loop;
    -- Une écriture qui ne change rien (ré-enregistrement à l'identique) n'a pas à figurer
    -- au journal : elle le remplirait de bruit et masquerait les vraies modifications.
    if diff = '{}'::jsonb then
      return coalesce(NEW, OLD);
    end if;
  end if;

  insert into public.audit_log(table_name, row_id, action, actor_id, label, changes)
  values (TG_TABLE_NAME, rid, TG_OP, auth.uid(), left(lbl, 120),
          case when TG_OP = 'UPDATE' then diff else null end);
  return coalesce(NEW, OLD);
end $function$;
