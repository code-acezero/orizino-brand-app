"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TabsWithParam } from "@/components/admin/TabsWithParam";
import { toast } from "@/lib/app-toast";
import { RotateCcw, Package, Clock, XCircle } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import CardGridSkeleton from "@/components/skeletons/CardGridSkeleton";
import { format } from "date-fns";
import { decideCancellation, decideReturn } from "@/lib/order-workflows.functions";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  approved: "bg-blue-500/10 text-blue-500",
  rejected: "bg-destructive/10 text-destructive",
  completed: "bg-green-500/10 text-green-500",
  cancelled: "bg-muted text-muted-foreground",
};

const AdminReturns = () => {
  const qc = useQueryClient();
  const [returnSel, setReturnSel] = useState<any>(null);
  const [cancelSel, setCancelSel] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [returnTracking, setReturnTracking] = useState<string>("");

  const { data: returns = [], isLoading: rLoading } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("return_requests")
        .select("*, orders(order_number, total, shipping_address)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: cancellations = [], isLoading: cLoading } = useQuery({
    queryKey: ["admin-cancellations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cancellation_requests")
        .select("*, orders(order_number, total, payment_method, shipping_address)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const returnMutation = useMutation({
    mutationFn: (input: { id: string; decision: "approve" | "reject" | "complete" }) =>
      decideReturn({
        data: {
          id: input.id,
          decision: input.decision,
          admin_notes: adminNotes || undefined,
          return_tracking: returnTracking || undefined,
          refund_amount: refundAmount ? Number(refundAmount) : undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-returns"] });
      setReturnSel(null);
      setAdminNotes("");
      setReturnTracking("");
      setRefundAmount("");
      toast.success("Return updated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const cancelMutation = useMutation({
    mutationFn: (input: { id: string; decision: "approve" | "reject"; refund_approved?: boolean }) =>
      decideCancellation({
        data: {
          id: input.id,
          decision: input.decision,
          admin_notes: adminNotes || undefined,
          refund_approved: input.refund_approved,
          refund_amount: refundAmount ? Number(refundAmount) : undefined,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-cancellations"] });
      setCancelSel(null);
      setAdminNotes("");
      setRefundAmount("");
      toast.success("Cancellation updated");
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const pendingR = returns.filter((r: any) => r.status === "pending").length;
  const pendingC = cancellations.filter((r: any) => r.status === "pending").length;

  return (
    <div className="max-w-[1400px] mx-auto w-full space-y-6">
      <PageHeader
        icon={<RotateCcw className="w-5 h-5" />}
        title="Returns & Cancellations"
        description="Review, approve, and refund customer requests."
      />

      <TabsWithParam defaultTab="returns" basePath="/sales/returns">
        <TabsList className="hidden">
          <TabsTrigger value="returns">
            Returns <Badge variant="secondary" className="ml-2">{pendingR}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cancellations">
            Cancellations <Badge variant="secondary" className="ml-2">{pendingC}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="space-y-3 mt-4">
          {rLoading ? (
            <CardGridSkeleton count={4} cols={2} aspect="2/1" />
          ) : returns.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No return requests</p>
            </CardContent></Card>
          ) : returns.map((r: any) => (
            <Card key={r.id} className="cursor-pointer hover:border-primary/30" onClick={() => {
              setReturnSel(r); setAdminNotes(r.admin_notes || ""); setRefundAmount(String(r.refund_amount ?? "")); setReturnTracking(r.return_tracking || "");
            }}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Order #{r.orders?.order_number ?? r.order_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.reason}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(r.created_at), "MMM dd, yyyy")}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={statusColors[r.status] || ""}>{r.status}</Badge>
                  {r.refund_status && r.refund_status !== "not_required" && (
                    <Badge variant="outline" className="text-xs">refund: {r.refund_status}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="cancellations" className="space-y-3 mt-4">
          {cLoading ? (
            <CardGridSkeleton count={4} cols={2} aspect="2/1" />
          ) : cancellations.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <XCircle className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No cancellation requests</p>
            </CardContent></Card>
          ) : cancellations.map((r: any) => (
            <Card key={r.id} className="cursor-pointer hover:border-primary/30" onClick={() => {
              setCancelSel(r); setAdminNotes(r.admin_notes || ""); setRefundAmount(String(r.refund_amount ?? ""));
            }}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Order #{r.orders?.order_number ?? r.order_id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.reason}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(r.created_at), "MMM dd, yyyy")}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={statusColors[r.status] || ""}>{r.status}</Badge>
                  {r.refund_required && (
                    <Badge variant="outline" className="text-xs">refund: {r.refund_status}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </TabsWithParam>

      {returnSel && (
        <Card>
          <CardHeader><CardTitle>Return — Order #{returnSel.orders?.order_number}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Customer reason</p>
              <p className="text-sm">{returnSel.reason}</p>
            </div>
            {returnSel.images?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {returnSel.images.map((u: string) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    <img src={u} className="w-16 h-16 rounded object-cover border" alt="return proof" />
                  </a>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Refund amount</p>
                <Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Return tracking #</p>
                <Input value={returnTracking} onChange={(e) => setReturnTracking(e.target.value)} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Admin notes</p>
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => returnMutation.mutate({ id: returnSel.id, decision: "approve" })} disabled={returnMutation.isPending}>Approve</Button>
              <Button variant="outline" onClick={() => returnMutation.mutate({ id: returnSel.id, decision: "complete" })} disabled={returnMutation.isPending}>Mark Refunded</Button>
              <Button variant="destructive" onClick={() => returnMutation.mutate({ id: returnSel.id, decision: "reject" })} disabled={returnMutation.isPending}>Reject</Button>
              <Button variant="ghost" onClick={() => setReturnSel(null)}>Close</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {cancelSel && (
        <Card>
          <CardHeader><CardTitle>Cancellation — Order #{cancelSel.orders?.order_number}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Customer reason</p>
              <p className="text-sm">{cancelSel.reason}</p>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>Payment: {cancelSel.orders?.payment_method}</span>
              <span>Total: ৳{cancelSel.orders?.total}</span>
              <span>Refund required: {cancelSel.refund_required ? "Yes" : "No"}</span>
            </div>
            {cancelSel.refund_required && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Refund amount</p>
                <Input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Admin notes</p>
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => cancelMutation.mutate({ id: cancelSel.id, decision: "approve", refund_approved: false })} disabled={cancelMutation.isPending}>Approve Cancellation</Button>
              {cancelSel.refund_required && (
                <Button variant="outline" onClick={() => cancelMutation.mutate({ id: cancelSel.id, decision: "approve", refund_approved: true })} disabled={cancelMutation.isPending}>Approve + Refund</Button>
              )}
              <Button variant="destructive" onClick={() => cancelMutation.mutate({ id: cancelSel.id, decision: "reject" })} disabled={cancelMutation.isPending}>Reject</Button>
              <Button variant="ghost" onClick={() => setCancelSel(null)}>Close</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminReturns;
// code:4ce0
