"use client";

import { useState, useEffect, useRef } from "react";
import { autocomplete, type Suggestion } from "@/lib/location";

export default function useLocationSearch(query: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (query.length < 3) {
      if (suggestions.length > 0) setSuggestions([]); // eslint-disable-line react-hooks/set-state-in-effect
      if (loading) setLoading(false); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await autocomplete(query);
      setSuggestions(results);
      setLoading(false);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { suggestions, loading };
}
