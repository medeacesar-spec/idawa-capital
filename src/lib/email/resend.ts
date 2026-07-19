// Envoi d'emails transactionnels via l'API Resend (serveur uniquement).
// Sans RESEND_API_KEY, l'envoi est ignoré proprement (on retombe sur le lien à copier).

const FROM = "Idawa Capital <noreply@idawacapital.com>";

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function accessEmail({ fullName, link, kind }: { fullName?: string | null; link: string; kind: "invite" | "recovery" }): { subject: string; html: string } {
  const isInvite = kind === "invite";
  const subject = isInvite ? "Votre accès à Idawa Capital" : "Réinitialisation de votre mot de passe — Idawa Capital";
  const heading = isInvite ? "Bienvenue sur Idawa Capital" : "Réinitialisation du mot de passe";
  const hello = fullName ? `Bonjour ${fullName},` : "Bonjour,";
  const intro = isInvite
    ? "Un compte vous a été créé sur la plateforme Idawa Capital. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace."
    : "Une réinitialisation de votre mot de passe a été demandée. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.";
  const cta = isInvite ? "Définir mon mot de passe" : "Réinitialiser mon mot de passe";

  const html = `<!doctype html><html><body style="margin:0;background:#FAF6F0;font-family:Arial,Helvetica,sans-serif;color:#33200F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6F0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #EAE0D3;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#3A1E12;padding:22px 28px;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:#FAF6F0;letter-spacing:.5px;">IDAWA CAPITAL</div>
        </td></tr>
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:19px;color:#4A2617;">${heading}</h1>
          <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">${hello}</p>
          <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#5A4636;">${intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:9px;background:#4A2617;">
            <a href="${link}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:9px;">${cta}</a>
          </td></tr></table>
          <p style="margin:22px 0 6px;font-size:12px;color:#7A6552;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
          <p style="margin:0 0 22px;font-size:12px;word-break:break-all;"><a href="${link}" style="color:#A9714B;">${link}</a></p>
          <p style="margin:0;font-size:12px;color:#A8937E;">Ce lien est valable un temps limité. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #F0E8DC;">
          <p style="margin:0;font-size:11px;color:#A8937E;">Idawa Capital — Le partenaire en capital des PME béninoises.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;

  return { subject, html };
}

const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const longDate = (d: string) => `${parseInt(d.slice(8, 10), 10)} ${MONTHS_FR[parseInt(d.slice(5, 7), 10) - 1] ?? ""} ${d.slice(0, 4)}`;

/**
 * Email d'affectation d'une action.
 * On dit d'emblée QUOI, SUR QUI et POUR QUAND : le destinataire doit pouvoir décider s'il
 * agit maintenant sans ouvrir l'application.
 */
export function assignmentEmail({ fullName, assignedBy, kind, title, dueDate, entityName, link }: {
  fullName?: string | null;
  assignedBy?: string | null;
  kind: string;
  title: string;
  dueDate?: string | null;
  entityName: string;
  link: string;
}): { subject: string; html: string } {
  const subject = `${kind} à traiter — ${entityName}`;
  const hello = fullName ? `Bonjour ${fullName},` : "Bonjour,";
  const by = assignedBy ? `${assignedBy} vous a assigné` : "Vous avez été assigné à";
  const echeance = dueDate
    ? `<p style="margin:0 0 4px;font-size:14px;"><span style="color:#7A6552;">Échéance</span> &nbsp;<b style="color:#4A2617;">${longDate(dueDate)}</b></p>`
    : `<p style="margin:0 0 4px;font-size:13px;color:#A8937E;">Aucune échéance fixée.</p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#FAF6F0;font-family:Helvetica,Arial,sans-serif;color:#33200F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6F0;padding:28px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:14px;border:1px solid #EAE0D3;">
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:19px;color:#4A2617;">${kind} à traiter</h1>
          <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">${hello}</p>
          <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#5A4636;">${by} une action sur <b>${entityName}</b>.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF7F1;border-radius:11px;border:1px solid #F0E8DC;margin:0 0 22px;">
            <tr><td style="padding:14px 16px;">
              <p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#33200F;line-height:1.5;">${title}</p>
              ${echeance}
            </td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:9px;background:#4A2617;">
            <a href="${link}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:bold;color:#FFFFFF;text-decoration:none;border-radius:9px;">Ouvrir la fiche</a>
          </td></tr></table>
          <p style="margin:22px 0 6px;font-size:12px;color:#7A6552;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
          <p style="margin:0 0 8px;font-size:12px;word-break:break-all;"><a href="${link}" style="color:#A9714B;">${link}</a></p>
        </td></tr>
        <tr><td style="padding:18px 28px 26px;border-top:1px solid #F0E8DC;">
          <p style="margin:0;font-size:11px;color:#A8937E;">Idawa Capital — Le partenaire en capital des PME béninoises.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;

  return { subject, html };
}
