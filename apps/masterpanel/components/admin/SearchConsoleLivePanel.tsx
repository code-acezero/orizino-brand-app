"use client";
import React, { useMemo, useState } from "react";
import { useServerFn } from "@orizino/shared/lib/server-fn-compat";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/app-toast";
import { RefreshCw, ExternalLink, TrendingUp, Loader2 } from "lucide-react";
import {
  listSearchConsoleSites,
  getSearchConsoleSummary,
  listSearchConsoleSitemaps,
  submitSearchConsoleSitemap,
} from "@/src/lib/search-console.functions";

export function SearchConsoleLivePanel() {
  const listSites = useServerFn(listSearchConsoleSites);
  const getSummary = useServerFn(getSearchConsoleSummary);
  const listMaps = useServerFn(listSearchConsoleSitemaps);
  const submitMap = useServerFn(submitSearchConsoleSitemap);

  const [siteUrl, setSiteUrl] = useState<string>("");
  const [feedpath, setFeedpath] = useState<string>("");

  const sitesQ = useQuery({
    queryKey: ["gsc-sites"],
    queryFn: () => listSites(),
    retry: false,
  });

  const sites = sitesQ.data?.sites ?? [];
  const selected = siteUrl || sites[0]?.siteUrl || "";

  const summaryQ = useQuery({
    queryKey: ["gsc-summary", selected],
    queryFn: () => getSummary({ data: { siteUrl: selected, days: 28 } }),
    enabled: !!selected,
    retry: false,
  });

  const mapsQ = useQuery({
    queryKey: ["gsc-sitemaps", selected],
    queryFn: () => listMaps({ data: { siteUrl: selected } }),
    enabled: !!selected,
    retry: false,
  });

  const submitMut = useMutation({
    mutationFn: () => submitMap({ data: { siteUrl: selected, feedpath } }),
    onSuccess: () => {
      toast.success("Sitemap submitted to Google");
      setFeedpath("");
      mapsQ.refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to submit"),
  });

  const totals = summaryQ.data?.totals;
  const top = summaryQ.data?.topQueries ?? [];

  const error = (sitesQ.error as Error | null)?.message;

  const suggestedFeed = useMemo(() => {
    if (!selected) return "";
    try {
      const u = new URL(selected);
      return `${u.origin}/sitemap.xml`;
    } catch {
      return "";
    }
  }, [selected]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Live Search Console Data
            </CardTitle>
            <CardDescription>
              Connected via Google account — last 28 days
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {sitesQ.isFetching && <Loader2 className="w-4 h-4 animate-spin" />}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sitesQ.refetch();
                summaryQ.refetch();
                mapsQ.refetch();
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-sm text-destructive">
            {error}
          </div>
        ) : sitesQ.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading properties…</div>
        ) : sites.length === 0 ? (
          <div className="p-3 rounded-lg border border-border text-sm text-muted-foreground">
            No verified properties found in the connected Google account.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Property</label>
              <Select value={selected} onValueChange={setSiteUrl}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a verified property" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.siteUrl} value={s.siteUrl}>
                      {s.siteUrl}{" "}
                      <span className="text-xs text-muted-foreground">
                        · {s.permissionLevel}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {summaryQ.isLoading ? (
              <div className="text-sm text-muted-foreground">Loading data…</div>
            ) : summaryQ.error ? (
              <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-sm text-destructive">
                {(summaryQ.error as Error).message}
              </div>
            ) : totals ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Metric label="Clicks" value={totals.clicks.toLocaleString()} />
                  <Metric label="Impressions" value={totals.impressions.toLocaleString()} />
                  <Metric label="CTR" value={`${(totals.avgCtr * 100).toFixed(2)}%`} />
                  <Metric label="Avg. Position" value={totals.avgPos.toFixed(1)} />
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Top Queries</div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2">Query</th>
                          <th className="text-right px-3 py-2">Clicks</th>
                          <th className="text-right px-3 py-2">Impr.</th>
                          <th className="text-right px-3 py-2">CTR</th>
                          <th className="text-right px-3 py-2">Pos.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {top.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-3 py-3 text-muted-foreground">
                              No queries in range
                            </td>
                          </tr>
                        ) : (
                          top.map((q: any) => (
                            <tr key={q.query} className="border-t border-border">
                              <td className="px-3 py-2 truncate max-w-[240px]">{q.query}</td>
                              <td className="px-3 py-2 text-right">{q.clicks}</td>
                              <td className="px-3 py-2 text-right">{q.impressions}</td>
                              <td className="px-3 py-2 text-right">{(q.ctr * 100).toFixed(1)}%</td>
                              <td className="px-3 py-2 text-right">{q.position.toFixed(1)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            <div className="space-y-2 pt-2 border-t border-border">
              <div className="text-sm font-medium">Sitemaps</div>
              {mapsQ.data?.sitemaps?.length ? (
                <ul className="text-xs space-y-1">
                  {mapsQ.data.sitemaps.map((m: any) => (
                    <li key={m.path} className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {m.isPending ? "Pending" : "Submitted"}
                      </Badge>
                      <span className="font-mono truncate">{m.path}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-muted-foreground">No sitemaps submitted yet.</div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder={suggestedFeed || "https://example.com/sitemap.xml"}
                  value={feedpath}
                  onChange={(e) => setFeedpath(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => submitMut.mutate()}
                  disabled={!feedpath || submitMut.isPending}
                >
                  {submitMut.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://search.google.com/search-console?resource_id=${encodeURIComponent(selected)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Open in Google Search Console
                </a>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}
