"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit3, Tag, Percent, DollarSign, Calendar, Hash, Users, Package, FolderTree, Ticket } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { TableLoadingRow, TableEmptyRow } from "@/components/admin/TableStates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import MobileListCard from "@/components/admin/MobileListCard";

const emptyCoupon = {
  code: "", description: "", discount_type: "percentage", discount_value: 0,
  min_order_amount: 0, max_discount_amount: null as number | null,
  usage_limit: null as number | null, is_active: true, expires_at: "", starts_at: "",
  first_order_only: false, per_user_limit: null as number | null,
  min_items: null as number | null,
  target_categories: [] as string[], target_products: [] as string[],
};

const AdminCoupons: React.FC = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyCoupon);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-categories-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, slug").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name, slug").eq("is_active", true).order("name").limit(200);
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        code: form.code.toUpperCase().trim(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        min_order_amount: form.min_order_amount || 0,
        max_discount_amount: form.max_discount_amount || null,
        usage_limit: form.usage_limit || null,
        is_active: form.is_active,
        expires_at: form.expires_at || null,
        starts_at: form.starts_at || null,
        first_order_only: form.first_order_only,
        per_user_limit: form.per_user_limit || null,
        min_items: form.min_items || null,
        target_categories: form.target_categories.length > 0 ? form.target_categories : [],
        target_products: form.target_products.length > 0 ? form.target_products : [],
      };
      if (editing) await supabase.from("coupons").update(payload).eq("id", editing.id);
      else await supabase.from("coupons").insert(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setDialogOpen(false);
      toast({ title: editing ? "Coupon updated" : "Coupon created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await supabase.from("coupons").delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }); toast({ title: "Coupon deleted" }); },
  });

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
  };

  const openAdd = () => { setEditing(null); setForm(emptyCoupon); setDialogOpen(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    setForm({
      code: c.code, description: c.description || "", discount_type: c.discount_type,
      discount_value: Number(c.discount_value), min_order_amount: Number(c.min_order_amount) || 0,
      max_discount_amount: c.max_discount_amount ? Number(c.max_discount_amount) : null,
      usage_limit: c.usage_limit, is_active: c.is_active,
      expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : "",
      starts_at: c.starts_at ? new Date(c.starts_at).toISOString().slice(0, 16) : "",
      first_order_only: c.first_order_only || false,
      per_user_limit: c.per_user_limit || null,
      min_items: c.min_items || null,
      target_categories: c.target_categories || [],
      target_products: c.target_products || [],
    });
    setDialogOpen(true);
  };

  const toggleCategory = (catId: string) => {
    setForm(f => ({
      ...f,
      target_categories: f.target_categories.includes(catId)
        ? f.target_categories.filter(c => c !== catId)
        : [...f.target_categories, catId]
    }));
  };

  const toggleProduct = (prodId: string) => {
    setForm(f => ({
      ...f,
      target_products: f.target_products.includes(prodId)
        ? f.target_products.filter(p => p !== prodId)
        : [...f.target_products, prodId]
    }));
  };

  const getTargetSummary = (c: any) => {
    const parts: string[] = [];
    if (c.first_order_only) parts.push("1st order");
    if (c.per_user_limit) parts.push(`${c.per_user_limit}/user`);
    if (c.min_items) parts.push(`min ${c.min_items} items`);
    if (c.target_categories?.length > 0) parts.push(`${c.target_categories.length} cat${c.target_categories.length > 1 ? 's' : ''}`);
    if (c.target_products?.length > 0) parts.push(`${c.target_products.length} prod${c.target_products.length > 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        icon={<Ticket className="w-5 h-5" />}
        title="Coupons & Promotions"
        description={`${coupons?.length || 0} coupons configured`}
        actions={<Button onClick={openAdd} className="gap-1.5"><Plus className="w-4 h-4" /> Add Coupon</Button>}
      />

      {/* Desktop table */}
      <div className="hidden md:block border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Targeting</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableLoadingRow cols={7} rows={6} />}
            {!isLoading && (coupons?.length ?? 0) === 0 && (
              <TableEmptyRow
                cols={7}
                icon={<Ticket className="w-5 h-5" />}
                message="No coupons yet"
                hint="Create your first coupon to offer discounts at checkout."
              />
            )}
            {coupons?.map((c) => {
              const targeting = getTargetSummary(c);
              return (
                <TableRow key={c.id}>
                  <TableCell><Badge variant="outline" className="font-mono">{c.code}</Badge></TableCell>
                  <TableCell>
                    {c.discount_type === "percentage" ? `${c.discount_value}%` : `৳${Number(c.discount_value).toFixed(0)}`}
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                  </TableCell>
                  <TableCell>
                    {targeting ? <span className="text-xs text-muted-foreground">{targeting}</span> : <span className="text-xs text-muted-foreground/50">All</span>}
                  </TableCell>
                  <TableCell className="text-sm">{c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""}</TableCell>
                  <TableCell>
                    <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Edit3 className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {isLoading && (
          <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Loading coupons…</div>
        )}
        {!isLoading && (coupons?.length ?? 0) === 0 && (
          <div className="rounded-xl border bg-card p-6 text-center">
            <Ticket className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No coupons yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first coupon to offer discounts at checkout.</p>
          </div>
        )}
        {coupons?.map((c) => {
          const targeting = getTargetSummary(c);
          return (
            <MobileListCard
              key={c.id}
              title={
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">{c.code}</Badge>
                  <span className="text-sm font-semibold">
                    {c.discount_type === "percentage" ? `${c.discount_value}%` : `৳${Number(c.discount_value).toFixed(0)}`}
                  </span>
                </span>
              }
              subtitle={c.description || undefined}
              trailing={<Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />}
              meta={
                <>
                  <span>Used: <span className="font-medium text-foreground">{c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""}</span></span>
                  <span>Expires: {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</span>
                  {targeting && <span className="truncate">{targeting}</span>}
                </>
              }
              actions={
                <>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => openEdit(c)}>
                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => deleteMutation.mutate(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              }
            />
          );
        })}
      </div>


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Coupon" : "New Coupon"}</DialogTitle></DialogHeader>
          <div className="space-y-6 mt-2">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Code</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SAVE20" className="font-mono uppercase" />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="20% off summer sale" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Discount Value</Label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Min Order Amount</Label>
                  <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Max Discount (optional)</Label>
                  <Input type="number" value={form.max_discount_amount ?? ""} onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value ? Number(e.target.value) : null })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Usage Limit (total)</Label>
                  <Input type="number" value={form.usage_limit ?? ""} onChange={(e) => setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Per-User Limit</Label>
                  <Input type="number" value={form.per_user_limit ?? ""} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" />
                  <p className="text-[10px] text-muted-foreground">Max uses per customer</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Min Items in Cart</Label>
                  <Input type="number" value={form.min_items ?? ""} onChange={(e) => setForm({ ...form, min_items: e.target.value ? Number(e.target.value) : null })} placeholder="No minimum" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.first_order_only} onCheckedChange={(v) => setForm({ ...form, first_order_only: v })} />
                <Label>First Order Only</Label>
                <span className="text-xs text-muted-foreground ml-1">Only for customers with no previous orders</span>
              </div>

              {/* Category targeting */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><FolderTree className="w-3.5 h-3.5" /> Target Categories</Label>
                <p className="text-[10px] text-muted-foreground">Leave empty to apply to all categories</p>
                <div className="max-h-32 overflow-y-auto rounded-xl border border-border p-2 space-y-1">
                  {categories?.map(cat => (
                    <button key={cat.id} type="button" onClick={() => toggleCategory(cat.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${form.target_categories.includes(cat.id) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50"}`}>
                      {cat.name}
                    </button>
                  ))}
                </div>
                {form.target_categories.length > 0 && (
                  <p className="text-[10px] text-primary">{form.target_categories.length} categor{form.target_categories.length === 1 ? 'y' : 'ies'} selected</p>
                )}
              </div>

              {/* Product targeting */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> Target Products</Label>
                <p className="text-[10px] text-muted-foreground">Leave empty to apply to all products</p>
                <div className="max-h-32 overflow-y-auto rounded-xl border border-border p-2 space-y-1">
                  {products?.map(prod => (
                    <button key={prod.id} type="button" onClick={() => toggleProduct(prod.id)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${form.target_products.includes(prod.id) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/50"}`}>
                      {prod.name}
                    </button>
                  ))}
                </div>
                {form.target_products.length > 0 && (
                  <p className="text-[10px] text-primary">{form.target_products.length} product{form.target_products.length === 1 ? '' : 's'} selected</p>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="space-y-1.5">
                <Label>Starts At (optional)</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Expires At (optional)</Label>
                <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!form.code || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
// code:4ce0
