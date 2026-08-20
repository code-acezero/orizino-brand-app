import { supabase } from "@/integrations/supabase/client";

export interface AutoAssignConfig {
  enabled: boolean;
  timeoutMinutes: number; // e.g. 1, 2, 3, 5, 10
  mode: "least_busy" | "round_robin";
}

export interface StaffAgent {
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
  roles?: string[];
}

export interface AutoAssignResult {
  assignedCount: number;
  assignedTickets: Array<{
    ticketId: string;
    agentId: string;
    agentName: string;
    subject: string;
  }>;
}

/**
 * Checks for unassigned tickets exceeding the SLA timeout and assigns them
 * across available staff agents.
 */
export async function runAutoAssignCheck(
  conversations: any[],
  staffList: StaffAgent[],
  config: AutoAssignConfig,
  currentUserId?: string
): Promise<AutoAssignResult> {
  if (!config.enabled || !staffList.length) {
    return { assignedCount: 0, assignedTickets: [] };
  }

  const now = Date.now();
  const thresholdMs = config.timeoutMinutes * 60 * 1000;

  // 1. Find unassigned tickets that are past SLA timeout
  const unassignedPastSla = conversations.filter((c: any) => {
    if (c.status === "closed" || c.status === "resolved") return false;
    if (c.assigned_to && c.assigned_to.trim() !== "") return false;

    const createdTime = new Date(c.created_at || c.updated_at || now).getTime();
    return now - createdTime >= thresholdMs;
  });

  if (!unassignedPastSla.length) {
    return { assignedCount: 0, assignedTickets: [] };
  }

  // 2. Calculate current workload per staff agent
  const activeConversations = conversations.filter(
    (c: any) => c.assigned_to && c.status !== "closed" && c.status !== "resolved"
  );

  const agentWorkload: Record<string, number> = {};
  staffList.forEach((agent) => {
    agentWorkload[agent.user_id] = 0;
  });

  activeConversations.forEach((c: any) => {
    if (agentWorkload[c.assigned_to] !== undefined) {
      agentWorkload[c.assigned_to] += 1;
    }
  });

  const assignedTickets: AutoAssignResult["assignedTickets"] = [];

  // 3. Process each overdue unassigned ticket
  for (const ticket of unassignedPastSla) {
    // Pick agent with minimum active load
    let targetAgent: StaffAgent = staffList[0];
    let minLoad = Infinity;

    for (const agent of staffList) {
      const load = agentWorkload[agent.user_id] ?? 0;
      if (load < minLoad) {
        minLoad = load;
        targetAgent = agent;
      }
    }

    const agentName = targetAgent.full_name || targetAgent.email || "Support Agent";

    try {
      // Update ticket assignment
      const { error: updateError } = await supabase
        .from("support_conversations")
        .update({
          assigned_to: targetAgent.user_id,
          status: "assigned",
          needs_human: true,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", ticket.id);

      if (updateError) {
        console.error("Auto-assign update error:", updateError);
        continue;
      }

      // Internal audit note (hidden from admin & customer chat views)
      await supabase.from("support_messages").insert({
        conversation_id: ticket.id,
        sender_id: currentUserId || targetAgent.user_id,
        sender_type: "admin",
        is_system: true,
        content: `SLA Auto-Assign: Ticket assigned to ${agentName} after ${config.timeoutMinutes}m without response.`,
      } as any);

      // Professional customer-facing message (visible in widget)
      await supabase.from("support_messages").insert({
        conversation_id: ticket.id,
        sender_id: targetAgent.user_id,
        sender_type: "admin",
        is_system: false,
        content: `Hi there! I'm ${agentName} and I'll be your dedicated support specialist today. Thank you for your patience \u2014 I'm here to help resolve your inquiry! \ud83d\ude0a`,
      } as any);

      // In-app notification for the assigned agent
      await supabase.from("notifications").insert({
        title: "\u26a1 Support Ticket Auto-Assigned",
        message: `Ticket #TK-${ticket.id.slice(0, 8).toUpperCase()} was auto-assigned to you (${ticket.subject || "Customer Inquiry"}).`,
        type: "support",
        priority: "high",
        link_url: `/sales/support?c=${ticket.id}`,
      } as any);

      // In-app notification for the customer
      if (ticket.user_id) {
        await (supabase as any).from("notifications").insert({
          user_id: ticket.user_id,
          title: "Support Agent Assigned",
          message: `${agentName} has been assigned to help you with your support request.`,
          type: "support",
          priority: "high",
          link_url: "/support",
        });

        // Trigger email notification to customer via edge function (best-effort)
        supabase.functions
          .invoke("send-assignment-email", {
            body: {
              conversation_id: ticket.id,
              user_id: ticket.user_id,
              agent_name: agentName,
              subject: ticket.subject || "Your Support Request",
            },
          })
          .catch(() => {});
      }

      // Update in-memory load
      agentWorkload[targetAgent.user_id] = (agentWorkload[targetAgent.user_id] || 0) + 1;

      assignedTickets.push({
        ticketId: ticket.id,
        agentId: targetAgent.user_id,
        agentName,
        subject: ticket.subject || "Support Inquiry",
      });
    } catch (e) {
      console.error("Auto-assign loop error:", e);
    }
  }

  return {
    assignedCount: assignedTickets.length,
    assignedTickets,
  };
}
