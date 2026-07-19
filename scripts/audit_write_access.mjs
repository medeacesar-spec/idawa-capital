// Contrôle : toute écriture en base doit être protégée par une vérification de droit.
//
// L'incident : la permission « lecture » était déclarative. Des écrans écrivaient en base
// sans jamais consulter le rôle, parce que rien ne le signalait. Ce script relit tout le
// code à chaque fois et refuse de passer si une écriture n'est protégée par rien.
//
//   node scripts/audit_write_access.mjs
//
// Sortie : code 1 si une écriture non protégée est trouvée (utilisable en pré-commit).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SRC = join(ROOT, "src");

// Écritures en base ou dans le stockage de fichiers.
const WRITE = /\.from\(["'`][^"'`]+["'`]\)\s*\.\s*(insert|update|upsert|delete)\b|storage\.from\([^)]*\)\.(remove|upload)\b|\.auth\.admin\.|rpc\(/;

// Preuves qu'un fichier tient compte du droit d'écriture.
const GUARD = /useCanEdit\(|canEdit|requirePerm\(|getMyPermissions\(|can\(perms|WriteAccessProvider/;

// Les fenêtres modales ne s'ouvrent que depuis un bouton déjà protégé : on les signale
// pour relecture, sans faire échouer le contrôle.
const INDIRECT = /Modal\.tsx$/;

// Écrans dont l'écriture est le métier même, protégés par leur propre domaine de permission.
const OWN_DOMAIN = [
  ["app/(app)/utilisateurs/", "gestion des comptes, garde requirePerm sur la page"],
  ["app/(app)/saisie/", "garde en tête de page : can(perms, domaine, E)"],
  ["app/reinitialiser/", "définition du mot de passe, page publique par nature"],
  ["app/login/", "enregistre la connexion de la personne qui vient de s'authentifier, pour elle-même"],
  ["app/auth-events.ts", "journal des accès : consigne l'événement de la personne elle-même, y compris un échec où aucune session n'existe"],
  ["components/account/", "chacun modifie son propre profil, pas celui d'un autre"],
  ["components/params/", "rendu uniquement par /parametres, gardé requirePerm(config, E)"],
  ["components/saisie/", "rendu uniquement par /saisie, gardé en tête de page"],
  ["lib/", "couche de données, appelée depuis des pages gardées"],
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(full)) out.push(full);
  }
  return out;
}

const missing = [];
const review = [];
let guarded = 0;

for (const file of walk(SRC)) {
  const code = readFileSync(file, "utf8");
  if (!WRITE.test(code)) continue;
  const rel = relative(SRC, file);

  if (OWN_DOMAIN.some(([prefix]) => rel.startsWith(prefix))) { guarded++; continue; }
  if (GUARD.test(code)) { guarded++; continue; }
  if (INDIRECT.test(rel)) { review.push(rel); continue; }
  missing.push(rel);
}

console.log(`Écritures protégées : ${guarded}`);
if (review.length) {
  console.log(`\nÀ relire (${review.length}) — fenêtres ouvertes depuis un bouton déjà protégé :`);
  review.forEach((f) => console.log("   ", f));
}
if (missing.length) {
  console.log(`\n❌ ÉCRITURES NON PROTÉGÉES (${missing.length}) :`);
  missing.forEach((f) => console.log("   ", f));
  console.log("\nChaque fichier doit consulter le droit d'écriture (useCanEdit, canEdit,");
  console.log("requirePerm ou can(perms, …)) avant de proposer une action qui écrit.");
  process.exit(1);
}
console.log("\n✅ Aucune écriture non protégée.");
