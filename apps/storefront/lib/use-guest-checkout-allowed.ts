import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Reads the `allow_guest_checkout` site setting. Defaults to enabled when
 * the key hasn't been set yet, matching the admin toggle's default.
 */
export function useGuestCheckoutAllowed() {
  const { data, isLoading } = useQuery({
    queryKey: ["allow-guest-checkout"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "allow_guest_checkout").maybeSingle();
      const raw = data?.value as any;
      const v = raw && typeof raw === "object" ? raw.value : raw;
      return v === undefined || v === null ? true : !!v;
    },
    staleTime: 5 * 60_000,
  });
  return { allowed: data !== false, loading: isLoading };
}
