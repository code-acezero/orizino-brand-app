import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@ui/components/ui/button";
import { Input } from "@ui/components/ui/input";
import { Badge } from "@ui/components/ui/badge";
import { toast } from "sonner";
import {
  Send,
  MessageCircle,
  Clock,
  CheckCircle2,
  UserCheck,
  Search,
  ChevronLeft,
  Headphones,
  User,
  LifeBuoy,
  RotateCcw,
  Phone,
  Check,
  X,
  Bot,
  AlertTriangle,
  Filter,
  ArrowRightLeft,
  UserPlus,
  Lock,
  Unlock,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import { format } from "date-fns";

type FilterTab = "all" | "unassigned" | "my_tickets" | "open" | "complaints" | "closed";

interface Conversation {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  subject?: string | null;
  type?: string | null;
  status: string;
  assigned_to: string | null;
  needs_human?: boolean | null;
  priority: string;
  created_at: string;
  updated_at: string;
  phone?: string | null;
  name?: string | null;
  email?: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: string;
  content: string;
  is_system?: boolean;
  created_at: string;
}

interface StaffAgent {
  user_id: string;
  full_name: string;
  avatar_url?: string;
}

const CANNED_REPLIES = [
  { label: "👋 Greeting", text: "Hello! Welcome to Orizino Support. How can I assist you with your order today?" },
  { label: "📦 Shipping Check", text: "I am tracking your order with our courier logistics right now. Please allow me one moment." },
  { label: "🔄 Exchange/Return", text: "We have initiated your size exchange request. Our dispatch team will process the courier swap shortly." },
  { label: "✅ Resolved", text: "I'm delighted we could resolve this for you! If you have any further questions, please let us know. Have a wonderful day!" },
];

function getStatusBadge(status: string, assignedTo: string | null) {
  if (status === "closed") return { label: "Closed", cls: "bg-muted text-muted-foreground" };
  if (!assignedTo) return { label: "Unassigned", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  if (status === "open") return { label: "Open", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400" };
  if (status === "assigned") return { label: "Assigned", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
  return { label: status, cls: "bg-secondary text-foreground" };
}

export function SupportTickets() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Queries ──────────────────────────────────────────────
  const { data: convs = [], isLoading, refetch } = useQuery<Conversation[]>({
    queryKey: ["orderops-support-conversations"],
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("support_conversations")
        .select("*")
        .order("needs_human", { ascending: false })
        .order("updated_at", { ascending: false })) as { data: any; error: any };
      if (error) { toast.error("Failed to load conversations"); return []; }
      return data || [];
    },
    refetchInterval: 8_000,
  });

  const { data: staffList = [] } = useQuery<StaffAgent[]>({
    queryKey: ["orderops-staff-list"],
    queryFn: async () => {
      const { data: roles } = (await supabase.from("user_roles").select("user_id")) as any;
      const ids: string[] = Array.from(new Set<string>((roles || []).map((r: any) => String(r.user_id || "")))).filter(Boolean);
      if (!ids.length) return user ? [{ user_id: user.id, full_name: (user as any).user_metadata?.full_name || "Me" }] : [];
      const { data: pList } = (await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)) as any;
      return (pList || []).map((p: any) => ({ user_id: p.id, full_name: p.full_name || "Agent", avatar_url: p.avatar_url }));
    },
    staleTime: 60_000,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["orderops-support-messages", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data } = (await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true })) as { data: any; error: any };
      return data || [];
    },
    enabled: !!selectedId,
    refetchInterval: 4_000,
  });

  // Real-time subscription for selected conversation messages
  useEffect(() => {
    if (!selectedId) return;
    const ch = supabase
      .channel(`orderops-msg-${selectedId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages", filter: `conversation_id=eq.${selectedId}` },
        () => qc.invalidateQueries({ queryKey: ["orderops-support-messages", selectedId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedId, qc]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConv = useMemo(() => convs.find((c) => c.id === selectedId), [convs, selectedId]);
  const isClaimedByMe = selectedConv?.assigned_to === user?.id;
  const isClaimedByOther = !!selectedConv?.assigned_to && selectedConv.assigned_to !== user?.id;
  const assignedAgent = staffList.find((a) => a.user_id === selectedConv?.assigned_to);

  const filteredConvs = useMemo(() => convs.filter((c) => {
    if (filter === "unassigned" && c.assigned_to) return false;
    if (filter === "my_tickets" && c.assigned_to !== user?.id) return false;
    if (filter === "open" && (c.status === "closed" || !c.assigned_to)) return false;
    if (filter === "closed" && c.status !== "closed") return false;
    if (filter === "complaints" && c.type !== "complaint") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const name = (c.guest_name || c.name || "").toLowerCase();
      const phone = (c.guest_phone || c.phone || "").toLowerCase();
      const email = (c.guest_email || c.email || "").toLowerCase();
      const subject = (c.subject || "").toLowerCase();
      if (!name.includes(q) && !phone.includes(q) && !email.includes(q) && !subject.includes(q)) return false;
    }
    return true;
  }), [convs, filter, search, user?.id]);

  const counts = useMemo(() => ({
    all: convs.length,
    unassigned: convs.filter(c => !c.assigned_to && c.status !== "closed").length,
    my_tickets: convs.filter(c => c.assigned_to === user?.id).length,
    open: convs.filter(c => c.assigned_to && c.status !== "closed").length,
    complaints: convs.filter(c => c.type === "complaint").length,
    closed: convs.filter(c => c.status === "closed").length,
  }), [convs, user?.id]);

  // ── Actions ──────────────────────────────────────────────
  const sendReply = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!reply.trim() || !selectedId || sending) return;
    setSending(true);
    try {
      const agentName = (user as any)?.user_metadata?.full_name || "Support Agent";
      await supabase.from("support_messages").insert({
        conversation_id: selectedId,
        sender_type: "admin",
        sender_id: user?.id,
        content: reply.trim(),
      });
      await supabase.from("support_conversations").update({ updated_at: new Date().toISOString() }).eq("id", selectedId);
      setReply("");
      qc.invalidateQueries({ queryKey: ["orderops-support-messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["orderops-support-conversations"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const claimTicket = async () => {
    if (!selectedId || !user) return;
    if (isClaimedByOther) { toast.error("Already claimed by another agent."); return; }
    const agentName = (user as any)?.user_metadata?.full_name || "Support Agent";
    try {
      await supabase.from("support_conversations")
        .update({ assigned_to: user.id, status: "open", needs_human: true, updated_at: new Date().toISOString() } as any)
        .eq("id", selectedId);
      // Internal system note
      await (supabase as any).from("support_messages").insert({ conversation_id: selectedId, sender_id: user.id, sender_type: "admin", is_system: true, content: `Agent ${agentName} claimed ticket.` });
      // Customer-facing message
      await (supabase as any).from("support_messages").insert({ conversation_id: selectedId, sender_id: user.id, sender_type: "admin", is_system: false, content: `Hi there! I'm ${agentName} and I'll be your dedicated support specialist today. Thank you for your patience — I'm here to help! 😊` });
      qc.invalidateQueries({ queryKey: ["orderops-support-conversations"] });
      qc.invalidateQueries({ queryKey: ["orderops-support-messages", selectedId] });
      toast.success("Ticket claimed!");
    } catch (e: any) { toast.error(e.message || "Failed to claim"); }
  };

  const releaseTicket = async () => {
    if (!selectedId) return;
    try {
      await supabase.from("support_conversations")
        .update({ assigned_to: null, status: "pending", updated_at: new Date().toISOString() } as any)
        .eq("id", selectedId);
      await (supabase as any).from("support_messages").insert({ conversation_id: selectedId, sender_id: user?.id, sender_type: "admin", is_system: true, content: "Ticket released back to unassigned queue." });
      qc.invalidateQueries({ queryKey: ["orderops-support-conversations"] });
      toast.info("Ticket released to queue.");
    } catch (e: any) { toast.error(e.message || "Failed to release"); }
  };

  const transferTicket = async (targetId: string) => {
    if (!selectedId) return;
    const target = staffList.find(a => a.user_id === targetId);
    const agentName = target?.full_name || "Specialist";
    try {
      await supabase.from("support_conversations")
        .update({ assigned_to: targetId, status: "assigned", updated_at: new Date().toISOString() } as any)
        .eq("id", selectedId);
      await (supabase as any).from("support_messages").insert({ conversation_id: selectedId, sender_id: user?.id, sender_type: "admin", is_system: true, content: `Ticket transferred to ${agentName}.` });
      await (supabase as any).from("support_messages").insert({ conversation_id: selectedId, sender_id: targetId, sender_type: "admin", is_system: false, content: `Hi! I'm ${agentName}, and I've been assigned to assist you from here. Happy to help! 😊` });
      setShowTransfer(false);
      qc.invalidateQueries({ queryKey: ["orderops-support-conversations"] });
      qc.invalidateQueries({ queryKey: ["orderops-support-messages", selectedId] });
      toast.success(`Transferred to ${agentName}`);
    } catch (e: any) { toast.error(e.message || "Failed to transfer"); }
  };

  const closeTicket = async () => {
    if (!selectedId) return;
    try {
      await supabase.from("support_conversations")
        .update({ status: "closed", updated_at: new Date().toISOString() } as any)
        .eq("id", selectedId);
      await (supabase as any).from("support_messages").insert({ conversation_id: selectedId, sender_id: user?.id, sender_type: "admin", is_system: true, content: "Ticket closed by agent." });
      qc.invalidateQueries({ queryKey: ["orderops-support-conversations"] });
      qc.invalidateQueries({ queryKey: ["orderops-support-messages", selectedId] });
      toast.success("Ticket closed.");
    } catch (e: any) { toast.error(e.message || "Failed to close ticket"); }
  };

  const reopenTicket = async () => {
    if (!selectedId) return;
    try {
      await supabase.from("support_conversations")
        .update({ status: "open", updated_at: new Date().toISOString() } as any)
        .eq("id", selectedId);
      qc.invalidateQueries({ queryKey: ["orderops-support-conversations"] });
      toast.success("Ticket reopened.");
    } catch (e: any) { toast.error(e.message || "Failed to reopen"); }
  };

  const FILTERS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "unassigned", label: "Unassigned" },
    { id: "my_tickets", label: "Mine" },
    { id: "open", label: "Open" },
    { id: "complaints", label: "Complaints" },
    { id: "closed", label: "Resolved" },
  ];

  return (
    <div className="space-y-4 pt-1 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 font-display">
            <Headphones className="w-6 h-6 text-primary" />
            <span>Customer Support</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Realtime ticket management · claim, reply, transfer, close
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl h-8 px-3 text-xs gap-1.5 bg-card hover:bg-muted self-start sm:self-center">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 border border-border/70 rounded-2xl bg-card/40 backdrop-blur-md overflow-hidden shadow-xs" style={{ height: "calc(100vh - 210px)", minHeight: "520px" }}>
        {/* Left: Ticket Queue */}
        <div className={`lg:col-span-5 border-r border-border/60 flex flex-col h-full overflow-hidden ${selectedId ? "hidden lg:flex" : "flex"}`}>
          {/* Compact single-row filter bar */}
          <div className="p-2.5 border-b border-border/50 space-y-2 bg-secondary/10">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    filter === f.id
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {f.label}
                  {counts[f.id] > 0 && (
                    <span className={`text-[9px] font-mono px-1 rounded ${filter === f.id ? "bg-white/20" : "bg-secondary text-foreground/70"}`}>
                      {counts[f.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, subject…" className="h-8 rounded-xl pl-9 text-xs bg-muted/20 border-border/60" />
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {isLoading && (
              <div className="py-10 text-center text-xs text-muted-foreground space-y-2">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Loading tickets…</p>
              </div>
            )}
            {!isLoading && filteredConvs.length === 0 && (
              <div className="text-center py-12 text-xs text-muted-foreground">
                <LifeBuoy className="w-8 h-8 mx-auto opacity-30 mb-2" />
                No tickets in this view.
              </div>
            )}
            {filteredConvs.map((conv) => {
              const isSelected = selectedId === conv.id;
              const title = conv.guest_name || conv.name || conv.subject || conv.guest_phone || conv.phone || "Customer";
              const phone = conv.guest_phone || conv.phone;
              const status = getStatusBadge(conv.status, conv.assigned_to);
              const isMine = conv.assigned_to === user?.id;
              const agent = staffList.find(a => a.user_id === conv.assigned_to);

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full p-3.5 cursor-pointer transition-all group relative ${
                    isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-secondary/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold shrink-0">
                        {title[0]?.toUpperCase() || "C"}
                      </div>
                      <span className="text-xs font-bold text-foreground truncate">{title}</span>
                      {conv.type === "complaint" && (
                        <span title="Complaint" className="inline-flex">
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        </span>
                      )}
                      {conv.needs_human && conv.status !== "closed" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" title="Needs human" />
                      )}
                    </div>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${status.cls}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground/80 truncate mb-1">{conv.subject || "Support Inquiry"}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-mono truncate">#TK-{conv.id.slice(0, 8).toUpperCase()}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {agent ? (
                        <span className="flex items-center gap-0.5">
                          <UserCheck className="w-3 h-3 text-sky-500" />
                          {isMine ? "You" : agent.full_name?.split(" ")[0]}
                        </span>
                      ) : (
                        <span className="text-amber-500 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" /> Queue
                        </span>
                      )}
                      {phone && (
                        <span
                          title="Click to call"
                          onClick={(e) => { e.stopPropagation(); window.open(`tel:${phone}`); }}
                          className="p-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
                        >
                          <Phone className="w-2.5 h-2.5" />
                        </span>
                      )}
                      <span>{format(new Date(conv.updated_at || conv.created_at), "HH:mm")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Chat Panel */}
        <div className={`lg:col-span-7 flex flex-col h-full overflow-hidden bg-background/50 ${!selectedId ? "hidden lg:flex" : "flex"}`}>
          {!selectedConv ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8 text-center">
              <MessageCircle className="w-10 h-10 opacity-30" />
              <div>
                <p className="font-semibold text-sm text-foreground">No Ticket Selected</p>
                <p className="text-xs mt-0.5">Pick a ticket from the queue to start replying.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-border/60 bg-secondary/20 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button type="button" onClick={() => setSelectedId(null)} className="lg:hidden p-1.5 rounded-lg bg-secondary text-foreground">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate flex items-center gap-1.5">
                      {selectedConv.guest_name || selectedConv.name || selectedConv.subject || "Customer Ticket"}
                      {selectedConv.type === "complaint" && (
                        <Badge variant="destructive" className="text-[9px] font-mono px-1 py-0">Complaint</Badge>
                      )}
                    </h3>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      #TK-{selectedConv.id.slice(0, 8).toUpperCase()} ·{" "}
                      {selectedConv.guest_phone || selectedConv.phone || selectedConv.guest_email || selectedConv.email || "Web Chat"}
                    </p>
                  </div>
                </div>

                {/* Action buttons — single compact row */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Phone */}
                  {(selectedConv.guest_phone || selectedConv.phone) && (
                    <a
                      href={`tel:${selectedConv.guest_phone || selectedConv.phone}`}
                      className="h-7 px-2.5 rounded-lg text-[11px] font-bold gap-1 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center transition-colors"
                    >
                      <Phone className="w-3 h-3" /> Call
                    </a>
                  )}

                  {/* Claim */}
                  {!selectedConv.assigned_to && (
                    <button onClick={claimTicket} className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1 transition-colors cursor-pointer">
                      <UserPlus className="w-3 h-3" /> Claim
                    </button>
                  )}

                  {/* Release */}
                  {isClaimedByMe && (
                    <button onClick={releaseTicket} className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-secondary hover:bg-muted text-foreground flex items-center gap-1 transition-colors cursor-pointer border border-border/60">
                      <Unlock className="w-3 h-3" /> Release
                    </button>
                  )}

                  {/* Transfer */}
                  {isClaimedByMe && (
                    <div className="relative">
                      <button
                        onClick={() => setShowTransfer((v) => !v)}
                        className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-secondary hover:bg-muted text-foreground flex items-center gap-1 transition-colors cursor-pointer border border-border/60"
                      >
                        <ArrowRightLeft className="w-3 h-3" /> Transfer
                      </button>
                      {showTransfer && (
                        <div className="absolute right-0 top-8 z-50 w-48 rounded-xl border border-border bg-card shadow-xl py-1 text-xs">
                          <p className="px-3 py-1 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Transfer to</p>
                          {staffList.filter(a => a.user_id !== user?.id).map((a) => (
                            <button
                              key={a.user_id}
                              onClick={() => transferTicket(a.user_id)}
                              className="w-full text-left px-3 py-1.5 hover:bg-secondary/60 flex items-center gap-2 cursor-pointer"
                            >
                              <User className="w-3 h-3 text-muted-foreground" />
                              {a.full_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Close / Reopen */}
                  {selectedConv.status !== "closed" ? (
                    <button onClick={closeTicket} className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors cursor-pointer border border-border/60">
                      <CheckCircle2 className="w-3 h-3" /> Close
                    </button>
                  ) : (
                    <button onClick={reopenTicket} className="h-7 px-2.5 rounded-lg text-[11px] font-bold bg-muted hover:bg-secondary text-muted-foreground flex items-center gap-1 transition-colors cursor-pointer border border-border/60">
                      <RotateCcw className="w-3 h-3" /> Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Complaint details section */}
              {selectedConv.type === "complaint" && (
                <div className="mx-3 mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Complaint Ticket
                  </div>
                  <p className="text-muted-foreground">{selectedConv.subject || "Customer submitted a formal complaint."}</p>
                </div>
              )}

              {/* Claimed by other */}
              {isClaimedByOther && (
                <div className="mx-3 mt-2 p-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                  This ticket is handled by <strong>{assignedAgent?.full_name || "another agent"}</strong>. Viewing in read-only mode.
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
                {messages.filter(m => !m.is_system).map((m) => {
                  const isAgent = m.sender_type === "agent" || m.sender_type === "admin";
                  const isAi = m.sender_type === "ai";
                  return (
                    <div key={m.id} className={`flex gap-2 ${isAgent ? "justify-end" : "justify-start"}`}>
                      {!isAgent && (
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          {isAi ? <Bot className="w-3 h-3 text-primary" /> : <User className="w-3 h-3 text-muted-foreground" />}
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words [overflow-wrap:anywhere] ${
                        isAgent
                          ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-br-sm font-medium shadow-2xs"
                          : isAi
                          ? "bg-secondary/70 border border-border text-foreground rounded-bl-sm"
                          : "bg-secondary/90 border border-border/60 text-foreground rounded-bl-sm"
                      }`}>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <div className="text-[9px] opacity-60 text-right mt-1 font-mono">
                          {format(new Date(m.created_at), "HH:mm")}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Canned replies bar */}
              <div className="px-3 py-1.5 border-t border-border/40 bg-secondary/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold text-muted-foreground shrink-0 uppercase tracking-wider">Quick:</span>
                {CANNED_REPLIES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setReply(c.text)}
                    className="px-2 py-0.5 rounded-lg border border-border/50 bg-background/80 hover:bg-secondary text-[10px] font-medium text-foreground whitespace-nowrap transition-colors cursor-pointer"
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Reply Input */}
              <div className="p-3 border-t border-border/60 bg-background">
                {isClaimedByOther ? (
                  <div className="p-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 text-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Read-only — ticket owned by {assignedAgent?.full_name || "another agent"}.
                  </div>
                ) : (
                  <form onSubmit={sendReply} className="flex items-center gap-2">
                    <Input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                      placeholder={selectedConv.status === "closed" ? "Ticket is closed. Reopen to reply." : "Type response (Enter to send)…"}
                      disabled={selectedConv.status === "closed"}
                      className="h-9 rounded-xl text-xs bg-secondary/25 border-border/70 focus:bg-background"
                    />
                    <Button
                      type="submit"
                      disabled={!reply.trim() || sending || selectedConv.status === "closed"}
                      className="h-9 px-4 rounded-xl gap-1.5 font-bold text-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Send</span>
                    </Button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
