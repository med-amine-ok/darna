"use client";

import { useEffect, useRef, useState } from "react";
import { quoteBookingAction, type BookingSelection } from "@/app/actions/bookings";
import type { ActionError } from "@/lib/action-result";
import type { ServerQuote } from "@/lib/booking/pricing";

/** Wait this long after the last change before asking for a price (dates and counters change in bursts). */
const DEBOUNCE_MS = 350;

/**
 * Price of the guest's current selection, computed by the backend
 * (POST /quotes through quoteBookingAction). The browser never computes a
 * price. Requests are debounced, and only the answer to the latest selection
 * is kept (server actions cannot be aborted, so stale answers are dropped).
 *
 * Pass `null` while the selection is incomplete or fails the widget's own
 * checks: no request is made and the previous quote is cleared.
 */
export function useServerQuote(selection: BookingSelection | null): {
  quote: ServerQuote | null;
  loading: boolean;
  error: ActionError | null;
} {
  const [quote, setQuote] = useState<ServerQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ActionError | null>(null);
  const latest = useRef(0);
  const key = selection ? JSON.stringify(selection) : "";

  useEffect(() => {
    const ticket = ++latest.current;
    if (!key) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      quoteBookingAction(JSON.parse(key) as BookingSelection)
        .then((result) => {
          if (ticket !== latest.current) return;
          if (result.ok) {
            setQuote(result.data);
            setError(null);
          } else {
            setQuote(null);
            setError({ code: result.code, params: result.params });
          }
        })
        .catch(() => {
          if (ticket !== latest.current) return;
          setQuote(null);
          setError({ code: "SERVER_ERROR" });
        })
        .finally(() => {
          if (ticket === latest.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [key]);

  return { quote, loading, error };
}
