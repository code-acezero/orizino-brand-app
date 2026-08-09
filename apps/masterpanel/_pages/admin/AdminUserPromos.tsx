"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/app-toast";
import { Gift, Plus, Trash2, Edit, Users, Eye, Percent, DollarSign } from "lucide-react";
import ColorPicker from "@/components/ui/color-picker";
import { format } from "date-fns";

const CONDITION_TYPES = [
  { value: "manual", label: "Manual (Select Users)", desc: "Manually assign to specific users" },
  { value: "first_time_buyer", label: "First-Time Buyer", desc: "Users who haven't placed an order yet" },
  { value: "order_count", label: "Order Count", desc: "Users with X+ orders" },
  { value: "total_spent", label: "Total Spent", desc: "Users who spent ৳X+ total" },
  { value: "review_count", label: "Review Count", desc: "Users with X+ approved reviews" },
  { value: "premium_buyer", label: "Premium Buyer", desc: "Top spenders (auto-detected)" },
  { value: "most_visited", label: "Most Visited", desc: "Frequent visitors (by page views)" },
];

interface PromoForm {
  title: string;
  description: string;
  coupon_code: string;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
  condition_type: string;
  condition_value: any;
  popup_title: string;
  popup_message: string;
  popup_image_url: string;
  popup_bg_color: string;
  popup_text_color: string;
  is_active: boolean;
  starts_at: string;
  expires_at: string;
  usage_limit: number | null;
  min_order_amount: number;
}

const emptyForm: PromoForm = {
  title: "",
  description: "",
  coupon_code: "",
  discount_type: "percentage",
  discount_value: 10,
  max_discount_amount: null,
  condition_type: "manual",
  condition_value: {},
  popup_title: "",
  popup_message: "",
  popup_image_url: "",
  popup_bg_color: "",
  popup_text_color: "",
  is_active: true,
  starts_at: "",
  expires_at: "",
  usage_limit: null,
  min_order_amount: 0,
};

const AdminUserPromos = () => {
  const qc = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoForm>(emptyForm);

  const { data: promos = [] } = useQuery({
    queryKey: ["admin-user-promos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_promos")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title,
        description: form.description,
        coupon_code: form.coupon_code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        max_discount_amount: form.max_discount_amount,
        condition_type: form.condition_type,
        condition_value: form.condition_value,
        popup_title: form.popup_title || form.title,
        popup_message: form.popup_message,
        popup_image_url: form.popup_image_url,
        popup_bg_color: form.popup_bg_color,
        popup_text_color: form.popup_text_color,
        is_active: form.is_active,
        starts_at: form.starts_at || null,
        expires_at: form.expires_at || null,
        usage_limit: form.usage_limit,
        min_order_amount: form.min_order_amount,
      };
      if (editId) {
        const { error } = await supabase.from("user_promos").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_promos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-promos"] });
      toast.success(editId ? "Promo updated" : "Promo created");
      setShowDialog(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_promos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-promos"] });
      toast.success("Promo deleted");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("user_promos").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-user-promos"] }),
  });

  const openEdit = (promo: any) => {
    setEditId(promo.id);
    setForm({
      title: promo.title,
      description: promo.description || "",
      coupon_code: promo.coupon_code,
      discount_type: promo.discount_type,
      discount_value: Number(promo.discount_value),
      max_discount_amount: promo.max_discount_amount ? Number(promo.max_discount_amount) : null,
      condition_type: promo.condition_type,
      condition_value: promo.condition_value || {},
      popup_title: promo.popup_title || "",
      popup_message: promo.popup_message || "",
      popup_image_url: promo.popup_image_url || "",
      popup_bg_color: promo.popup_bg_color || "",
      popup_text_color: promo.popup_text_color || "",
      is_active: promo.is_active,
      starts_at: promo.starts_at ? promo.starts_at.slice(0, 16) : "",
      expires_at: promo.expires_at ? promo.expires_at.slice(0, 16) : "",
      usage_limit: promo.usage_limit,
      min_order_amount: Number(promo.min_order_amount) || 0,
    });
    setShowDialog(true);
  };

  const condLabel = CONDITION_TYPES.find((c) => c.value === form.condition_type)?.label || form.condition_type;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">User Promos</h1>
        <Dialog open={showDialog} onOpenChange={(v) => { setShowDialog(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Create Promo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Edit" : "Create"} User Promo</DialogTitle></DialogHeader>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Basic Info */}
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Welcome Discount" />
              </div>
              <div className="space-y-2">
                <Label>Coupon Code *</Label>
                <Input value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })} placeholder="WELCOME10" className="uppercase font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value</Label>
                <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
              </div>
              {form.discount_type === "percentage" && (
                <div className="space-y-2">
                  <Label>Max Discount (৳)</Label>
                  <Input type="number" value={form.max_discount_amount ?? ""} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value ? Number(e.target.value) : null })} placeholder="No limit" />
                </div>
              )}
              <div className="space-y-2">
                <Label>Min Order Amount (৳)</Label>
                <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} />
              </div>

              {/* Condition */}
              <div className="space-y-2 md:col-span-2">
                <Label>Eligibility Condition</Label>
                <Select value={form.condition_type} onValueChange={(v) => setForm({ ...form, condition_type: v, condition_value: {} })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITION_TYPES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="font-medium">{c.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">— {c.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Condition-specific fields */}
              {form.condition_type === "order_count" && (
                <div className="space-y-2">
                  <Label>Minimum Orders</Label>
                  <Input type="number" value={form.condition_value?.min_orders || ""} onChange={(e) => setForm({ ...form, condition_value: { min_orders: Number(e.target.value) } })} placeholder="e.g. 5" />
                </div>
              )}
              {form.condition_type === "total_spent" && (
                <div className="space-y-2">
                  <Label>Minimum Total Spent (৳)</Label>
                  <Input type="number" value={form.condition_value?.min_total_spent || ""} onChange={(e) => setForm({ ...form, condition_value: { min_total_spent: Number(e.target.value) } })} placeholder="e.g. 5000" />
                </div>
              )}
              {form.condition_type === "review_count" && (
                <div className="space-y-2">
                  <Label>Minimum Reviews</Label>
                  <Input type="number" value={form.condition_value?.min_reviews || ""} onChange={(e) => setForm({ ...form, condition_value: { min_reviews: Number(e.target.value) } })} placeholder="e.g. 3" />
                </div>
              )}
              {form.condition_type === "most_visited" && (
                <div className="space-y-2">
                  <Label>Minimum Page Views</Label>
                  <Input type="number" value={form.condition_value?.min_views || ""} onChange={(e) => setForm({ ...form, condition_value: { min_views: Number(e.target.value) } })} placeholder="e.g. 50" />
                </div>
              )}
              {form.condition_type === "premium_buyer" && (
                <div className="space-y-2">
                  <Label>Top Spending Threshold (৳)</Label>
                  <Input type="number" value={form.condition_value?.min_total_spent || ""} onChange={(e) => setForm({ ...form, condition_value: { min_total_spent: Number(e.target.value) } })} placeholder="e.g. 10000" />
                </div>
              )}

              {/* Description */}
              <div className="space-y-2 md:col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Internal description..." rows={2} />
              </div>

              {/* Popup Customization */}
              <div className="md:col-span-2 border-t border-border pt-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Eye className="w-4 h-4" /> Popup Appearance</h3>
              </div>
              <div className="space-y-2">
                <Label>Popup Title</Label>
                <Input value={form.popup_title} onChange={(e) => setForm({ ...form, popup_title: e.target.value })} placeholder="🎉 Special Offer!" />
              </div>
              <div className="space-y-2">
                <Label>Popup Image URL</Label>
                <Input value={form.popup_image_url} onChange={(e) => setForm({ ...form, popup_image_url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Popup Message</Label>
                <Textarea value={form.popup_message} onChange={(e) => setForm({ ...form, popup_message: e.target.value })} placeholder="You've unlocked an exclusive discount! Use code..." rows={2} />
              </div>
              <div className="space-y-2">
                <ColorPicker label="Background Color" value={form.popup_bg_color} onChange={(c) => setForm({ ...form, popup_bg_color: c })} />
              </div>
              <div className="space-y-2">
                <ColorPicker label="Text Color" value={form.popup_text_color} onChange={(c) => setForm({ ...form, popup_text_color: c })} />
              </div>

              {/* Timing */}
              <div className="md:col-span-2 border-t border-border pt-4">
                <h3 className="text-sm font-semibold mb-3">Schedule</h3>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input type="number" value={form.usage_limit ?? ""} onChange={(e) => setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" />
              </div>

              <div className="md:col-span-2 flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.title || !form.coupon_code || saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editId ? "Update Promo" : "Create Promo"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Promo List */}
      <div className="grid gap-4">
        {promos.map((promo: any) => {
          const cond = CONDITION_TYPES.find((c) => c.value === promo.condition_type);
          const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
          return (
            <Card key={promo.id} className={`${!promo.is_active || isExpired ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-foreground">{promo.title}</p>
                        <Badge variant="outline" className="font-mono text-xs">{promo.coupon_code}</Badge>
                        <Badge variant={promo.discount_type === "percentage" ? "default" : "secondary"} className="text-xs">
                          {promo.discount_type === "percentage" ? <Percent className="w-3 h-3 mr-0.5" /> : <DollarSign className="w-3 h-3 mr-0.5" />}
                          {promo.discount_value}{promo.discount_type === "percentage" ? "%" : "৳"} off
                        </Badge>
                        {isExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {cond?.label || promo.condition_type}</span>
                        {promo.expires_at && <span>Ends {format(new Date(promo.expires_at), "MMM d, yyyy")}</span>}
                        <span>Used: {promo.used_count || 0}{promo.usage_limit ? `/${promo.usage_limit}` : ""}</span>
                      </div>
                      {promo.description && <p className="text-xs text-muted-foreground mt-1">{promo.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={promo.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: promo.id, active: v })} />
                    <button onClick={() => openEdit(promo)} className="p-1.5 rounded hover:bg-secondary"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm("Delete this promo?")) deleteMutation.mutate(promo.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {promos.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No user promos yet</p>
          <p className="text-xs mt-1">Create targeted promos for first-time buyers, loyal customers, and more</p>
        </div>
      )}
    </div>
  );
};

export default AdminUserPromos;
// code:4ce0
