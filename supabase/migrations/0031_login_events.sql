-- Suivi des connexions : qui vient, quand, et qui est connecté maintenant.
--
-- Le journal disait ce qui avait été modifié, jamais qui s'était connecté. Or une bonne
-- part du pilotage d'équipe tient à cela : untel a-t-il ouvert l'outil ce mois-ci, la
-- personne à qui j'ai assigné une action l'a-t-elle seulement vue.
--
-- Supabase conserve la DERNIÈRE connexion de chaque compte, mais pas l'historique : sa
-- table d'audit d'authentification est vide sur ce projet. Sans table à nous, on ne saurait
-- jamais rien du passé — d'où cet enregistrement applicatif, écrit à chaque connexion.

create table if not exists login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now(),
  user_agent text
);

create index if not exists login_events_user_at_idx on login_events (user_id, at desc);
create index if not exists login_events_at_idx on login_events (at desc);

alter table login_events enable row level security;
drop policy if exists auth_all on login_events;
create policy auth_all on login_events for all to authenticated using (true) with check (true);

-- Reprise : la dernière connexion connue de chaque compte, pour que l'écran ne parte pas
-- de zéro. Marquée comme telle, car c'est une reconstitution et non une observation.
insert into login_events (user_id, at, user_agent)
select u.id, u.last_sign_in_at, 'reprise'
  from auth.users u
 where u.last_sign_in_at is not null
   and not exists (select 1 from login_events l where l.user_id = u.id and l.at = u.last_sign_in_at);

-- Les sessions ouvertes vivent dans le schéma d'authentification, que l'API n'expose pas.
-- Cette fonction les rend consultables sans ouvrir tout le schéma.
create or replace function public.active_sessions()
returns table (user_id uuid, email text, started timestamptz, last_seen timestamptz, user_agent text)
language sql
security definer
set search_path = auth, public
as $$
  select s.user_id, u.email::text, s.created_at,
         coalesce(s.refreshed_at, s.updated_at, s.created_at), s.user_agent
    from auth.sessions s
    join auth.users u on u.id = s.user_id
   where s.not_after is null or s.not_after > now()
   order by 4 desc
$$;

revoke all on function public.active_sessions() from public, anon;
grant execute on function public.active_sessions() to authenticated;
