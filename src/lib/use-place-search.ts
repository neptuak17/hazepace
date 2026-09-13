/**
 * Debounced place search for the places sheet.
 *
 * One request in flight at a time: each keystroke waits DEBOUNCE_MS, then
 * cancels whatever the previous keystroke started. A cancelled request
 * resolves as 'aborted' and is ignored, so results never arrive out of order.
 *
 * `idle` is the state below the minimum query length. It is distinct from
 * `ready` with no places, which is a search that ran and found nothing.
 */
import { useEffect, useState } from 'react';

import { MIN_QUERY_LENGTH, normaliseQuery, searchPlaces } from '@/lib/geocode';
import type { ManualPlace } from '@/lib/place';

const DEBOUNCE_MS = 300;

export type PlaceSearchStatus = 'idle' | 'searching' | 'ready' | 'error';

export interface PlaceSearch {
  status: PlaceSearchStatus;
  /** The query the current `places` answer. Empty while idle. */
  query: string;
  places: ManualPlace[];
}

export function usePlaceSearch(rawQuery: string): PlaceSearch {
  const query = normaliseQuery(rawQuery);
  const active = query.length >= MIN_QUERY_LENGTH;

  const [result, setResult] = useState<PlaceSearch>({ status: 'idle', query: '', places: [] });

  useEffect(() => {
    if (!active) {
      setResult({ status: 'idle', query: '', places: [] });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      // Previous places stay on screen while the new search runs, so the list
      // does not flash empty between keystrokes.
      setResult((cur) => ({ ...cur, status: 'searching' }));
      const r = await searchPlaces(query, controller.signal);
      if (controller.signal.aborted) return;
      if (r.ok) {
        setResult({ status: 'ready', query, places: r.places });
      } else if (r.error.kind !== 'aborted') {
        setResult({ status: 'error', query, places: [] });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, query]);

  return result;
}
