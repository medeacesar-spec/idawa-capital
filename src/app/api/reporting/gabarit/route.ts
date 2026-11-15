import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { getMyPermissions, can } from "@/lib/auth/permissions";

// Gabarits vierges (fondés sur les outils de Saint-André) : point de départ du classeur d'une entreprise.
export const runtime = "nodejs";
const FILES = {
  tdb: { file: path.join(process.cwd(), "src/assets/templates/gabarit-tdb-mensuel.xlsx"), name: "TdB mensuel – GABARIT.xlsx" },
  ef: { file: path.join(process.cwd(), "src/assets/templates/gabarit-analyses-ef.xlsx"), name: "Analyses EF – GABARIT.xlsx" },
} as const;

export async function GET(req: Request) {
  const { perms } = await getMyPermissions();
  if (!can(perms, "portefeuille", "L")) return new NextResponse("Accès refusé.", { status: 403 });
  const t = (new URL(req.url).searchParams.get("type") ?? "tdb") as keyof typeof FILES;
  const f = FILES[t] ?? FILES.tdb;
  return new NextResponse(new Uint8Array(readFileSync(f.file)), { headers: {
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.name)}`,
  } });
}
