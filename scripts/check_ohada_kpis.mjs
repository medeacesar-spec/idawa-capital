// Contrôle : chaque indicateur du jeu OHADA doit être reconnu par l'alimentation
// automatique. Sinon on proposerait à l'utilisateur un KPI « normalisé » qu'il devrait
// quand même saisir à la main — exactement ce qu'on cherche à supprimer.
//
//   node scripts/check_ohada_kpis.mjs
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/lib/finance/kpiSources.ts", import.meta.url), "utf8");

const rules = [...src.matchAll(/\{ match: (\/.+?\/i),/g)].map((m) => {
  const body = m[1].slice(1, -2);
  return new RegExp(body, "i");
});
const names = [...src.matchAll(/\{ name: "([^"]+)", code:/g)].map((m) => m[1]);

let bad = 0;
for (const name of names) {
  const hit = rules.findIndex((r) => r.test(name));
  if (hit === -1) { console.log(`  ❌ ${name} — aucune règle d'alimentation`); bad++; }
}
console.log(`${names.length} indicateurs OHADA, ${rules.length} règles d'alimentation.`);
if (bad) { console.log(`\n${bad} indicateur(s) sans alimentation automatique.`); process.exit(1); }
console.log("✅ Tous les indicateurs du jeu OHADA sont alimentés automatiquement.");
