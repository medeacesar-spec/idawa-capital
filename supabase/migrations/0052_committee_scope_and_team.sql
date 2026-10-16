-- Séances de comité : périmètre (fonds OU programme) qui détermine les types de comité proposés,
-- et membres de l'équipe Idawa invités au même titre que les membres extérieurs.

alter table public.committee_sessions
  add column if not exists fund_id uuid references public.funds(id) on delete set null,
  add column if not exists program_id uuid references public.programs(id) on delete set null;

do $$ begin
  alter table public.committee_sessions add constraint committee_sessions_scope_chk
    check (num_nonnulls(fund_id, program_id) <= 1);
exception when duplicate_object then null; end $$;

alter table public.committee_session_members
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;
create unique index if not exists committee_members_profile_uq
  on public.committee_session_members(session_id, profile_id) where profile_id is not null;
