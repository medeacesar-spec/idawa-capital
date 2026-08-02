"use client";

import { createContext, useContext, useState } from "react";

// État partagé de la barre latérale sur mobile : le bouton ☰ (dans l'en-tête) l'ouvre,
// la barre et le fond cliquable la referment. Sur desktop, la barre est toujours visible
// et cet état n'a aucun effet (CSS).
const Ctx = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

export const useMobileNav = () => useContext(Ctx);
