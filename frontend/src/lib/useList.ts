"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ListParams, type Resource } from "./api";
import type { ListMeta } from "./types";

interface ListResult<T> {
  key: string; // which request this result belongs to
  data: T[];
  meta: ListMeta;
  error: string | null;
}

// Fetches a page of a resource and refetches whenever params change.
// Pass enabled=false to skip fetching (e.g. until the needed params are known).
export function useList<T>(resource: Resource, params: ListParams, enabled = true) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<ListResult<T>>({
    key: "",
    data: [],
    meta: { page: 1, limit: 10, total: 0 },
    error: null,
  });

  const paramsKey = JSON.stringify(params);
  const requestKey = `${resource}|${paramsKey}|${version}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    api
      .list<T>(resource, JSON.parse(paramsKey))
      .then((res) => {
        if (!cancelled) setResult({ key: requestKey, data: res.data, meta: res.meta, error: null });
      })
      .catch((e: Error) => {
        if (!cancelled) setResult((prev) => ({ ...prev, key: requestKey, error: e.message }));
      });
    return () => {
      cancelled = true;
    };
  }, [resource, paramsKey, requestKey, enabled]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  // Still loading while the latest result belongs to an older request.
  const loading = enabled && result.key !== requestKey;
  return { data: result.data, meta: result.meta, error: result.error, loading, reload };
}

// Fetches every row of a resource (100 per request, the API's page limit).
// For pickers that must offer all rows, e.g. choosing a signatory from all employees.
export function useAll<T>(resource: Resource, params: ListParams = {}, enabled = true) {
  const [result, setResult] = useState<{ key: string; data: T[]; error: string | null }>({
    key: "",
    data: [],
    error: null,
  });
  const paramsKey = JSON.stringify(params);
  const requestKey = `${resource}|${paramsKey}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const rows: T[] = [];
      for (let page = 1; ; page++) {
        const res = await api.list<T>(resource, { ...JSON.parse(paramsKey), page, limit: 100 });
        rows.push(...res.data);
        if (rows.length >= res.meta.total || res.data.length === 0) break;
      }
      return rows;
    })()
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, data, error: null });
      })
      .catch((e: Error) => {
        if (!cancelled) setResult({ key: requestKey, data: [], error: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [resource, paramsKey, requestKey, enabled]);

  const loading = enabled && result.key !== requestKey;
  return { data: result.data, error: result.error, loading };
}

// Returns `value` only after it stops changing for `delay` ms (for search boxes).
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
