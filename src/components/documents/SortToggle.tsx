"use client";

export type DocSort = "recent" | "alpha";

export default function SortToggle({ sort, setSort, alphaLabel = "A → Z" }: { sort: DocSort; setSort: (s: DocSort) => void; alphaLabel?: string }) {
  const opts: { id: DocSort; label: string }[] = [
    { id: "recent", label: "Récents" },
    { id: "alpha", label: alphaLabel },
  ];
  return (
    <div style={{ display: "inline-flex", gap: 2, background: "var(--surface-cream)", border: "1px solid var(--border)", borderRadius: 999, padding: 3 }}>
      {opts.map((o) => {
        const on = o.id === sort;
        return (
          <button key={o.id} onClick={() => setSort(o.id)}
            style={{ padding: "5px 12px", borderRadius: 999, fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: "none",
              background: on ? "var(--espresso)" : "transparent", color: on ? "#fff" : "var(--text-2)" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
