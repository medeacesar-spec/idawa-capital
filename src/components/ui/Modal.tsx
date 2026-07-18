"use client";

import { useEffect } from "react";

export default function Modal({
  title,
  onClose,
  children,
  footer,
  maxWidth = 480,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Élargir la fenêtre pour les contenus tabulaires (écran de vérification d'import). */
  maxWidth?: number;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(51,32,15,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth, maxHeight: "90vh", overflowY: "auto", padding: 0 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", borderBottom: "1px solid var(--sep)", position: "sticky", top: 0, background: "var(--surface)", borderRadius: "14px 14px 0 0" }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{title}</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, display: "flex" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div style={{ padding: "18px 20px" }}>{children}</div>
        {footer && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--sep)", display: "flex", justifyContent: "flex-end", gap: 10, position: "sticky", bottom: 0, background: "var(--surface)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
