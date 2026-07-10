"use client";

type C = {
  email?: string | null; phone?: string | null; whatsapp?: string | null;
  website?: string | null; linkedin?: string | null; twitter?: string | null; instagram?: string | null;
};

function normUrl(v?: string | null) { if (!v) return null; const s = v.trim(); return /^https?:\/\//i.test(s) ? s : `https://${s}`; }
function handleUrl(base: string, v?: string | null) { if (!v) return null; const s = v.trim(); if (/^https?:\/\//i.test(s)) return s; return base + s.replace(/^@/, ""); }
function waUrl(v?: string | null) { if (!v) return null; const d = v.replace(/[^0-9]/g, ""); return d ? `https://wa.me/${d}` : null; }

const ICON: Record<string, React.ReactNode> = {
  email: <path d="M4 5h16v14H4z M4 6l8 6 8-6" />,
  phone: <path d="M22 16.9v2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 3.2 2 2 0 0 1 4 1h2a2 2 0 0 1 2 1.7c.1.8.4 1.6.7 2.4a2 2 0 0 1-.5 2.1L7 8.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.6.6 2.4.7A2 2 0 0 1 22 16.9z" />,
  whatsapp: <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z M8.5 8c.2-.5.4-.5.7-.5h.5c.2 0 .4 0 .6.5l.7 1.6c.1.2 0 .4-.1.5l-.5.6c-.1.1-.2.3-.1.5a5 5 0 0 0 2.5 2.2c.2.1.4.1.5-.1l.5-.6c.2-.2.4-.2.6-.1l1.5.8c.2.1.3.3.3.5 0 .8-.6 1.5-1.4 1.6-1 .1-2.5 0-4.6-1.9C8 11.7 7.7 10 7.9 9c.1-.4.3-.7.6-1z" />,
  website: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
  linkedin: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 10v7" /></>,
  twitter: <path d="M4 4l16 16M20 4L4 20" />,
  instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.5" /></>,
};

const COLOR: Record<string, string> = {
  email: "#8A5A3C", phone: "#5C4634", whatsapp: "#25955A", website: "#185FA5",
  linkedin: "#185FA5", twitter: "#2A1810", instagram: "#B03A6E",
};

export default function ChannelIcons({ c, size = 28 }: { c: C; size?: number }) {
  const links: [string, string | null][] = [
    ["email", c.email ? `mailto:${c.email}` : null],
    ["phone", c.phone ? `tel:${c.phone.replace(/\s/g, "")}` : null],
    ["whatsapp", waUrl(c.whatsapp)],
    ["website", normUrl(c.website)],
    ["linkedin", handleUrl("https://linkedin.com/in/", c.linkedin)],
    ["twitter", handleUrl("https://x.com/", c.twitter)],
    ["instagram", handleUrl("https://instagram.com/", c.instagram)],
  ];
  const present = links.filter(([, href]) => href);
  if (present.length === 0) return null;
  const s = Math.round(size * 0.55);
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {present.map(([key, href]) => (
        <a key={key} href={href!} target={href!.startsWith("http") ? "_blank" : undefined} rel="noreferrer" title={key} aria-label={key}
          onClick={(e) => e.stopPropagation()}
          style={{ width: size, height: size, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-cream)", border: "1px solid var(--border)", color: COLOR[key], flexShrink: 0 }}>
          <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICON[key]}</svg>
        </a>
      ))}
    </div>
  );
}
