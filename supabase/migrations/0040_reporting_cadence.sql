-- Cadence de collecte des données d'entreprise : mensuelle par défaut (demande Saint-André),
-- avec possibilité de repasser au trimestriel — globalement ou par type de données.
--
-- Format : { "default": "mensuelle" | "trimestrielle",
--            "reporting"?, "support"?, "kpis"?, "financials"? : même valeurs | null (= suit le défaut) }
alter table funds
  add column if not exists reporting_cadence jsonb not null default '{"default":"mensuelle"}'::jsonb;
