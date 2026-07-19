-- Le post-mortem doit être daté : on horodate sa dernière rédaction.
-- La réactivation, elle, est historisée comme une note datée du Suivi (pas de colonne).
alter table deals
  add column if not exists post_mortem_at timestamptz;
