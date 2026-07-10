// Contenu provisoire d'un écran en attendant sa construction (Phases 3-5).
export default function Placeholder({ phase }: { phase: string }) {
  return (
    <div
      className="card"
      style={{ padding: "40px 32px", display: "flex", alignItems: "center", gap: 16 }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "var(--accent-soft)",
          color: "var(--espresso)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" />
        </svg>
      </div>
      <div>
        <div className="serif" style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)" }}>
          Écran en cours de construction
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 3 }}>
          La coquille et la navigation sont en place. Cet écran sera construit en {phase}.
        </div>
      </div>
    </div>
  );
}
