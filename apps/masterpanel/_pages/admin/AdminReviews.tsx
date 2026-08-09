"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FilterChips from "@/components/admin/FilterChips";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Trash2, Star, Image as ImageIcon, CheckCheck, XCircle, MessageSquare } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { TableLoadingRow, TableEmptyRow } from "@/components/admin/TableStates";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/lib/app-toast";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const AdminReviews = () => {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*, products(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleApproval = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from("reviews").update({ is_approved: approved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast.success("Updated"); },
    onError: (e) => toast.error(e.message),
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast.success("Deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const bulkAction = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "approve" | "reject" | "delete" }) => {
      if (action === "delete") {
        const { error } = await supabase.from("reviews").delete().in("id", ids);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reviews").update({ is_approved: action === "approve" }).in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: (_, { ids, action }) => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      setSelected(new Set());
      toast.success(`${ids.length} review${ids.length > 1 ? "s" : ""} ${action === "delete" ? "deleted" : action === "approve" ? "approved" : "rejected"}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const statusCounts = {
    approved: reviews.filter((r: any) => r.is_approved).length,
    pending: reviews.filter((r: any) => !r.is_approved).length,
  };

  const withImages = reviews.filter((r: any) => r.images && r.images.length > 0).length;

  const filtered = filterStatus === "all"
    ? reviews
    : filterStatus === "approved"
      ? reviews.filter((r: any) => r.is_approved)
      : filterStatus === "pending"
        ? reviews.filter((r: any) => !r.is_approved)
        : reviews.filter((r: any) => r.images && r.images.length > 0);

  const filterOptions = [
    { value: "all", label: "All", count: reviews.length },
    { value: "pending", label: "Pending", count: statusCounts.pending },
    { value: "approved", label: "Approved", count: statusCounts.approved },
    { value: "with-images", label: "With Images", count: withImages },
  ];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r: any) => r.id)));
    }
  };

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0;

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        icon={<MessageSquare className="w-5 h-5" />}
        title="Reviews"
        description="Moderate ratings, comments and customer photos."
      />

      <FilterChips options={filterOptions} value={filterStatus} onChange={(v) => { setFilterStatus(v); setSelected(new Set()); }} />

      {/* Bulk action bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 glass rounded-2xl px-4 py-3"
          >
            <span className="text-sm text-foreground font-medium">
              {selected.size} selected
            </span>
            <div className="flex gap-2 ml-auto">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={bulkAction.isPending}
                  >
                    <CheckCheck className="w-4 h-4 text-primary" />
                    Approve
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve reviews?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will approve {selected.size} review{selected.size > 1 ? "s" : ""} and make them visible to customers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "approve" })}>
                      Approve
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={bulkAction.isPending}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject reviews?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reject {selected.size} review{selected.size > 1 ? "s" : ""} and keep them hidden from customers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "reject" })}>
                      Reject
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    disabled={bulkAction.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete reviews?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {selected.size} review{selected.size > 1 ? "s" : ""}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "delete" })}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Images</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableLoadingRow cols={8} rows={6} />
            ) : filtered.length === 0 ? (
              <TableEmptyRow
                cols={8}
                icon={<MessageSquare className="w-5 h-5" />}
                message="No reviews found"
                hint={filterStatus === "all" ? "Customer reviews will appear here after checkout." : `No reviews match the "${filterStatus}" filter.`}
              />
            ) : filtered.map((r: any) => (
              <TableRow key={r.id} className={selected.has(r.id) ? "bg-primary/5" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggleSelect(r.id)}
                    aria-label={`Select review`}
                  />
                </TableCell>
                <TableCell className="font-medium">{r.products?.name ?? "—"}</TableCell>
                <TableCell><div className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" />{r.rating}</div></TableCell>
                <TableCell className="max-w-xs truncate">{r.comment || r.title || "—"}</TableCell>
                <TableCell>
                  {r.images && r.images.length > 0 ? (
                    <div className="flex gap-1">
                      {r.images.slice(0, 3).map((img: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setLightboxImg(img)}
                          className="w-10 h-10 rounded-lg overflow-hidden hover:ring-2 ring-primary/40 transition-all shrink-0"
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                      {r.images.length > 3 && (
                        <span className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                          +{r.images.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground/40"><ImageIcon className="w-4 h-4" /></span>
                  )}
                </TableCell>
                <TableCell><Badge variant={r.is_approved ? "default" : "secondary"}>{r.is_approved ? "Approved" : "Pending"}</Badge></TableCell>
                <TableCell>{format(new Date(r.created_at), "MMM d")}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => toggleApproval.mutate({ id: r.id, approved: !r.is_approved })}>
                    {r.is_approved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4 text-primary" />}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete review?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete this review. This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteReview.mutate(r.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-xl flex items-center justify-center"
            onClick={() => setLightboxImg(null)}
          >
            <button className="absolute top-6 right-6 glass rounded-full p-3 text-foreground hover:text-primary z-10" onClick={() => setLightboxImg(null)}>
              <X className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={lightboxImg}
              alt="Review photo"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminReviews;
// code:4ce0
