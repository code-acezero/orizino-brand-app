"use client";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { Bell, BellOff, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotifyWhenAvailableProps {
  productId: string;
  variantId?: string | null;
  variantLabel?: string;
  className?: string;
}

const NotifyWhenAvailable: React.FC<NotifyWhenAvailableProps> = ({
  productId, variantId, variantLabel, className,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["stock-notification", productId, variantId || "base"];

  const { data: subscription, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const query = supabase
        .from("stock_notifications" as any)
        .select("id, is_notified")
        .eq("user_id", user!.id)
        .eq("product_id", productId);

      if (variantId) {
        query.eq("variant_id", variantId);
      } else {
        query.is("variant_id", null);
      }

      const { data } = await query.maybeSingle();
      return data as unknown as { id: string; is_notified: boolean } | null;
    },
    enabled: !!user,
  });

  const subscribe = useMutation({
    mutationFn: async () => {
      const payload: any = {
        user_id: user!.id,
        product_id: productId,
        variant_id: variantId || null,
        email: user!.email,
      };
      await supabase.from("stock_notifications" as any).insert(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "You'll be notified!",
        description: `We'll send you a notification${variantLabel ? ` for ${variantLabel}` : ""} when it's back in stock.`,
      });
    },
    onError: (e: any) => {
      if (e.message?.includes("duplicate")) {
        toast({ title: "Already subscribed", description: "You're already on the waitlist." });
      } else {
        toast.error("Failed to subscribe: " + e.message);
      }
    },
  });

  const unsubscribe = useMutation({
    mutationFn: async () => {
      if (!subscription?.id) return;
      await supabase.from("stock_notifications" as any).delete().eq("id", subscription.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Notification removed" });
    },
  });

  if (!user) {
    return (
      <div className={cn("flex items-center justify-center gap-1.5 pt-1 text-xs text-muted-foreground", className)}>
        <Bell className="w-3.5 h-3.5 text-primary shrink-0" />
        <p>
          <button
            type="button"
            onClick={() => toast({ title: "Please sign in", description: "Sign in to get notified when this item is back in stock.", variant: "destructive" })}
            className="text-primary hover:underline font-bold cursor-pointer"
          >
            Sign in
          </button>
          {" "}to get notified when back in stock
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground", className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        <span>Checking waitlist...</span>
      </div>
    );
  }

  if (subscription) {
    return (
      <div className={cn("flex items-center justify-between gap-3 p-3 rounded-full sm:rounded-xl border border-primary/30 bg-primary/10 shadow-xs", className)}>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">You're on the waitlist</p>
            <p className="text-[11px] text-muted-foreground">
              We'll notify you{variantLabel ? ` about ${variantLabel}` : ""} when available
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => unsubscribe.mutate()}
          disabled={unsubscribe.isPending}
          className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-all h-8 px-2.5"
        >
          {unsubscribe.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellOff className="w-3.5 h-3.5 mr-1" />}
          Remove
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => subscribe.mutate()}
      disabled={subscribe.isPending}
      className={cn(
        "group w-full h-11 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold rounded-full sm:rounded-xl transition-all duration-200 border-2 border-primary/40 bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-[0.99]",
        className
      )}
    >
      {subscribe.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Bell className="w-4 h-4 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110" />
      )}
      <span>Notify Me When Available</span>
    </Button>
  );
};

export default NotifyWhenAvailable;
