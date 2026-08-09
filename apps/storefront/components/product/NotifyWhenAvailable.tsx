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
      <div className={cn("flex items-center gap-2.5 p-3.5 rounded-2xl border border-border/60 bg-card/60", className)}>
        <Bell className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs sm:text-sm text-muted-foreground">
          <button
            type="button"
            onClick={() => toast({ title: "Please sign in", description: "Sign in to get notified when this item is back in stock.", variant: "destructive" })}
            className="text-primary hover:underline font-semibold"
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
      <div className={cn("flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-border/50 bg-card/60", className)}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Checking waitlist...</span>
      </div>
    );
  }

  if (subscription) {
    return (
      <div className={cn("flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-primary/30 bg-primary/10 shadow-xs", className)}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/15 border border-primary/20">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-foreground">You're on the waitlist</p>
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
          className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl shrink-0 transition-all"
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
        "group w-full h-11 flex items-center justify-center gap-2 text-sm font-bold rounded-2xl transition-all duration-200 border-2 border-primary/40 bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-[0_0_20px_hsl(var(--primary)/0.35)] active:scale-[0.99]",
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
// code:4ce0
