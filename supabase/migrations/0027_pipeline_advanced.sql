-- Pipeline avancé, prochaine étape, post-mortem (retours de Nouss Bih).
--
-- Trois manques sur le pipeline :
--
-- 1. Aucun palier ne distinguait un dossier simplement repéré d'un dossier réellement
--    engagé. C'est pourtant ce qui décide du travail à fournir — et des écrans à montrer :
--    l'ESG et la création de valeur n'ont pas de sens sur un dossier qu'on vient de sourcer.
--    « Pipeline avancé » s'intercale donc entre l'analyse et la due diligence.
--
-- 2. En comité, la question qui revient est « et ensuite ? ». Elle n'avait pas de place :
--    elle finissait noyée dans les notes de suivi.
--
-- 3. Un dossier écarté ne laissait qu'un motif en une ligne. Ce qu'on apprend d'un dossier
--    perdu est précisément ce qui améliore les suivants.

alter table deals drop constraint if exists deals_stage_check;
alter table deals add constraint deals_stage_check
  check (stage in (
    'Sourcing', 'Analyse', 'Pipeline avancé', 'Due Diligence', 'Négociation', 'Closing',
    'Investi', 'Perdu'
  ));

alter table deals
  add column if not exists next_step text,
  add column if not exists next_step_date date,
  add column if not exists post_mortem text;

comment on column deals.next_step is 'Prochaine action décidée sur le dossier, avec son échéance.';
comment on column deals.post_mortem is 'Ce que l''on retient d''un dossier écarté, pour les suivants.';
