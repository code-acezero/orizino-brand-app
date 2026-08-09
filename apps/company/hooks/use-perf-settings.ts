"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceClass } from "./use-device-class";

export interface PerfSettings {
  reduce_motion_mobile: boolean;
  disable_3d_mobile: boolean;
  lightweight_mode_mobile: boolean;
  reduce_motion_tablet: boolean;
  disable_3d_tablet: boolean;
  lightweight_mode_tablet: boolean;
}

export const DEFAULT_PERF: PerfSettings = {
  reduce_motion_mobile: true,
  disable_3d_mobile: true,
  lightweight_mode_mobile: true,
  reduce_motion_tablet: true,
  disable_3d_tablet: true,
  lightweight_mode_tablet: false,
};

export function usePerfSettings() {
  return useQuery({
    queryKey: ["mobile-perf-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "mobile_perf_settings")
        .maybeSingle();
      const v = (data?.value as any) || {};
      return { ...DEFAULT_PERF, ...v } as PerfSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Resolves effective perf flags based on current device class + DB settings. */
export function useEffectivePerf() {
  const device = useDeviceClass();
  const { data: s = DEFAULT_PERF } = usePerfSettings();

  if (device === "desktop") {
    return { device, reduceMotion: false, disable3D: false, lightweightMode: false };
  }
  if (device === "tablet") {
    return {
      device,
      reduceMotion: s.reduce_motion_tablet,
      disable3D: s.disable_3d_tablet,
      lightweightMode: s.lightweight_mode_tablet,
    };
  }
  return {
    device,
    reduceMotion: s.reduce_motion_mobile,
    disable3D: s.disable_3d_mobile,
    lightweightMode: s.lightweight_mode_mobile,
  };
}
