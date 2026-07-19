"use client";

// Sauvegarde différée d'un champ. Le « save au blur » s'est révélé peu fiable (l'écriture
// ne partait pas toujours), tandis qu'un save déclenché par la frappe fonctionne à coup
// sûr — au prix d'une écriture par caractère. Ce hook garde la fiabilité de la frappe en
// n'écrivant qu'une fois la frappe arrêtée (par défaut 700 ms).

import { useEffect, useRef } from "react";

export function useDebouncedSave<T>(value: T, initial: T, save: (v: T) => void | Promise<void>, delayMs = 700) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(initial);

  useEffect(() => {
    // On n'écrit pas la valeur d'origine : seule une modification déclenche une sauvegarde.
    if (value === initialRef.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(value); }, delayMs);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [value, save, delayMs]);
}
