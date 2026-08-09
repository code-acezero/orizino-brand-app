"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@orizino/supabase/client";
import { useAuth } from "../contexts/AuthContext";

export interface UserAddress {
  id: string;
  user_id: string;
  label: string;
  address_type: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  area: string | null;
  postal_code: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  pathao_city_id: number | null;
  pathao_zone_id: number | null;
  pathao_area_id: number | null;
}

export const useUserAddresses = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_addresses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_addresses" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      return (data || []) as unknown as UserAddress[];
    },
    enabled: !!user,
  });
};

export const useSaveAddress = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (addr: Partial<UserAddress> & { id?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const payload = { ...addr, user_id: user.id };
      if (addr.is_default) {
        await supabase.from("user_addresses" as any).update({ is_default: false }).eq("user_id", user.id);
      }
      if (addr.id) {
        const { error } = await supabase.from("user_addresses" as any).update(payload).eq("id", addr.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_addresses" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_addresses", user?.id] }),
  });
};

export const useDeleteAddress = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_addresses" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_addresses", user?.id] }),
  });
};
// code:4ce0
