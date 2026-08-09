"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Plus, Edit3, Trash2, CheckCircle2, Home, Building2, MapPinned, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUserAddresses, useSaveAddress, useDeleteAddress, type UserAddress } from "@/hooks/use-user-addresses";
import { toast } from "@/lib/app-toast";

const typeIcons: Record<string, any> = { home: Home, office: Building2, other: MapPinned };

const empty: Partial<UserAddress> = {
  label: "",
  address_type: "home",
  full_name: "",
  phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  area: "",
  postal_code: "",
  country: "Bangladesh",
  is_default: false,
};

const AddressBookTab: React.FC = () => {
  const { data: addresses = [], isLoading } = useUserAddresses();
  const saveMutation = useSaveAddress();
  const deleteMutation = useDeleteAddress();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserAddress | null>(null);
  const [form, setForm] = useState<Partial<UserAddress>>(empty);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (a: UserAddress) => {
    setEditing(a);
    setForm(a);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.phone || !form.address_line1 || !form.city) {
      toast({ title: "Please fill name, phone, address and city", variant: "destructive" });
      return;
    }
    try {
      await saveMutation.mutateAsync({ ...form, id: editing?.id });
      toast({ title: editing ? "Address updated" : "Address added" });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Address removed" });
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const handleSetDefault = async (a: UserAddress) => {
    try {
      await saveMutation.mutateAsync({ ...a, is_default: true });
      toast({ title: "Default address updated" });
    } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-display text-foreground">My Addresses</h2>
        <Button size="sm" onClick={openAdd} className="rounded-md gap-1.5">
          <Plus className="w-4 h-4" /> Add Address
        </Button>
      </div>

      {isLoading && (
        <div className="rounded-md border border-border/40 bg-card/60 p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && addresses.length === 0 && (
        <div className="rounded-md border border-border/40 bg-card/60 p-10 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-3">No addresses saved yet</p>
          <Button onClick={openAdd} variant="outline" className="rounded-md gap-1.5">
            <Plus className="w-4 h-4" /> Add Your First Address
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {addresses.map((a) => {
          const TypeIcon = typeIcons[a.address_type] || MapPinned;
          return (
            <div
              key={a.id}
              className={`rounded-md border bg-card/60 p-5 relative transition-all ${
                a.is_default ? "border-primary/50" : "border-border/40 hover:border-primary/30"
              }`}
            >
              {a.is_default && <Badge className="absolute top-3 right-3 text-[10px]">Default</Badge>}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                  <TypeIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {a.label || a.address_type.charAt(0).toUpperCase() + a.address_type.slice(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.full_name}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {a.address_line1}
                {a.address_line2 ? `, ${a.address_line2}` : ""}, {a.city}
                {a.area ? `, ${a.area}` : ""} {a.postal_code || ""}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.country}</p>
              {a.phone && <p className="text-xs text-muted-foreground mt-1">📞 {a.phone}</p>}
              <div className="flex gap-2 mt-4 pt-3 border-t border-border flex-wrap">
                <Button size="sm" variant="ghost" onClick={() => openEdit(a)} className="rounded-lg text-xs h-8 gap-1">
                  <Edit3 className="w-3 h-3" /> Edit
                </Button>
                {!a.is_default && (
                  <Button size="sm" variant="ghost" onClick={() => handleSetDefault(a)} className="rounded-lg text-xs h-8 gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Set Default
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(a.id)}
                  className="rounded-lg text-xs h-8 gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Address" : "Add New Address"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input
                  value={form.label || ""}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. My Home"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.address_type || "home"}
                  onValueChange={(v) => setForm({ ...form, address_type: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">🏠 Home</SelectItem>
                    <SelectItem value="office">🏢 Office</SelectItem>
                    <SelectItem value="other">📍 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Recipient Name *</Label>
                <Input
                  value={form.full_name || ""}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Full name"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Street Address *</Label>
              <Input
                value={form.address_line1 || ""}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
                placeholder="House #, Road #, Block"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Apartment / Floor (optional)</Label>
              <Input
                value={form.address_line2 || ""}
                onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
                placeholder="Apt 4B, 3rd floor"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input
                  value={form.city || ""}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Dhaka"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Area / Zone</Label>
                <Input
                  value={form.area || ""}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="Gulshan, Dhanmondi…"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Postal Code</Label>
                <Input
                  value={form.postal_code || ""}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                  placeholder="1212"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input
                  value={form.country || "Bangladesh"}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-secondary/30 p-3">
              <Label htmlFor="default-addr" className="text-sm">
                Set as default address
              </Label>
              <Switch
                id="default-addr"
                checked={!!form.is_default}
                onCheckedChange={(v) => setForm({ ...form, is_default: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="rounded-xl">
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editing ? (
                "Save Changes"
              ) : (
                "Add Address"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AddressBookTab;
// code:4ce0
