-- Élargir le journal d'accès : pas seulement les connexions réussies.
--
-- Puisque nous tenons ce journal nous-mêmes, autant qu'il réponde à toutes les questions
-- d'accès et pas à une seule :
--   · qui vient, et à quelle fréquence ;
--   · qui est reparti, et comment (déconnexion volontaire ou expiration d'inactivité) ;
--   · qui a ÉCHOUÉ à se connecter — une série d'échecs sur un compte est le premier signe
--     d'une tentative d'intrusion, et c'était totalement invisible jusqu'ici ;
--   · depuis quel appareil et quelle adresse, pour reconnaître un accès inhabituel.
--
-- Un échec n'a pas d'utilisateur identifié (l'email peut ne correspondre à aucun compte) :
-- user_id devient donc facultatif, et l'email tenté est conservé tel quel.

alter table login_events rename to auth_events;

alter table auth_events
  add column if not exists kind text not null default 'connexion',
  add column if not exists email text,
  add column if not exists ip text;

alter table auth_events alter column user_id drop not null;

alter table auth_events drop constraint if exists auth_events_kind_check;
alter table auth_events add constraint auth_events_kind_check
  check (kind in ('connexion', 'échec', 'déconnexion', 'expiration', 'mot de passe'));

-- L'email des connexions déjà enregistrées, pour que l'historique reste lisible même
-- si un compte est supprimé par la suite.
update auth_events e
   set email = u.email
  from auth.users u
 where u.id = e.user_id and e.email is null;

create index if not exists auth_events_kind_at_idx on auth_events (kind, at desc);

comment on table auth_events is
  'Journal des accès : connexions, échecs, déconnexions et expirations de session.';
