"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdaptivePolling } from "@/hooks/use-adaptive-polling";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/app-toast";
import {
  Send,
  MessageCircle,
  User,
  Clock,
  CheckCircle2,
  UserCheck,
  PhoneCall,
  ExternalLink,
  Trash2,
  ChevronLeft,
  Search,
  Zap,
  RefreshCw,
  Shield,
  LifeBuoy,
  Users,
  SlidersHorizontal,
  Bot,
  Headphones,
  ArrowRightLeft,
  X,
  Plus,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import VoiceCallButton from "@/components/admin/VoiceCallButton";
import { format } from "date-fns";
import { getTicketStatusInfo, TicketStatusKey } from "@/lib/ticket-status";
import {
  AutoAssignConfig,
  StaffAgent,
  runAutoAssignCheck,
} from "@/lib/support-auto-assign";

type FilterTab = "all" | "unassigned" | "my_tickets" | "open" | "paused" | "closed";

const CANNED_REPLIES = [
  {
    label: "👋 Greeting",
    text: "Hello! Welcome to Orizino Support. How can I assist you with your order today?",
  },
  {
    label: "📦 Shipping Check",
    text: "I am tracking your order with Pathao courier logistics right now. Please allow me one moment.",
  },
  {
    label: "🔄 Exchange/Return",
    text: "We have initiated your 7-day size exchange request. Our dispatch team will process the courier swap shortly.",
  },
  {
    label: "✅ Solved & Closed",
    text: "I'm delighted we could resolve this for you! If you have any further questions, please let us know. Have a wonderful day!",
  },
];

export default function AdminSupport() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-Assign Configuration state (persisted locally)
  const [autoAssignConfig, setAutoAssignConfig] = useState<AutoAssignConfig>(() => {
    try {
      const saved = localStorage.getItem("orizino_auto_assign_config");
      return saved ? JSON.parse(saved) : { enabled: true, timeoutMinutes: 3, mode: "least_busy" };
    } catch {
      return { enabled: true, timeoutMinutes: 3, mode: "least_busy" };
    }
  });

  const updateAutoAssign = (partial: Partial<AutoAssignConfig>) => {
    setAutoAssignConfig((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem("orizino_auto_assign_config", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const convPoll = useAdaptivePolling(25000);
  const msgPoll = useAdaptivePolling(12000);

  // Fetch support conversations
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
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
    staleTime: 8000,
  });

  // Fetch staff list for live agents & auto-assign
  const { data: staffList = [] } = useQuery<StaffAgent[]>({
    queryKey: ["admin-support-staff-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const staffIds = [...new Set((roles || []).map((r: any) => r.user_id))];

      if (!staffIds.length) {
        if (user) {
          return [
            {
              user_id: user.id,
              full_name: (user as any).user_metadata?.full_name || "Admin",
              email: user.email,
            },
          ];
        }
        return [];
      }

      const { data: pList } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", staffIds);

      const profileMap = new Map((pList || []).map((p: any) => [p.id, p]));
      return staffIds.map((id) => {
        const p = profileMap.get(id);
        return {
          user_id: id,
          full_name:
            p?.full_name || (id === user?.id ? (user as any).user_metadata?.full_name || "You (Admin)" : "Staff Member"),
          avatar_url: p?.avatar_url,
        };
      });
    },
    staleTime: 60_000,
  });

  // Fetch customer profiles for conversations
  const userIds = useMemo(() => {
    return [...new Set(conversations.map((c: any) => c.user_id).filter(Boolean))];
  }, [conversations]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["support-profiles", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone")
        .in("id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
    staleTime: 30_000,
  });

  const getProfile = (userId: string) => profiles.find((p: any) => p.id === userId);
  const getAgent = (agentId: string) => staffList.find((a) => a.user_id === agentId);

  // Fetch import requests linked to conversations
  const { data: importRequests = [] } = useQuery({
    queryKey: ["support-import-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_import_requests")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 30_000,
  });

  // Fetch messages for selected conversation
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
    staleTime: 3000,
  });

  // Auto-Assign Periodic Checker
  useEffect(() => {
    if (!autoAssignConfig.enabled || !conversations.length || !staffList.length) return;

    const interval = setInterval(async () => {
      const result = await runAutoAssignCheck(conversations, staffList, autoAssignConfig, user?.id);
      if (result.assignedCount > 0) {
        toast.info(`Auto-Assigned ${result.assignedCount} ticket(s) exceeding SLA`);
        qc.invalidateQueries({ queryKey: ["admin-support-conversations"] });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoAssignConfig, conversations, staffList, user?.id, qc]);

  // Real-time Postgres subscriptions
  useEffect(() => {
    const channels: any[] = [];

    const convChannel = supabase
      .channel("support-conversations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_conversations" }, () =>
        qc.invalidateQueries({ queryKey: ["admin-support-conversations"] })
      )
      .subscribe();
    channels.push(convChannel);

    if (selectedConv) {
      const msgChannel = supabase
        .channel(`support-msg-${selectedConv}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `conversation_id=eq.${selectedConv}`,
          },
          () => qc.invalidateQueries({ queryKey: ["admin-support-messages", selectedConv] })
        )
        .subscribe();
      channels.push(msgChannel);
    }

    return () => {
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [selectedConv, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Claim conversation
  const claimConversation = async (convId: string) => {
    if (!user) return;
    const conv = conversations.find((c: any) => c.id === convId);
    if (conv?.assigned_to && conv.assigned_to !== user.id) {
      toast.error("This conversation is already claimed by another specialist.");
      return;
    }
    try {
      await supabase
        .from("support_conversations")
        .update({
          assigned_to: user.id,
          status: "open",
          needs_human: true,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", convId);

      await supabase.from("support_messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        sender_type: "admin",
        content: `👋 Specialist **${(user as any).user_metadata?.full_name || "Support Agent"}** has claimed this ticket and joined the session.`,
      } as any);

      qc.invalidateQueries({ queryKey: ["admin-support-conversations"] });
      toast.success("Ticket claimed and live chat active!");
    } catch (e: any) {
      toast.error(e.message || "Failed to claim ticket");
    }
  };

  // Reassign to specific agent
  const reassignConversation = async (convId: string, targetAgentId: string) => {
    const targetAgent = staffList.find((a) => a.user_id === targetAgentId);
    const agentName = targetAgent?.full_name || "Specialist";
    try {
      await supabase
        .from("support_conversations")
        .update({
          assigned_to: targetAgentId,
          status: "assigned",
          needs_human: true,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", convId);

      await supabase.from("support_messages").insert({
        conversation_id: convId,
        sender_id: user?.id || targetAgentId,
        sender_type: "admin",
        content: `🔄 Ticket reassigned to **${agentName}**.`,
      } as any);

      qc.invalidateQueries({ queryKey: ["admin-support-conversations"] });
      toast.success(`Ticket transferred to ${agentName}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to transfer ticket");
    }
  };

  // Release conversation back to queue
  const releaseConversation = async (convId: string) => {
    try {
      await supabase
        .from("support_conversations")
        .update({
          assigned_to: null,
          status: "pending",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", convId);

      await supabase.from("support_messages").insert({
        conversation_id: convId,
        sender_id: user?.id || "system",
        sender_type: "admin",
        content: `↩️ Ticket was released back to the unassigned queue.`,
      } as any);

      qc.invalidateQueries({ queryKey: ["admin-support-conversations"] });
      toast.info("Ticket released back to unassigned queue.");
    } catch (e: any) {
      toast.error(e.message || "Failed to release ticket");
    }
  };

  // Send message reply
  const sendReply = async () => {
    if (!reply.trim() || !selectedConv || !user) return;
    const conv = conversations.find((c: any) => c.id === selectedConv);
    if (conv?.assigned_to && conv.assigned_to !== user.id) {
      toast.error("This conversation is claimed by another specialist.");
      return;
    }
    if (!conv?.assigned_to) {
      await claimConversation(selectedConv);
    }
    setSending(true);
    try {
      await supabase.from("support_messages").insert({
        conversation_id: selectedConv,
        sender_id: user.id,
        sender_type: "admin",
        content: reply.trim(),
      });

      await supabase
        .from("support_conversations")
        .update({
          status: "open",
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", selectedConv);

      setReply("");
      qc.invalidateQueries({ queryKey: ["admin-support-messages", selectedConv] });
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const applyCannedReply = (text: string) => {
    setReply(text);
  };

  // Change status
  const updateConversationStatus = async (id: string, newStatus: string) => {
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "open" && !selectedConvData?.assigned_to) {
        updates.needs_human = true;
      }
      await supabase.from("support_conversations").update(updates).eq("id", id);
      qc.invalidateQueries({ queryKey: ["admin-support-conversations"] });
      toast.success(`Ticket status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Delete conversation
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
  const selectedAgent = selectedConvData?.assigned_to ? getAgent(selectedConvData.assigned_to) : null;
  const linkedImportReq = importRequests.find((r: any) => r.conversation_id === selectedConv);

  const isClaimed = Boolean(selectedConvData?.assigned_to && selectedConvData.assigned_to.trim() !== "");
  const isClaimedByMe = isClaimed && selectedConvData?.assigned_to === user?.id;
  const isClaimedByOther = isClaimed && !isClaimedByMe;

  // Counts for filter pills
  const counts = useMemo(() => {
    const total = conversations.length;
    const unassigned = conversations.filter(
      (c: any) => !c.assigned_to && c.status !== "closed" && c.status !== "resolved"
    ).length;
    const myTickets = conversations.filter(
      (c: any) => c.assigned_to === user?.id && c.status !== "closed"
    ).length;
    const open = conversations.filter(
      (c: any) => (c.status === "open" || c.status === "assigned") && c.status !== "closed"
    ).length;
    const paused = conversations.filter((c: any) => c.status === "paused" || c.status === "on_hold").length;
    const closed = conversations.filter((c: any) => c.status === "closed" || c.status === "resolved").length;
    return { total, unassigned, myTickets, open, paused, closed };
  }, [conversations, user?.id]);

  // Filtered conversations list
  const filteredConversations = useMemo(() => {
    return conversations.filter((c: any) => {
      // 1. Tab filter
      if (activeFilter === "unassigned") {
        if (c.assigned_to || c.status === "closed" || c.status === "resolved") return false;
      } else if (activeFilter === "my_tickets") {
        if (c.assigned_to !== user?.id) return false;
      } else if (activeFilter === "open") {
        if (c.status === "closed" || c.status === "resolved" || c.status === "paused") return false;
      } else if (activeFilter === "paused") {
        if (c.status !== "paused" && c.status !== "on_hold") return false;
      } else if (activeFilter === "closed") {
        if (c.status !== "closed" && c.status !== "resolved") return false;
      }

      // 2. Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const prof = getProfile(c.user_id);
      const name = prof?.full_name?.toLowerCase() || "";
      const phone = prof?.phone?.toLowerCase() || "";
      const subject = (c.subject || "").toLowerCase();
      const id = c.id.toLowerCase();
      return name.includes(q) || phone.includes(q) || subject.includes(q) || id.includes(q);
    });
  }, [conversations, activeFilter, searchQuery, user?.id, profiles]);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-6">
      {/* ── TOP HEADER & AGENT BAR ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[hsl(var(--cherry))] to-[hsl(345_75%_22%)] text-white flex items-center justify-center shadow-xs shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-foreground">
                Customer Support Hub
              </h1>
              {counts.unassigned > 0 && (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-mono animate-pulse">
                  {counts.unassigned} In Queue
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live customer assistance, SLA auto-assignment &amp; verified ticket tracking.
            </p>
          </div>
        </div>

        {/* Live Agents & Auto-Assign Controls */}
        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto">
          {/* Auto-Assign Toggle Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/60 bg-secondary/20">
            <Zap className={`w-3.5 h-3.5 ${autoAssignConfig.enabled ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
            <div className="flex flex-col text-left">
              <span className="text-[10.5px] font-bold text-foreground leading-tight">Auto-Assign</span>
              <span className="text-[9px] font-mono text-muted-foreground leading-tight">
                {autoAssignConfig.enabled ? `SLA: ${autoAssignConfig.timeoutMinutes}m` : "Disabled"}
              </span>
            </div>
            <Switch
              checked={autoAssignConfig.enabled}
              onCheckedChange={(v) => updateAutoAssign({ enabled: v })}
              className="scale-75 shrink-0 origin-right"
            />
          </div>

          {/* SLA Timeout Select */}
          {autoAssignConfig.enabled && (
            <select
              value={autoAssignConfig.timeoutMinutes}
              onChange={(e) => updateAutoAssign({ timeoutMinutes: Number(e.target.value) })}
              className="h-8 px-2 rounded-xl border border-border/60 bg-background text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              title="Auto-Assign SLA Timeout"
            >
              <option value={1}>SLA: 1 min</option>
              <option value={2}>SLA: 2 min</option>
              <option value={3}>SLA: 3 min (Default)</option>
              <option value={5}>SLA: 5 min</option>
              <option value={10}>SLA: 10 min</option>
            </select>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetchConversations()}
            className="h-8 rounded-xl gap-1 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── FILTER & SEARCH STRIPE ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(
            [
              { id: "all" as const, label: "All Tickets", count: counts.total, alert: false },
              { id: "unassigned" as const, label: "Queue (Unassigned)", count: counts.unassigned, alert: counts.unassigned > 0 },
              { id: "my_tickets" as const, label: "My Claimed", count: counts.myTickets, alert: false },
              { id: "open" as const, label: "Active", count: counts.open, alert: false },
              { id: "paused" as const, label: "Paused", count: counts.paused, alert: false },
              { id: "closed" as const, label: "Closed", count: counts.closed, alert: false },
            ]
          ).map((tab) => {
            const active = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveFilter(tab.id);
                  if (window.innerWidth < 1024) setSelectedConv(null);
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : tab.alert
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                    : "bg-secondary/20 border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-background/80 text-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search #TK, customer, phone..."
            className="pl-8 h-8 rounded-xl text-xs bg-card/60 border-border/70"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN WORKSPACE (LIST + CHAT CANVAS) ── */}
      <div
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 border border-border/70 rounded-2xl bg-card/40 backdrop-blur-md overflow-hidden shadow-xs"
        style={{ height: "calc(100vh - 210px)", minHeight: "520px" }}
      >
        {/* Left Column: Tickets Queue List (Full width on mobile when no conversation is selected) */}
        <div
          className={`lg:col-span-5 xl:col-span-4 border-r border-border/60 flex flex-col h-full overflow-hidden ${
            selectedConv ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="p-3 border-b border-border/50 bg-secondary/20 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              {activeFilter.replace("_", " ")} Queue ({filteredConversations.length})
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Live Feed</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filteredConversations.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <LifeBuoy className="w-8 h-8 text-muted-foreground mx-auto opacity-40" />
                <p className="text-xs font-semibold text-foreground">No conversations in this view</p>
                <p className="text-[11px] text-muted-foreground">
                  {searchQuery ? "Try refining your search terms." : "All customer requests are currently addressed."}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv: any) => {
                const profile = getProfile(conv.user_id);
                const assignedAgent = conv.assigned_to ? getAgent(conv.assigned_to) : null;
                const isMyClaim = conv.assigned_to === user?.id;
                const statusInfo = getTicketStatusInfo(conv.status, conv.assigned_to);
                const isSelected = selectedConv === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConv(conv.id)}
                    className={`w-full text-left p-3.5 transition-all cursor-pointer group relative ${
                      isSelected
                        ? "bg-primary/10 border-l-3 border-l-primary"
                        : "hover:bg-secondary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-secondary text-muted-foreground flex items-center justify-center text-[10px] shrink-0 font-bold">
                            {profile?.full_name?.[0] || "C"}
                          </div>
                        )}
                        <span className="text-xs font-bold text-foreground truncate">
                          {profile?.full_name || "Customer"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {conv.needs_human && (
                          <Badge variant="destructive" className="text-[8.5px] font-mono px-1 py-0 animate-pulse">
                            Handoff
                          </Badge>
                        )}
                        <span
                          className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${statusInfo.badgeClass}`}
                        >
                          <span className={`w-1 h-1 rounded-full ${statusInfo.dotClass}`} />
                          {statusInfo.label}
                        </span>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-all"
                              title="Delete conversation"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this support conversation and all messages.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteConversation(conv.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <p className="text-xs text-foreground/90 font-medium line-clamp-1 mb-1">
                      {conv.subject || "Customer Support Inquiry"}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-mono">#TK-{conv.id.slice(0, 8).toUpperCase()}</span>
                      <div className="flex items-center gap-2">
                        {assignedAgent ? (
                          <span className="flex items-center gap-1 font-medium text-foreground/80">
                            <UserCheck className="w-3 h-3 text-sky-500" />
                            {isMyClaim ? "You" : assignedAgent.full_name?.split(" ")[0] || "Agent"}
                          </span>
                        ) : (
                          <span className="text-amber-500 font-bold flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> Unassigned
                          </span>
                        )}
                        <span>{format(new Date(conv.updated_at || conv.created_at), "HH:mm")}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Interactive Chat Canvas (Full width on mobile when conversation is selected) */}
        <div
          className={`lg:col-span-7 xl:col-span-8 flex flex-col h-full overflow-hidden bg-background/50 ${
            !selectedConv ? "hidden lg:flex" : "flex"
          }`}
        >
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl bg-secondary/40 border border-border/60 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 opacity-40 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Select a Support Ticket</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Click any ticket in the queue to inspect messages, claim the session, voice call, or transfer.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Canvas Header */}
              <div className="p-3 border-b border-border/60 bg-secondary/30 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Mobile Back Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedConv(null)}
                    className="lg:hidden p-1 h-8 w-8 rounded-xl shrink-0"
                    title="Back to tickets list"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>

                  {selectedProfile?.avatar_url ? (
                    <img
                      src={selectedProfile.avatar_url}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-secondary text-primary font-bold flex items-center justify-center text-xs shrink-0 border border-border">
                      {selectedProfile?.full_name?.[0] || "C"}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground truncate">
                        {selectedProfile?.full_name || "Customer"}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-secondary border border-border/50 text-muted-foreground">
                        #TK-{selectedConvData?.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {selectedProfile?.phone && <span>{selectedProfile.phone}</span>}
                      {selectedConvData?.subject && (
                        <span className="truncate max-w-[200px] text-foreground/70">· {selectedConvData.subject}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {linkedImportReq && (
                    <a
                      href={linkedImportReq.product_url}
                      target="_blank"
                      rel="noopener"
                      className="text-[11px] text-primary flex items-center gap-1 px-2 py-1 rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/15 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Product Link
                    </a>
                  )}

                  {/* Status Dropdown */}
                  <select
                    value={selectedConvData?.status || "open"}
                    onChange={(e) => updateConversationStatus(selectedConv, e.target.value)}
                    className="h-8 px-2 rounded-xl border border-border bg-background text-[11px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer capitalize"
                  >
                    <option value="open">Open (Active)</option>
                    <option value="assigned">Assigned</option>
                    <option value="pending">Pending</option>
                    <option value="requested">Requested</option>
                    <option value="paused">Paused</option>
                    <option value="closed">Closed</option>
                  </select>

                  {/* Agent Reassignment Dropdown */}
                  <select
                    value={selectedConvData?.assigned_to || ""}
                    onChange={(e) => {
                      if (!e.target.value) {
                        releaseConversation(selectedConv);
                      } else {
                        reassignConversation(selectedConv, e.target.value);
                      }
                    }}
                    className="h-8 px-2 rounded-xl border border-border bg-background text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    title="Assign or transfer specialist"
                  >
                    <option value="">Unassigned (In Queue)</option>
                    {staffList.map((st) => (
                      <option key={st.user_id} value={st.user_id}>
                        {st.full_name || st.email} {st.user_id === user?.id ? "(You)" : ""}
                      </option>
                    ))}
                  </select>

                  {/* Claim Button */}
                  {!isClaimed ? (
                    <Button
                      size="sm"
                      onClick={() => claimConversation(selectedConv)}
                      className="h-8 rounded-xl gap-1 text-xs font-bold bg-primary text-primary-foreground shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Claim
                    </Button>
                  ) : isClaimedByMe ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => releaseConversation(selectedConv)}
                      className="h-8 rounded-xl text-xs text-muted-foreground hover:text-foreground"
                    >
                      Release
                    </Button>
                  ) : null}

                  {/* Voice Call Button */}
                  {isClaimedByMe && selectedConvData?.status !== "closed" && (
                    <VoiceCallButton
                      conversationId={selectedConv}
                      userId={selectedConvData.user_id}
                      adminId={user!.id}
                    />
                  )}
                </div>
              </div>

              {/* Chat Messages Body */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-muted-foreground">
                    No messages yet in this support ticket.
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isAdmin = msg.sender_type === "admin";
                    const isAi = msg.sender_type === "ai";
                    const isSystem = msg.content?.startsWith("🤖") || msg.content?.startsWith("⚡") || msg.content?.startsWith("👋") || msg.content?.startsWith("🔄");

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="py-1 text-center">
                          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-semibold bg-secondary/80 border border-border/50 text-muted-foreground">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isAdmin ? "justify-end" : "justify-start"}`}
                      >
                        {!isAdmin && (
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 text-muted-foreground text-xs font-bold">
                            {isAi ? <Bot className="w-3.5 h-3.5 text-primary" /> : <User className="w-3.5 h-3.5" />}
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words [overflow-wrap:anywhere] ${
                            isAdmin
                              ? "bg-gradient-to-r from-[hsl(var(--cherry))] to-[hsl(345_75%_22%)] text-white rounded-br-xs font-medium shadow-2xs"
                              : isAi
                              ? "bg-secondary/70 border border-border text-foreground rounded-bl-xs"
                              : "bg-secondary/90 border border-border/60 text-foreground rounded-bl-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <div className="text-[9px] opacity-60 text-right mt-1 font-mono">
                            {format(new Date(msg.created_at), "HH:mm")}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Canned Responses Chips Bar */}
              <div className="px-3 py-1.5 border-t border-border/40 bg-secondary/15 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold text-muted-foreground shrink-0 uppercase tracking-wider">
                  Quick:
                </span>
                {CANNED_REPLIES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => applyCannedReply(c.text)}
                    className="px-2 py-0.5 rounded-lg border border-border/50 bg-background/80 hover:bg-secondary text-[10px] font-medium text-foreground whitespace-nowrap transition-colors cursor-pointer"
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Bottom Chat Input Bar */}
              <div className="p-3 border-t border-border/60 bg-background">
                {isClaimedByOther ? (
                  <div className="p-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                    This ticket is currently handled by another specialist ({selectedAgent?.full_name || "Agent"}).
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                      placeholder="Type response (press Enter to send)..."
                      className="h-9 rounded-xl text-xs bg-secondary/25 border-border/70 focus:bg-background"
                    />
                    <Button
                      onClick={sendReply}
                      disabled={!reply.trim() || sending}
                      className="h-9 px-4 rounded-xl gap-1.5 font-bold text-xs bg-primary text-primary-foreground shadow-2xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Send</span>
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
}
