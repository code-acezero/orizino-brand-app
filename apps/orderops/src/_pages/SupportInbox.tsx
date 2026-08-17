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
  Shield,
  LifeBuoy,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { format } from "date-fns";

type FilterTab = "all" | "queue" | "my" | "active" | "paused" | "closed";

interface Conversation {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  status: string;
  assigned_to: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  profiles?: { full_name: string; email: string } | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_type: string;
  content: string;
  created_at: string;
}

export function SupportInbox() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: convs = [], isLoading, refetch } = useQuery<Conversation[]>({
    queryKey: ["orderops-support-conversations"],
    queryFn: async () => {
      const { data, error } = (await supabase
        .from("support_conversations")
        .select(`
          id, user_id, guest_name, guest_email, guest_phone,
          status, assigned_to, priority, created_at, updated_at, last_message_at,
          profiles:user_id ( full_name, email )
        `)
        .order("last_message_at", { ascending: false })) as { data: any; error: any };
      if (error) {
        toast.error("Failed to load conversations");
        return [];
      }
      return data || [];
    },
    refetchInterval: 10_000,
  });

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["orderops-support-messages", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = (await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true })) as { data: any; error: any };
      if (error) return [];
      return data || [];
    },
    enabled: !!selectedId,
    refetchInterval: 4_000,
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("orderops-support-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages" },
        () => {
          qc.invalidateQueries({ queryKey: ["orderops-support-conversations"] });
          if (selectedId) {
            qc.invalidateQueries({ queryKey: ["orderops-support-messages", selectedId] });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const counts = useMemo(() => {
    return {
      all: convs.length,
      queue: convs.filter((c) => !c.assigned_to && c.status !== "closed").length,
      my: convs.filter((c) => c.assigned_to === user?.id && c.status !== "closed").length,
      active: convs.filter((c) => c.status === "open" || c.status === "in_progress").length,
      paused: convs.filter((c) => c.status === "paused" || c.status === "waiting").length,
      closed: convs.filter((c) => c.status === "closed").length,
    };
  }, [convs, user?.id]);

  const filteredConvs = useMemo(() => {
    return convs.filter((c) => {
      if (filter === "queue" && (c.assigned_to || c.status === "closed")) return false;
      if (filter === "my" && (c.assigned_to !== user?.id || c.status === "closed")) return false;
      if (filter === "active" && c.status !== "open" && c.status !== "in_progress") return false;
      if (filter === "paused" && c.status !== "paused" && c.status !== "waiting") return false;
      if (filter === "closed" && c.status !== "closed") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const name = (c.profiles?.full_name || c.guest_name || "").toLowerCase();
        const email = (c.profiles?.email || c.guest_email || "").toLowerCase();
        const phone = (c.guest_phone || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      }
      return true;
    });
  }, [convs, filter, search, user?.id]);

  const selectedConv = convs.find((c) => c.id === selectedId);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!reply.trim() || !selectedId) return;
    setSending(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        conversation_id: selectedId,
        sender_id: user?.id,
        sender_type: "agent",
        content: reply.trim(),
      });
      if (error) throw error;
      setReply("");
      qc.invalidateQueries({ queryKey: ["orderops-support-messages", selectedId] });
      qc.invalidateQueries({ queryKey: ["orderops-support-conversations"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedId) return;
    try {
      const { error } = await supabase
        .from("support_conversations")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", selectedId);
      if (error) throw error;
      toast.success(`Ticket marked as ${newStatus}`);
      qc.invalidateQueries({ queryKey: ["orderops-support-conversations"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket status");
    }
  };

  const handleClaim = async () => {
    if (!selectedId || !user?.id) return;
    try {
      const isClaimed = selectedConv?.assigned_to === user.id;
      const { error } = await supabase
        .from("support_conversations")
        .update({
          assigned_to: isClaimed ? null : user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedId);
      if (error) throw error;
      toast.success(isClaimed ? "Ticket released to queue" : "Ticket claimed by you");
      qc.invalidateQueries({ queryKey: ["orderops-support-conversations"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update assignment");
    }
  };

  return (
    <div className="space-y-4 pt-1 pb-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            <span>Support Inbox</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Customer conversations, chat requests & service tickets
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="rounded-xl h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Main Single Segmented Pill Filter Bar */}
      <div className="w-full overflow-x-auto no-scrollbar pb-1">
        <div className="inline-flex items-center gap-1 p-1 bg-secondary/40 border border-border/70 rounded-2xl backdrop-blur-md min-w-full sm:min-w-0 shadow-2xs">
          {[
            { id: "all", label: "All Tickets", count: counts.all },
            { id: "queue", label: "Queue (Unassigned)", count: counts.queue, alert: counts.queue > 0 },
            { id: "my", label: "My Claimed", count: counts.my },
            { id: "active", label: "Active", count: counts.active },
            { id: "paused", label: "Paused", count: counts.paused },
            { id: "closed", label: "Closed", count: counts.closed },
          ].map((tab) => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id as FilterTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : tab.alert
                      ? "bg-amber-500/20 text-amber-500"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Support Grid (Mobile: master-detail toggle; Desktop: 2-column) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[500px]">
        {/* Ticket List Column */}
        <div
          className={`md:col-span-5 flex flex-col gap-3 ${
            selectedId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, email or phone…"
              className="h-10 rounded-2xl pl-10 text-xs bg-card/70 border-border/70"
            />
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[600px] pr-1">
            {isLoading && (
              <div className="text-center py-12 text-muted-foreground text-xs">
                Loading tickets…
              </div>
            )}
            {!isLoading && filteredConvs.length === 0 && (
              <div className="text-center py-12 border border-border/60 rounded-3xl bg-card/40 p-6 text-muted-foreground text-xs">
                <LifeBuoy className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <span>No tickets match this filter</span>
              </div>
            )}
            {filteredConvs.map((c) => {
              const isSelected = c.id === selectedId;
              const name = c.profiles?.full_name || c.guest_name || "Guest Customer";
              const contact = c.profiles?.email || c.guest_email || c.guest_phone || "No contact";
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/8 shadow-sm"
                      : "border-border/60 bg-card/70 hover:bg-card hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground truncate">
                          {name}
                        </span>
                        {c.assigned_to === user?.id && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1.5 py-0">
                            Mine
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {contact}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        c.status === "open"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : c.status === "in_progress"
                          ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          : c.status === "closed"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {c.last_message_at
                        ? format(new Date(c.last_message_at), "MMM d, h:mm a")
                        : "New"}
                    </span>
                    <span>{c.priority} priority</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversation View Column */}
        <div
          className={`md:col-span-7 flex flex-col rounded-3xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden ${
            !selectedId ? "hidden md:flex items-center justify-center p-8 text-center" : "flex"
          }`}
        >
          {selectedConv ? (
            <div className="flex flex-col h-full min-h-[500px]">
              {/* Thread Header */}
              <div className="p-3.5 border-b border-border/60 bg-secondary/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="md:hidden p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {selectedConv.profiles?.full_name || selectedConv.guest_name || "Guest Customer"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {selectedConv.profiles?.email || selectedConv.guest_phone || "Live Conversation"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClaim}
                    className="rounded-xl h-8 px-2 text-[11px] gap-1 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{selectedConv.assigned_to === user?.id ? "Release" : "Claim"}</span>
                  </Button>
                  <select
                    value={selectedConv.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="h-8 px-2 text-xs rounded-xl bg-secondary border border-border text-foreground font-medium cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="paused">Paused</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px]">
                {messages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-10">
                    No messages yet in this ticket
                  </p>
                )}
                {messages.map((m) => {
                  const isAgent = m.sender_type === "agent" || m.sender_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAgent ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed ${
                          isAgent
                            ? "bg-primary text-primary-foreground rounded-tr-xs"
                            : "bg-secondary border border-border/70 text-foreground rounded-tl-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content || (m as any).message}</p>
                      </div>
                      <span className="text-[9px] text-muted-foreground mt-1 px-1">
                        {format(new Date(m.created_at), "h:mm a")}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form
                onSubmit={handleSend}
                className="p-3 border-t border-border/60 bg-secondary/20 flex items-center gap-2"
              >
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type reply to customer…"
                  className="h-10 rounded-2xl text-xs sm:text-sm bg-background border-border/70"
                />
                <Button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="h-10 px-4 rounded-2xl text-xs font-semibold gap-1.5 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <MessageCircle className="w-10 h-10 opacity-30" />
              <p className="text-sm font-semibold">Select a conversation</p>
              <p className="text-xs opacity-70">
                Choose a ticket from the left to view messages and respond
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
