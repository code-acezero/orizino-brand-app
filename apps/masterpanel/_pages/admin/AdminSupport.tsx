"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdaptivePolling } from "@/hooks/use-adaptive-polling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/app-toast";
import { Send, MessageCircle, User, Clock, CheckCircle2, UserCheck, PhoneCall, ExternalLink, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import VoiceCallButton from "@/components/admin/VoiceCallButton";
import { format } from "date-fns";

const AdminSupport = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const convPoll = useAdaptivePolling(30000);
  const msgPoll = useAdaptivePolling(15000);

  // Fetch conversations with user profile info
  const { data: conversations = [] } = useQuery({
    queryKey: ["admin-support-conversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_conversations")
        .select("*")
        .order("needs_human", { ascending: false })
        .order("updated_at", { ascending: false });
      return data || [];

    },
    refetchInterval: convPoll,
    refetchIntervalInBackground: false,
    staleTime: 10000,
  });

  // Fetch user profiles for conversations
  const userIds = [...new Set(conversations.map((c: any) => c.user_id).filter(Boolean))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["support-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url, phone").in("id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const getProfile = (userId: string) => profiles.find((p: any) => p.id === userId);

  // Fetch import requests linked to conversations
  const { data: importRequests = [] } = useQuery({
    queryKey: ["support-import-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("product_import_requests").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-support-messages", selectedConv],
    queryFn: async () => {
      if (!selectedConv) return [];
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", selectedConv)
        .order("created_at");
      return data || [];
    },
    enabled: !!selectedConv,
    refetchInterval: msgPoll,
    refetchIntervalInBackground: false,
    staleTime: 5000,
  });

  // Real-time subscription for messages AND conversations
  useEffect(() => {
    const channels: any[] = [];

    // Listen for new conversations
    const convChannel = supabase
      .channel("support-conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" },
        () => qc.invalidateQueries({ queryKey: ["admin-support-conversations"] })
      )
      .subscribe();
    channels.push(convChannel);

    if (selectedConv) {
      const msgChannel = supabase
        .channel(`support-msg-${selectedConv}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${selectedConv}` },
          () => qc.invalidateQueries({ queryKey: ["admin-support-messages", selectedConv] })
        )
        .subscribe();
      channels.push(msgChannel);
    }

    return () => { channels.forEach((c) => supabase.removeChannel(c)); };
  }, [selectedConv, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Claim conversation
  const claimConversation = async (convId: string) => {
    if (!user) return;
    const conv = conversations.find((c: any) => c.id === convId);
    if (conv?.assigned_to && conv.assigned_to !== user.id) {
      toast.error("This conversation is already claimed by another agent.");
      return;
    }
    await supabase.from("support_conversations").update({
      assigned_to: user.id,
      updated_at: new Date().toISOString(),
    }).eq("id", convId);
    qc.invalidateQueries({ queryKey: ["admin-support-conversations"] });
    toast.success("Conversation claimed!");
  };

  const releaseConversation = async (convId: string) => {
    await supabase.from("support_conversations").update({
      assigned_to: null,
      updated_at: new Date().toISOString(),
    }).eq("id", convId);
    qc.invalidateQueries({ queryKey: ["admin-support-conversations"] });
    toast.success("Conversation released.");
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedConv || !user) return;
    const conv = conversations.find((c: any) => c.id === selectedConv);
    if (conv?.assigned_to && conv.assigned_to !== user.id) {
      toast.error("This conversation is claimed by another agent.");
      return;
    }
    if (!conv?.assigned_to) {
      // Auto-claim when replying
      await claimConversation(selectedConv);
    }
    setSending(true);
    await supabase.from("support_messages").insert({
      conversation_id: selectedConv,
      sender_id: user.id,
      sender_type: "admin",
      content: reply.trim(),
    });
    await supabase.from("support_conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedConv);
    setReply("");
    setSending(false);
    qc.invalidateQueries({ queryKey: ["admin-support-messages", selectedConv] });
  };

  const closeConversation = async (id: string) => {
    await supabase.from("support_conversations").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-support-conversations"] });
  };

  const deleteConversation = async (id: string) => {
    try {
      await supabase.from("support_messages").delete().eq("conversation_id", id);
      await supabase.from("support_conversations").delete().eq("id", id);
      if (selectedConv === id) setSelectedConv(null);
      qc.invalidateQueries({ queryKey: ["admin-support-conversations"] });
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const selectedConvData = conversations.find((c: any) => c.id === selectedConv);
  const selectedProfile = selectedConvData ? getProfile(selectedConvData.user_id) : null;
  const linkedImportReq = importRequests.find((r: any) => r.conversation_id === selectedConv);
  const openCount = conversations.filter((c: any) => c.status === "open").length;
  const isClaimed = selectedConvData?.assigned_to != null;
  const isClaimedByMe = selectedConvData?.assigned_to === user?.id;
  const isClaimedByOther = isClaimed && !isClaimedByMe;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Live Support</h1>
        {openCount > 0 && <Badge variant="destructive">{openCount} open</Badge>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: "calc(100vh - 200px)" }}>
        {/* Conversation list */}
        <div className="border border-border rounded-2xl overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border bg-secondary/30">
            <p className="text-sm font-medium text-foreground">Conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No conversations</div>
            ) : conversations.map((conv: any) => {
              const profile = getProfile(conv.user_id);
              const claimed = conv.assigned_to != null;
              const claimedByMe = conv.assigned_to === user?.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv.id)}
                  className={`w-full text-left p-3 border-b border-border hover:bg-secondary/30 transition-colors cursor-pointer group ${
                    selectedConv === conv.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground truncate">
                      {profile?.full_name || "Customer"}
                    </span>
                    <div className="flex items-center gap-1">
                      {conv.needs_human && (
                        <Badge variant="destructive" className="text-[9px] animate-pulse">Handoff</Badge>
                      )}
                      {claimed && (
                        <Badge variant={claimedByMe ? "default" : "outline"} className="text-[9px]">
                          {claimedByMe ? "You" : "Taken"}
                        </Badge>
                      )}
                      <Badge variant={conv.status === "open" ? "destructive" : "secondary"} className="text-[10px]">
                        {conv.status}
                      </Badge>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-destructive transition-all"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete all messages in this conversation.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteConversation(conv.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.subject}</p>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(conv.updated_at), "MMM d, HH:mm")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="lg:col-span-2 border border-border rounded-2xl overflow-hidden flex flex-col">
          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a conversation</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border bg-secondary/30 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  {selectedProfile?.avatar_url ? (
                    <img src={selectedProfile.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{selectedProfile?.full_name || "Customer"}</p>
                    {selectedProfile?.phone && (
                      <p className="text-[11px] text-muted-foreground">{selectedProfile.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {linkedImportReq && (
                    <a href={linkedImportReq.product_url} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Product Link
                    </a>
                  )}
                  {!isClaimed ? (
                    <Button size="sm" variant="outline" onClick={() => claimConversation(selectedConv)} className="rounded-xl gap-1">
                      <UserCheck className="w-4 h-4" /> Claim
                    </Button>
                  ) : isClaimedByMe ? (
                    <Button size="sm" variant="ghost" onClick={() => releaseConversation(selectedConv)} className="rounded-xl text-xs">
                      Release
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => closeConversation(selectedConv)} className="rounded-xl gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Close
                  </Button>
                  {isClaimedByMe && selectedConvData?.status === "open" && (
                    <>

                      <VoiceCallButton
                        conversationId={selectedConv}
                        userId={selectedConvData.user_id}
                        adminId={user!.id}
                      />
                    </>
                  )}
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg: any) => (
                  <div key={msg.id} className={`flex gap-2 ${msg.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
                    {msg.sender_type !== "admin" && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.sender_type === "admin"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : msg.sender_type === "ai"
                        ? "bg-secondary/80 text-foreground rounded-bl-md border border-border"
                        : "bg-secondary text-foreground rounded-bl-md"
                    }`}>
                      {msg.content}
                      <div className="text-[9px] opacity-50 mt-1">
                        {format(new Date(msg.created_at), "HH:mm")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-border">
                {isClaimedByOther ? (
                  <p className="text-sm text-center text-muted-foreground py-2">This conversation is handled by another agent.</p>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendReply()}
                      placeholder="Type a reply..."
                      className="rounded-xl"
                    />
                    <Button onClick={sendReply} disabled={!reply.trim() || sending} className="rounded-xl">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
// code:4ce0
