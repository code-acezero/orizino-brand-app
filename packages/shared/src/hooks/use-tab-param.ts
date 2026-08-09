"use client";
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "../lib/router-compat";

/**
 * Sync a Tabs `value` with the `?tab=` URL search param so sidebar children
 * can deep-link into a page's sub-section.
 */
export function useTabParam(defaultValue: string, basePath: string) {
  const location = useLocation();
  const navigate = useNavigate();
  const urlTab =
    new URLSearchParams(location.search).get("tab") || defaultValue;
  const [tab, setTabState] = useState(urlTab);

  useEffect(() => {
    setTabState(urlTab);
  }, [urlTab]);

  const setTab = useCallback(
    (v: string) => {
      setTabState(v);
      navigate(
        v === defaultValue ? basePath : `${basePath}?tab=${v}`,
        { replace: true }
      );
    },
    [navigate, basePath, defaultValue]
  );

  return [tab, setTab] as const;
}
// code:4ce0
