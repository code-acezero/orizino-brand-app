"use client";
import { useEffect, useState } from "react";
import { useServerFn } from "@/lib/server-fn-compat";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  listTelegramChats,
  syncTelegramChats,
  updateTelegramChat,
  sendTelegramTest,
} from "@/lib/telegram.functions";

type Chat = {
  chat_id: number;
  title: string | null;
  type: string | null;
  username: string | null;
  notify_orders: boolean;
  notify_support: boolean;
  notify_calls: boolean;
  last_message_at: string | null;
};

export default function AdminTelegram() {
  const list = useServerFn(listTelegramChats);
  const sync = useServerFn(syncTelegramChats);
  const update = useServerFn(updateTelegramChat);
  const test = useServerFn(sendTelegramTest);
  const qc = useQueryClient();
  const [testText, setTestText] = useState("✅ Test message from Orizino bot");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["telegram-chats"],
    queryFn: () => list(),
  });

  const syncMut = useMutation({
    mutationFn: () => sync(),
    onSuccess: (r: any) => {
      toast({ title: "Synced", description: `Fetched ${r?.fetched || 0} updates, ${r?.upserted || 0} chats updated.` });
      qc.invalidateQueries({ queryKey: ["telegram-chats"] });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: (vars: { chat_id: number; field: keyof Chat; value: boolean }) =>
      update({ data: { chat_id: vars.chat_id, [vars.field]: vars.value } as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["telegram-chats"] }),
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const testMut = useMutation({
    mutationFn: (chat_id: number) => test({ data: { chat_id, text: testText } }),
    onSuccess: () => toast({ title: "Test message sent" }),
    onError: (e: any) => toast({ title: "Send failed", description: e.message, variant: "destructive" }),
  });

  useEffect(() => {
    // First load: try a sync so the list isn't empty
    if (!isLoading && (data?.chats?.length ?? 0) === 0) syncMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const chats: Chat[] = (data?.chats ?? []) as Chat[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Telegram</h1>
          <p className="text-sm text-muted-foreground">
            Manage which chats receive order, support and call notifications. Message your bot or add it to a group to make it appear here, then click sync.
          </p>
        </div>
        <Button onClick={() => syncMut.mutate()} disabled={syncMut.isPending} className="gap-2">
          {syncMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sync chats
        </Button>
      </div>

      <Card className="p-4 space-y-2">
        <label className="text-sm font-medium">Test message</label>
        <Input value={testText} onChange={(e) => setTestText(e.target.value)} />
      </Card>

      <div className="grid gap-3">
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && chats.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground">
            No chats yet. Send a message to your bot on Telegram, then click Sync.
          </Card>
        )}
        {chats.map((c) => (
          <Card key={c.chat_id} className="p-4 grid md:grid-cols-[1fr_auto] gap-4 items-start">
            <div>
              <div className="font-medium">{c.title || `Chat ${c.chat_id}`}</div>
              <div className="text-xs text-muted-foreground">
                {c.type ?? "?"} · ID {c.chat_id}
                {c.username ? ` · @${c.username}` : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              {(["notify_orders", "notify_support", "notify_calls"] as const).map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={Boolean(c[f])}
                    onCheckedChange={(v) => toggleMut.mutate({ chat_id: c.chat_id, field: f, value: v })}
                  />
                  {f.replace("notify_", "")}
                </label>
              ))}
              <Button size="sm" variant="outline" onClick={() => testMut.mutate(c.chat_id)} className="gap-1">
                <Send className="w-3 h-3" /> Test
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
// code:4ce0
