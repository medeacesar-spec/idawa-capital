-- Domaines de permission « contacts » et « documents ».
--
-- Ces deux écrans globaux n'avaient aucune colonne dans la matrice des rôles : leur accès
-- était déduit d'un autre domaine, ce qui n'était ni lisible ni réglable. Ils deviennent
-- des domaines à part entière, modifiables comme les autres depuis Utilisateurs & rôles.
--
-- Ce que gouvernent ces domaines : le RÉPERTOIRE GLOBAL et la BIBLIOTHÈQUE de documents.
-- Les contacts et documents rattachés à un dossier ou à une société restent gouvernés par
-- la permission de la fiche (pipeline ou portefeuille), là où se fait le travail quotidien.
--
-- Niveaux retenus par défaut, alignés sur ce que chaque rôle fait déjà ailleurs :
--   Administrateur, Direction, Chargé d'investissement : édition
--   Analyste, Responsable ESG, Responsable Financier   : lecture (ils alimentent depuis les fiches)
--   Auditeur, Observateur / LP                          : lecture

update roles set permissions = permissions
  || jsonb_build_object('contacts', 'E', 'documents', 'E')
where name in ('Administrateur', 'Associé / Direction', 'Chargé d''investissement');

update roles set permissions = permissions
  || jsonb_build_object('contacts', 'L', 'documents', 'L')
where name in ('Analyste', 'Responsable ESG', 'Responsable Financier', 'Auditeur', 'Observateur / LP');

-- Filet : tout rôle personnalisé créé depuis reçoit au moins la lecture, jamais un trou.
update roles set permissions = permissions
  || jsonb_build_object(
       'contacts', coalesce(permissions ->> 'contacts', 'L'),
       'documents', coalesce(permissions ->> 'documents', 'L')
     )
where permissions ->> 'contacts' is null or permissions ->> 'documents' is null;
