import { NextResponse } from "next/server";
import { getMyPermissions } from "@/lib/auth/permissions";
import { SharePointError } from "@/lib/sharepoint/graph";
import { addFile, checkIntegrity, writeConfigured } from "@/lib/sharepoint/write";

// Contrôle de la chaîne d'écriture (administrateur seulement) :
//   POST → dépose un petit PDF daté dans « Idawa Depots/_Controle de connexion », inscrit au journal ;
//   GET  → vérifie les empreintes des fichiers déjà déposés.
// Ajout seulement : le contrôle ne modifie ni ne supprime rien.

async function admin() {
  const { perms } = await getMyPermissions();
  return perms.users === "E";
}
const fail = (e: unknown) => NextResponse.json({ ok: false, error: e instanceof SharePointError ? e.message : "Erreur inattendue" },
  { status: e instanceof SharePointError ? e.status : 500 });

function controlPdf(text: string): Uint8Array {
  const body = `BT /F1 12 Tf 50 750 Td (${text.replace(/[()\\]/g, " ")}) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${body.length} >>\nstream\n${body}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n"; const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((n) => `${String(n).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(out, "latin1"));
}

export async function POST() {
  if (!(await admin())) return NextResponse.json({ ok: false, error: "Réservé à l'administrateur" }, { status: 403 });
  if (!writeConfigured()) return NextResponse.json({ ok: false, error: "Écriture SharePoint non configurée (variables Vercel)" }, { status: 503 });
  try {
    const r = await addFile({ companyId: null, companyName: "controle", kind: "controle", period: null, version: null,
      originalName: "controle-ecriture.pdf", bytes: controlPdf(`Controle d'ecriture de l'ERP Idawa - ${new Date().toISOString()}`),
      fileKind: "pdf", origin: "controle" });
    return NextResponse.json({ ok: true, path: r.path, webUrl: r.webUrl, sha256: r.sha256, quickXor: r.quickXor });
  } catch (e) { return fail(e); }
}

export async function GET() {
  if (!(await admin())) return NextResponse.json({ ok: false, error: "Réservé à l'administrateur" }, { status: 403 });
  try { return NextResponse.json({ ok: true, ...(await checkIntegrity()) }); } catch (e) { return fail(e); }
}
