-- Mettre en veille reçoit la même fiche que « Écarter » : un motif horodaté au dossier.
-- Symétrique de rejection_reason (0008), pour l'état « En veille ».
alter table deals
  add column if not exists standby_reason text;
