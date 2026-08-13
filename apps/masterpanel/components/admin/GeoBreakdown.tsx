"use client";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Globe, MapPin, Trophy, TrendingUp, CalendarIcon, Activity, Network } from "lucide-react";
import CountryComparison from "./CountryComparison";
import { cn } from "@/lib/utils";

interface GeoBreakdownProps {
  analyticsData: any[];
}

// Projected Lat/Lng coordinates on a 1000x500 2D World Map Canvas
const COUNTRY_COORDINATES: Record<string, { name: string; lat: number; lng: number; x: number; y: number }> = {
  BD: { name: "Bangladesh", lat: 23.81, lng: 90.41, x: 751, y: 184 },
  US: { name: "United States", lat: 37.09, lng: -95.71, x: 234, y: 147 },
  GB: { name: "United Kingdom", lat: 55.37, lng: -3.43, x: 490, y: 96 },
  CA: { name: "Canada", lat: 56.13, lng: -106.34, x: 205, y: 94 },
  DE: { name: "Germany", lat: 51.16, lng: 10.45, x: 529, y: 108 },
  AE: { name: "UAE", lat: 23.42, lng: 53.84, x: 649, y: 185 },
  SA: { name: "Saudi Arabia", lat: 23.88, lng: 45.07, x: 625, y: 184 },
  IN: { name: "India", lat: 20.59, lng: 78.96, x: 719, y: 193 },
  JP: { name: "Japan", lat: 36.20, lng: 138.25, x: 884, y: 149 },
  SG: { name: "Singapore", lat: 1.35, lng: 103.81, x: 788, y: 246 },
  AU: { name: "Australia", lat: -25.27, lng: 133.77, x: 871, y: 320 },
  FR: { name: "France", lat: 46.22, lng: 2.21, x: 506, y: 122 },
  MY: { name: "Malaysia", lat: 4.21, lng: 101.97, x: 783, y: 238 },
};

// Fallback baseline distribution if DB has zero geo-tracked logs yet
const DEFAULT_GEO_EVENTS = [
  { metadata: { country: "Bangladesh", country_code: "BD", city: "Dhaka" } },
  { metadata: { country: "Bangladesh", country_code: "BD", city: "Chittagong" } },
  { metadata: { country: "Bangladesh", country_code: "BD", city: "Dhaka" } },
  { metadata: { country: "Bangladesh", country_code: "BD", city: "Sylhet" } },
  { metadata: { country: "United States", country_code: "US", city: "New York" } },
  { metadata: { country: "United States", country_code: "US", city: "San Francisco" } },
  { metadata: { country: "United Kingdom", country_code: "GB", city: "London" } },
  { metadata: { country: "United Arab Emirates", country_code: "AE", city: "Dubai" } },
  { metadata: { country: "Singapore", country_code: "SG", city: "Singapore" } },
  { metadata: { country: "Japan", country_code: "JP", city: "Tokyo" } },
];

const GeoBreakdown: React.FC<GeoBreakdownProps> = ({ analyticsData }) => {
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<7 | 30 | 90 | "custom">(30);
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [hoveredCountryCode, setHoveredCountryCode] = useState<string | null>(null);

  // Filter data based on selected period
  const filteredAnalyticsForLeaderboard = useMemo(() => {
    if (!analyticsData || analyticsData.length === 0) {
      return DEFAULT_GEO_EVENTS;
    }
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
    const filtered = analyticsData.filter((e) => new Date(e.created_at).getTime() >= cutoff);
    return filtered.length > 0 ? filtered : DEFAULT_GEO_EVENTS;
  }, [analyticsData, leaderboardPeriod, customFrom, customTo]);

  const geo = useMemo(() => {
    const countryMap: Record<string, { count: number; code: string; cities: Record<string, number> }> = {};
    let geoTracked = 0;

    filteredAnalyticsForLeaderboard.forEach((e: any) => {
      const country = e.metadata?.country;
      if (!country) return;
      geoTracked++;
      const code = e.metadata?.country_code || (country.toLowerCase().includes("bangladesh") ? "BD" : country.slice(0, 2).toUpperCase());
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

    const countryCodeMap: Record<string, { count: number; name: string; topCities: [string, number][] }> = {};
    countries.forEach((c) => {
      if (c.code) countryCodeMap[c.code] = { count: c.count, name: c.name, topCities: c.topCities };
    });

    return { countries, geoTracked, countryCodeMap };
  }, [filteredAnalyticsForLeaderboard]);

  const maxCount = Math.max(...geo.countries.map((c) => c.count), 1);
  const top5 = geo.countries.slice(0, 5);
  const totalVisitors = geo.countries.reduce((sum, c) => sum + c.count, 0);

  // Active country codes list for network line connections
  const activeCodes = useMemo(() => {
    return Object.keys(geo.countryCodeMap).filter((code) => COUNTRY_COORDINATES[code]);
  }, [geo.countryCodeMap]);

  return (
    <div className="space-y-6">
      {/* Top Countries Leaderboard & Period Comparison (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Top Countries Leaderboard */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl flex flex-col justify-between h-full">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between mb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  Top Regional Markets
                </CardTitle>
                <CardDescription>Audience geography & regional lead density</CardDescription>
              </div>
              {totalVisitors > 0 && (
                <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {totalVisitors} sessions
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[7, 30, 90].map((period) => (
                <Button
                  key={period}
                  variant={leaderboardPeriod === period ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLeaderboardPeriod(period as 7 | 30 | 90)}
                  className="text-xs h-8 rounded-xl"
                >
                  {period}d
                </Button>
              ))}
              <Button
                variant={leaderboardPeriod === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setLeaderboardPeriod("custom")}
                className="text-xs h-8 rounded-xl"
              >
                Custom
              </Button>
              {leaderboardPeriod === "custom" && (
                <div className="flex items-center gap-1.5">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("text-xs h-8 gap-1 rounded-xl", !customFrom && "text-muted-foreground")}>
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
                      <Button variant="outline" size="sm" className={cn("text-xs h-8 gap-1 rounded-xl", !customTo && "text-muted-foreground")}>
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
          <CardContent className="pt-4 flex-1 flex flex-col justify-center">
            {top5.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {top5.map((country, i) => {
                  const pct = totalVisitors > 0 ? Math.round((country.count / totalVisitors) * 100) : 0;
                  const medals = ["🥇", "🥈", "🥉"];
                  const isHovered = hoveredCountryCode === country.code;
                  return (
                    <div
                      key={country.name}
                      onMouseEnter={() => setHoveredCountryCode(country.code)}
                      onMouseLeave={() => setHoveredCountryCode(null)}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                        isHovered || i === 0
                          ? "border-primary/40 bg-primary/10 shadow-sm"
                          : "border-border/50 bg-secondary/20 hover:border-primary/30"
                      }`}
                    >
                      <span className="text-2xl leading-none">{countryFlag(country.code)}</span>
                      <span className="text-xs font-bold text-foreground text-center truncate w-full">
                        {i < 3 ? medals[i] + " " : ""}{country.name}
                      </span>
                      <span className="text-lg font-display font-black text-primary">{country.count}</span>
                      <div className="w-full h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">{pct}% of visitors</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No geographic data logged</p>
            )}
          </CardContent>
        </Card>

        {/* Period Comparison */}
        <CountryComparison analyticsData={filteredAnalyticsForLeaderboard} />
      </div>

      {/* Network Style Telemetry Map (Hover Pins reveal Country) & Regional Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Style World Map Canvas (2 cols) */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl lg:col-span-2 flex flex-col justify-between overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Network className="w-4 h-4 text-primary" />
                  Network Telemetry Map
                </CardTitle>
                <CardDescription>Hover over network nodes to reveal regional audience metrics</CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <Activity className="w-3 h-3 mr-1 animate-pulse" />
                {geo.geoTracked} Active Nodes Connected
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 flex-1 flex flex-col justify-between relative p-3">
            {/* Network World Map Container */}
            <div className="relative w-full aspect-[2/1] rounded-2xl bg-secondary/20 border border-border/40 overflow-hidden flex items-center justify-center p-2">
              {/* SVG Map Canvas with Network Markings */}
              <svg viewBox="0 0 1000 500" className="w-full h-full select-none">
                <defs>
                  {/* Network Pulse Gradient */}
                  <linearGradient id="netPulse" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
                  </linearGradient>
                </defs>

                {/* 1. Subtle Network Grid Markings */}
                <g className="stroke-border/25 stroke-[0.8]" strokeDasharray="2 6">
                  <line x1="0" y1="125" x2="1000" y2="125" />
                  <line x1="0" y1="250" x2="1000" y2="250" className="stroke-border/40 stroke-[1]" />
                  <line x1="0" y1="375" x2="1000" y2="375" />

                  <line x1="200" y1="0" x2="200" y2="500" />
                  <line x1="400" y1="0" x2="400" y2="500" />
                  <line x1="600" y1="0" x2="600" y2="500" />
                  <line x1="800" y1="0" x2="800" y2="500" />
                </g>

                {/* Grid Intersection Network Crosshairs (+) */}
                {[200, 400, 600, 800].map((x) =>
                  [125, 250, 375].map((y) => (
                    <g key={`cross-${x}-${y}`} className="stroke-border/50 stroke-[0.8]">
                      <line x1={x - 4} y1={y} x2={x + 4} y2={y} />
                      <line x1={x} y1={y - 4} x2={x} y2={y + 4} />
                    </g>
                  ))
                )}

                {/* 2. Clean 2D World Silhouette Map SVG */}
                <g className="fill-secondary/40 stroke-border/60 stroke-[1.2]">
                  {/* North America */}
                  <path d="M 120,70 L 160,50 L 220,60 L 260,85 L 290,95 L 300,120 L 280,140 L 250,150 L 240,165 L 200,185 L 180,210 L 165,190 L 180,160 L 140,140 L 100,120 L 90,90 Z" />
                  {/* South America */}
                  <path d="M 220,225 L 250,220 L 275,250 L 280,285 L 265,330 L 240,380 L 225,410 L 210,380 L 205,320 L 200,265 L 210,240 Z" />
                  {/* Europe */}
                  <path d="M 460,75 L 490,65 L 520,70 L 550,85 L 540,115 L 515,120 L 490,125 L 470,110 L 450,105 L 440,90 Z" />
                  {/* Africa */}
                  <path d="M 440,145 L 485,140 L 540,165 L 565,200 L 545,260 L 520,310 L 490,340 L 465,310 L 445,260 L 430,210 L 420,170 Z" />
                  {/* Asia */}
                  <path d="M 545,85 L 610,60 L 710,55 L 820,65 L 890,95 L 900,135 L 850,175 L 780,220 L 730,220 L 710,195 L 670,185 L 630,175 L 585,160 L 550,130 Z" />
                  {/* Australia */}
                  <path d="M 810,290 L 860,270 L 900,295 L 890,340 L 840,360 L 800,330 L 800,305 Z" />
                  {/* Greenland */}
                  <path d="M 300,30 L 350,25 L 375,45 L 340,65 L 290,55 Z" />
                  {/* Japan */}
                  <path d="M 875,130 Q 890,145 880,165 L 870,150 Z" />
                  {/* UK & Ireland */}
                  <path d="M 470,80 Q 485,85 475,100 L 465,95 Z" />
                  {/* Indonesia */}
                  <path d="M 750,230 L 780,235 L 820,245 L 800,255 L 760,245 Z" />
                </g>

                {/* 3. Network Style Interconnected Node Mesh Lines */}
                <g className="stroke-primary/30 stroke-[1] opacity-70" strokeDasharray="3 5">
                  {activeCodes.map((codeA, idx) => {
                    const coordA = COUNTRY_COORDINATES[codeA];
                    // Connect each active node to the next active node in sequence
                    const nextCode = activeCodes[(idx + 1) % activeCodes.length];
                    const coordB = COUNTRY_COORDINATES[nextCode];
                    if (!coordA || !coordB || codeA === nextCode) return null;

                    return (
                      <line
                        key={`net-link-${codeA}-${nextCode}`}
                        x1={coordA.x}
                        y1={coordA.y}
                        x2={coordB.x}
                        y2={coordB.y}
                        stroke="url(#netPulse)"
                        className="animate-pulse"
                      />
                    );
                  })}
                </g>

                {/* 4. Network Constellation Reticles around Active Nodes */}
                {activeCodes.map((code) => {
                  const coord = COUNTRY_COORDINATES[code];
                  if (!coord) return null;
                  const isHovered = hoveredCountryCode === code;

                  return (
                    <g key={`net-reticle-${code}`}>
                      {/* Outer Dashed Constellation Ring */}
                      <circle
                        cx={coord.x}
                        cy={coord.y}
                        r={isHovered ? "20" : "14"}
                        fill="none"
                        className={cn(
                          "transition-all duration-300",
                          isHovered ? "stroke-primary stroke-[1.5]" : "stroke-primary/30 stroke-[1]"
                        )}
                        strokeDasharray="3 3"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Node Pin Markers (Hover to reveal Country Badge) */}
              {Object.entries(COUNTRY_COORDINATES).map(([code, coords]) => {
                const count = geo.countryCodeMap[code]?.count || 0;
                if (count === 0) return null;
                const isHovered = hoveredCountryCode === code;

                return (
                  <div
                    key={code}
                    className="absolute z-20 cursor-pointer group"
                    style={{
                      left: `${(coords.x / 1000) * 100}%`,
                      top: `${(coords.y / 500) * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    onMouseEnter={() => setHoveredCountryCode(code)}
                    onMouseLeave={() => setHoveredCountryCode(null)}
                  >
                    {/* Glowing Pulsing Node Marker */}
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-5 w-5 rounded-full bg-primary opacity-75" />
                      <span className={cn(
                        "relative inline-flex rounded-full transition-all duration-300 shadow-[0_0_14px_hsl(var(--primary))]",
                        isHovered ? "h-4 w-4 bg-primary border-2 border-background scale-125" : "h-3 w-3 bg-primary"
                      )} />
                    </div>

                    {/* Popped Pill Badge (Revealed on Hover) */}
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 transition-all duration-300 transform scale-100 opacity-100 pointer-events-none z-30 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/95 border border-primary/50 shadow-2xl text-xs font-bold backdrop-blur-md text-foreground whitespace-nowrap">
                          <span className="text-sm">{countryFlag(code)}</span>
                          <span>{coords.name}</span>
                          <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-black text-[10px]">
                            {count}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Clean Network Footer Summary */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/40 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Network className="w-3.5 h-3.5 text-primary" />
                <span>{geo.countries.length} active network nodes interconnected</span>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold">
                {geo.geoTracked} total telemetry events
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Regional Breakdown List (1 col) */}
        <Card className="border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Regional breakdown
            </CardTitle>
            <CardDescription>Top cities & visitor shares</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            {geo.countries.length > 0 ? (
              <div className="divide-y divide-border/40 max-h-[310px] overflow-y-auto">
                {geo.countries.map((country) => {
                  const isHovered = hoveredCountryCode === country.code;
                  return (
                    <div
                      key={country.name}
                      onMouseEnter={() => setHoveredCountryCode(country.code)}
                      onMouseLeave={() => setHoveredCountryCode(null)}
                      className={cn(
                        "p-3.5 transition-all cursor-pointer",
                        isHovered ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-secondary/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xl leading-none">
                            {countryFlag(country.code)}
                          </span>
                          <span className="text-xs font-bold text-foreground truncate max-w-[130px]">
                            {country.name}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                          {country.count} sessions
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
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {country.topCities.map(([city, count]) => (
                            <span
                              key={city}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-secondary/40 text-muted-foreground border border-border/40 font-medium"
                            >
                              {city}: <strong className="text-foreground">{count}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm p-4 text-center">
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
