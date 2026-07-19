import { fillTemplate } from './fillTemplate.js';
import fs from 'node:fs';
const buf = fillTemplate('/Users/mdegbe/idawa-capital/src/assets/templates/fiche-entreprise-ip.xlsx', {
  "Donnees figees": { B2: "AgriPlus", B3: "Rita Hounkpatin", B5: "Transformation agroalimentaire", B6: "Bénin", B8: 2024 },
  "Performance": { E1: "2024-12-31", F1: "2025-12-31", E4: 272910083, F4: 322033898, E6: 60040219, F6: 70847457 },
});
fs.writeFileSync('/tmp/fiche_remplie.xlsx', buf);
console.log('produit :', Math.round(buf.length/1024), 'Ko (modèle : 378 Ko)');
