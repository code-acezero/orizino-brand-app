"use client";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Globe, MapPin, Trophy, TrendingUp, CalendarIcon } from "lucide-react";
import CountryComparison from "./CountryComparison";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

interface GeoBreakdownProps {
  analyticsData: any[];
}

const GeoBreakdown: React.FC<GeoBreakdownProps> = ({ analyticsData }) => {
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<7 | 30 | 90 | "custom">(30);
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  // Filter data based on selected period
  const filteredAnalyticsForLeaderboard = useMemo(() => {
    if (leaderboardPeriod === "custom") {
      return analyticsData.filter((e) => {
        const t = new Date(e.created_at).getTime();
        if (customFrom && t < customFrom.getTime()) return false;
        if (customTo && t > customTo.getTime() + 86400000) return false;
        return true;
      });
    }
    const now = Date.now();
    const cutoff = now - leaderboardPeriod * 24 * 60 * 60 * 1000;
    return analyticsData.filter((e) => new Date(e.created_at).getTime() >= cutoff);
  }, [analyticsData, leaderboardPeriod, customFrom, customTo]);

  const geo = useMemo(() => {
    const countryMap: Record<string, { count: number; code: string; cities: Record<string, number> }> = {};
    let geoTracked = 0;

    filteredAnalyticsForLeaderboard.forEach((e: any) => {
      const country = e.metadata?.country;
      if (!country) return;
      geoTracked++;
      const code = e.metadata?.country_code || "";
      if (!countryMap[country]) countryMap[country] = { count: 0, code, cities: {} };
      countryMap[country].count++;
      const city = e.metadata?.city;
      if (city) {
        countryMap[country].cities[city] = (countryMap[country].cities[city] || 0) + 1;
      }
    });

    const countries = Object.entries(countryMap)
      .map(([name, data]) => ({
        name,
        code: data.code,
        count: data.count,
        topCities: Object.entries(data.cities)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5),
      }))
      .sort((a, b) => b.count - a.count);

    const chartData = countries.slice(0, 8).map((c) => ({
      name: c.code || c.name.slice(0, 3).toUpperCase(),
      fullName: c.name,
      visitors: c.count,
    }));

    // Build a code->count map for the world map
    const countryCodeMap: Record<string, { count: number; name: string }> = {};
    countries.forEach((c) => {
      if (c.code) countryCodeMap[c.code] = { count: c.count, name: c.name };
    });

    return { countries, chartData, geoTracked, countryCodeMap };
  }, [filteredAnalyticsForLeaderboard]);

  const maxCount = Math.max(...geo.countries.map((c) => c.count), 1);

  const top5 = geo.countries.slice(0, 5);
  const totalVisitors = geo.countries.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-6">
      {/* Top Countries Leaderboard */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              Top Countries
              {totalVisitors > 0 && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {totalVisitors} total
                </Badge>
              )}
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[7, 30, 90].map((period) => (
              <Button
                key={period}
                variant={leaderboardPeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setLeaderboardPeriod(period as 7 | 30 | 90)}
                className="text-xs"
              >
                {period}d
              </Button>
            ))}
            <Button
              variant={leaderboardPeriod === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setLeaderboardPeriod("custom")}
              className="text-xs"
            >
              Custom
            </Button>
            {leaderboardPeriod === "custom" && (
              <div className="flex items-center gap-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("text-xs h-8 gap-1", !customFrom && "text-muted-foreground")}>
                      <CalendarIcon className="h-3 w-3" />
                      {customFrom ? format(customFrom, "MMM d") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-muted-foreground">–</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("text-xs h-8 gap-1", !customTo && "text-muted-foreground")}>
                      <CalendarIcon className="h-3 w-3" />
                      {customTo ? format(customTo, "MMM d") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-8 text-muted-foreground hover:text-foreground"
                  onClick={() => { setCustomFrom(undefined); setCustomTo(undefined); setLeaderboardPeriod(30); }}
                >
                  Reset
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {top5.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {top5.map((country, i) => {
                const pct = totalVisitors > 0 ? Math.round((country.count / totalVisitors) * 100) : 0;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div
                    key={country.name}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      i === 0
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/40 bg-secondary/10"
                    }`}
                  >
                    <span className="text-2xl leading-none">{countryFlag(country.code)}</span>
                    <span className="text-xs font-semibold text-foreground text-center truncate w-full">
                      {i < 3 ? medals[i] + " " : ""}{country.name}
                    </span>
                    <span className="text-lg font-bold text-primary">{country.count}</span>
                    <div className="w-full h-1 rounded-full bg-secondary/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No geographic data yet</p>
          )}
        </CardContent>
      </Card>
      {/* Period Comparison */}
      <CountryComparison analyticsData={analyticsData} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Chart */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Visitors by Country
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geo.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={geo.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number, _name: string, props: any) => [
                      value,
                      props.payload.fullName,
                    ]}
                  />
                  <Bar dataKey="visitors" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                No geographic data yet. Visit the homepage to generate geo-tracked events.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Country/City Detail List */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Location Details
              {geo.geoTracked > 0 && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  {geo.geoTracked} geo-tracked events
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {geo.countries.length > 0 ? (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {geo.countries.map((country) => (
                  <div
                    key={country.name}
                    className="p-3 rounded-xl bg-secondary/20 border border-border/50"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none">
                          {countryFlag(country.code)}
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {country.name}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {country.count}
                      </Badge>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 rounded-full bg-secondary/50 overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${(country.count / maxCount) * 100}%`,
                        }}
                      />
                    </div>
                    {/* Cities */}
                    {country.topCities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {country.topCities.map(([city, count]) => (
                          <span
                            key={city}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/40 text-muted-foreground"
                          >
                            {city}{" "}
                            <span className="text-foreground font-medium">
                              {count}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                No location data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/** Convert a 2-letter country code to a flag emoji */
const countryFlag = (code: string) => {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
};

export default GeoBreakdown;
// code:4ce0
