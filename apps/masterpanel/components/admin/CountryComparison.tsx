"use client";
import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Minus, GitCompareArrows, Download } from "lucide-react";

interface CountryComparisonProps {
  analyticsData: any[];
}

const PERIOD_OPTIONS = [
  { label: "7d vs 7d", current: 7, previous: 7 },
  { label: "30d vs 30d", current: 30, previous: 30 },
  { label: "7d vs 30d", current: 7, previous: 30 },
  { label: "30d vs 90d", current: 30, previous: 90 },
];

const countryFlag = (code: string) => {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
};

const CountryComparison: React.FC<CountryComparisonProps> = ({ analyticsData }) => {
  const [selected, setSelected] = useState(0);

  const comparison = useMemo(() => {
    const { current, previous } = PERIOD_OPTIONS[selected];
    const now = Date.now();
    const currentCutoff = now - current * 86400000;
    const previousStart = currentCutoff - previous * 86400000;

    const countByCountry = (data: any[]) => {
      const map: Record<string, { count: number; code: string }> = {};
      data.forEach((e) => {
        const country = e.metadata?.country;
        if (!country) return;
        const code = e.metadata?.country_code || "";
        if (!map[country]) map[country] = { count: 0, code };
        map[country].count++;
      });
      return map;
    };

    const currentData = analyticsData.filter((e) => new Date(e.created_at).getTime() >= currentCutoff);
    const previousData = analyticsData.filter((e) => {
      const t = new Date(e.created_at).getTime();
      return t >= previousStart && t < currentCutoff;
    });

    const currentMap = countByCountry(currentData);
    const previousMap = countByCountry(previousData);

    const allCountries = new Set([...Object.keys(currentMap), ...Object.keys(previousMap)]);

    const rows = Array.from(allCountries)
      .map((name) => {
        const curr = currentMap[name]?.count || 0;
        const prev = previousMap[name]?.count || 0;
        const code = currentMap[name]?.code || previousMap[name]?.code || "";
        const change = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;
        return { name, code, curr, prev, change };
      })
      .sort((a, b) => b.curr - a.curr)
      .slice(0, 10);

    return rows;
  }, [analyticsData, selected]);

  const exportCSV = useCallback(() => {
    if (!comparison.length) return;
    const { label } = PERIOD_OPTIONS[selected];
    
    // Create CSV content
    const headers = ["Country", "Country Code", "Current Period", "Previous Period", "Change %"];
    const rows = comparison.map(row => 
      [row.name, row.code, row.curr, row.prev, row.change].map(val => `"${val}"`).join(",")
    );
    
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `country-comparison-${label.replace(/\s+/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [comparison, selected]);

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <GitCompareArrows className="w-5 h-5 text-primary" />
            Period Comparison
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={comparison.length === 0} className="h-8 text-xs">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((opt, i) => (
            <Button
              key={opt.label}
              variant={selected === i ? "default" : "outline"}
              size="sm"
              onClick={() => setSelected(i)}
              className="text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {comparison.length > 0 ? (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[1fr_70px_70px_80px] text-[11px] text-muted-foreground font-medium px-2">
              <span>Country</span>
              <span className="text-right">Current</span>
              <span className="text-right">Previous</span>
              <span className="text-right">Change</span>
            </div>
            {comparison.map((row) => (
              <div
                key={row.name}
                className="grid grid-cols-[1fr_70px_70px_80px] items-center px-2 py-2 rounded-lg bg-secondary/20 border border-border/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base leading-none">{countryFlag(row.code)}</span>
                  <span className="text-sm font-medium truncate">{row.name}</span>
                </div>
                <span className="text-sm font-semibold text-right text-foreground">{row.curr}</span>
                <span className="text-sm text-right text-muted-foreground">{row.prev}</span>
                <div className="flex items-center justify-end gap-1">
                  {row.change > 0 ? (
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-0 text-[11px] gap-0.5 px-1.5">
                      <ArrowUpRight className="w-3 h-3" />
                      +{row.change}%
                    </Badge>
                  ) : row.change < 0 ? (
                    <Badge className="bg-red-500/15 text-red-500 border-0 text-[11px] gap-0.5 px-1.5">
                      <ArrowDownRight className="w-3 h-3" />
                      {row.change}%
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[11px] gap-0.5 px-1.5">
                      <Minus className="w-3 h-3" />
                      0%
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Not enough data for comparison</p>
        )}
      </CardContent>
    </Card>
  );
};

export default CountryComparison;
// code:4ce0
