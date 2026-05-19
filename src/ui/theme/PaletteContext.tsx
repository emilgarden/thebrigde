/**
 * Palett-kontekst — auto (tid på døgnet) eller manuell overstyring.
 *
 * Auto-modus oppdateres hvert minutt. Lyssensor-styring kommer i
 * en senere iter (CURSOR.md paletteManager.ts).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  PALETTES,
  PaletteColors,
  PaletteMode,
  PaletteName,
  paletteFromHour,
} from './palettes';

interface PaletteContextValue {
  colors: PaletteColors;
  mode: PaletteMode;
  activePalette: PaletteName;
  setMode: (mode: PaletteMode) => void;
  sourceLabel: string;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function PaletteProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [mode, setModeState] = useState<PaletteMode>('auto');
  const [activePalette, setActivePalette] = useState<PaletteName>(
    paletteFromHour(new Date().getHours())
  );

  const applyAuto = useCallback(() => {
    setActivePalette(paletteFromHour(new Date().getHours()));
  }, []);

  useEffect(() => {
    if (mode !== 'auto') {
      setActivePalette(mode);
      return;
    }
    applyAuto();
    const iv = setInterval(applyAuto, 60_000);
    return () => clearInterval(iv);
  }, [mode, applyAuto]);

  const setMode = useCallback((m: PaletteMode) => {
    setModeState(m);
  }, []);

  const colors = PALETTES[activePalette];

  const sourceLabel = useMemo(() => {
    if (mode === 'auto') {
      const h = new Date().getHours();
      return `Auto — time of day ${String(h).padStart(2, '0')}:xx · ${activePalette}`;
    }
    return `Manual — ${mode}`;
  }, [mode, activePalette]);

  const value = useMemo(
    () => ({ colors, mode, activePalette, setMode, sourceLabel }),
    [colors, mode, activePalette, setMode, sourceLabel]
  );

  return (
    <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
  );
}

export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('usePalette must be used within PaletteProvider');
  return ctx;
}
