"use client";

import { useCallback, useEffect, useState } from "react";
import type { TableStatus } from "@/components/data-table/types";

type ListBody<T> = {
  data?: T[];
  total?: number;
  pageIndex?: number;
  error?: string;
};

export function useMockList<T>(url: string) {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [pageIndex, setPageIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<TableStatus>("loading");
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [requestKey, setRequestKey] = useState(`${url}::${attempt}`);
  const nextKey = `${url}::${attempt}`;

  if (requestKey !== nextKey) {
    setRequestKey(nextKey);
    setStatus("loading");
    setError(undefined);
  }

  const reload = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        let body: ListBody<T> = {};
        try {
          body = (await response.json()) as ListBody<T>;
        } catch {
          body = {};
        }
        if (!response.ok) {
          throw new Error(body.error || "The request failed. Try again.");
        }
        if (controller.signal.aborted) return;
        setRows(body.data ?? []);
        setTotal(body.total ?? body.data?.length ?? 0);
        setPageIndex(typeof body.pageIndex === "number" ? body.pageIndex : null);
        setStatus("ready");
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return;
        if (caught instanceof Error && caught.name === "AbortError") return;
        setRows([]);
        setTotal(0);
        setPageIndex(null);
        setStatus("error");
        setError(
          caught instanceof Error && caught.message
            ? caught.message
            : "The request failed. Try again.",
        );
      });

    return () => controller.abort();
  }, [attempt, url]);

  return { rows, total, pageIndex, status, error, reload };
}
