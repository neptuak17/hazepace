/**
 * The places sheet, mounted once above the screens.
 *
 * Two things open it — the place row in the header and the "choose a place"
 * action on Today's location card — so its open state lives here rather
 * than in either of them. The sheet itself is the same Sheet + body as the
 * other two; only who can open it differs.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { Sheet } from '@/components/sheet';
import { PlacesSheetBody } from '@/components/sheets';
import { SheetStrings } from '@/constants/strings';
import { useConditions } from '@/lib/conditions';
import { formatAqhi } from '@/lib/live';
import { band } from '@/lib/rating';
import { useSettings } from '@/lib/settings';

interface PlacesSheetValue {
  open: () => void;
}

const PlacesSheetContext = createContext<PlacesSheetValue | null>(null);

export function PlacesSheetProvider({ children }: { children: ReactNode }) {
  const { settings, prefs, update } = useSettings();
  const { aqhi } = useConditions();
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const value = useMemo<PlacesSheetValue>(() => ({ open }), [open]);

  // The reading in use, banded by the user's own thresholds, for the row in use.
  const observation = aqhi?.observation ?? null;
  const currentAqhi = observation ? formatAqhi(observation) : null;
  const currentLevel =
    observation && observation.value !== null ? band(observation.value, prefs) : null;

  return (
    <PlacesSheetContext.Provider value={value}>
      {children}
      <Sheet visible={visible} title={SheetStrings.placesTitle} onClose={close}>
        <PlacesSheetBody
          manualPlace={settings.manualPlace}
          currentAqhi={currentAqhi}
          currentLevel={currentLevel}
          onUseDevice={() => {
            update({ manualPlace: null });
            close();
          }}
          onPick={(manualPlace) => {
            update({ manualPlace });
            close();
          }}
        />
      </Sheet>
    </PlacesSheetContext.Provider>
  );
}

export function usePlacesSheet(): PlacesSheetValue {
  const ctx = useContext(PlacesSheetContext);
  if (!ctx) throw new Error('usePlacesSheet must be used inside a PlacesSheetProvider');
  return ctx;
}
