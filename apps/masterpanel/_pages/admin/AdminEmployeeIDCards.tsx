"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import QRCode from "qrcode";
import JSZip from "jszip";
import { IdCard, Download, RefreshCw, Eye, Printer, Search, CheckSquare, Square, Loader2, Tag, Plus, Trash2, Pencil, UserCircle2 } from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { adminListIdentities, adminRegenerateEmployeeCode } from "@/lib/employee-identity.functions";
import { listDesignations, createDesignation, updateDesignation, deleteDesignation, assignDesignation } from "@/lib/designations.functions";
import { toast } from "@/lib/app-toast";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import PageHeader from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCompanyOrigin, buildIdentityUrl } from "@/lib/company-domain";

interface Designation {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface IdentityRow {
  id: string;
  user_id: string;
  employee_code: string;
  slug: string;
  display_name: string | null;
  title: string | null;
  department: string | null;
  avatar_url: string | null;
  is_public: boolean;
  view_count: number;
  designation_id: string | null;
  designations: { title: string } | null;
}

function useIdentityUrlBuilder() {
  const origin = useCompanyOrigin();
  return (slug: string, source?: "qr" | "nfc" | "share") => buildIdentityUrl(origin, slug, source);
}


const AdminEmployeeIDCards: React.FC = () => {
  useSeoMeta("Employee ID Cards", "Bulk generate QR codes and printable ID cards");
  const list = useServerFn(adminListIdentities);
  const regen = useServerFn(adminRegenerateEmployeeCode);
  const fetchDesignations = useServerFn(listDesignations);
  const createDesignationFn = useServerFn(createDesignation);
  const updateDesignationFn = useServerFn(updateDesignation);
  const deleteDesignationFn = useServerFn(deleteDesignation);
  const assignDesignationFn = useServerFn(assignDesignation);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState<Designation | null>(null);
  const [savingDesignation, setSavingDesignation] = useState(false);

  const { data = [], isLoading } = useQuery<IdentityRow[]>({
    queryKey: ["admin-identities"],
    queryFn: () => list() as any,
  });

  const { data: designations = [] } = useQuery<Designation[]>({
    queryKey: ["designations"],
    queryFn: () => fetchDesignations() as any,
  });

  const handleAssignDesignation = async (userId: string, designationId: string) => {
    try {
      await assignDesignationFn({ data: { userId, designationId: designationId || null } });
      qc.invalidateQueries({ queryKey: ["admin-identities"] });
      toast.success("Designation updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update designation");
    }
  };

  const handleSaveDesignation = async () => {
    const title = (editing ? editing.title : newTitle).trim();
    if (title.length < 2) { toast.error("Enter a title (min 2 characters)"); return; }
    setSavingDesignation(true);
    try {
      if (editing) {
        await updateDesignationFn({ data: { id: editing.id, title, description: editing.description, sortOrder: editing.sort_order } });
      } else {
        await createDesignationFn({ data: { title, sortOrder: designations.length } });
        setNewTitle("");
      }
      qc.invalidateQueries({ queryKey: ["designations"] });
      setEditing(null);
      toast.success(editing ? "Designation updated" : "Designation created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save designation");
    } finally {
      setSavingDesignation(false);
    }
  };

  const handleDeleteDesignation = async (id: string) => {
    if (!confirm("Delete this designation? Staff currently assigned to it will show no designation.")) return;
    try {
      await deleteDesignationFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["designations"] });
      qc.invalidateQueries({ queryKey: ["admin-identities"] });
      toast.success("Designation deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete designation");
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((r) =>
      [r.employee_code, r.display_name, r.title, r.department, r.slug]
        .filter(Boolean).some((v) => (v as string).toLowerCase().includes(term)),
    );
  }, [data, q]);

  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const toggleAll = () => {
    const all = filtered.every((r) => selected[r.id]);
    const next: Record<string, boolean> = { ...selected };
    filtered.forEach((r) => { next[r.id] = !all; });
    setSelected(next);
  };
  const selectedRows = filtered.filter((r) => selected[r.id]);

  const buildUrl = useIdentityUrlBuilder();

  const downloadZip = async () => {
    if (!selectedRows.length) { toast.error("Select at least one"); return; }
    setBusy(true);
    try {
      const zip = new JSZip();
      for (const r of selectedRows) {
        const url = buildUrl(r.slug, "qr");
        const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 512 });
        const png = await QRCode.toDataURL(url, { width: 1024, margin: 1 });
        zip.file(`${r.employee_code}.svg`, svg);
        zip.file(`${r.employee_code}.png`, png.split(",")[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `orizino-qr-pack-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`Exported ${selectedRows.length} QR codes`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const openPrintSheet = async () => {
    if (!selectedRows.length) { toast.error("Select at least one"); return; }
    setBusy(true);
    try {
      const items = await Promise.all(selectedRows.map(async (r) => ({
        row: r,
        url: buildUrl(r.slug, "qr"),
        qr: await QRCode.toDataURL(buildUrl(r.slug, "qr"), { width: 300, margin: 1 }),
      })));
      const html = `<!doctype html><html><head><title>Employee ID Cards</title>
      <style>
        @page{size:A4;margin:12mm}
        body{font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;margin:0;padding:0;color:#0a0a0a}
        .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm}
        .card{border:1px solid #d4d4d8;border-radius:12px;padding:10px;display:flex;flex-direction:column;align-items:center;text-align:center;page-break-inside:avoid}
        .code{font-size:10px;letter-spacing:.1em;color:#71717a;text-transform:uppercase;margin-top:6px}
        .name{font-weight:700;font-size:13px;margin-top:2px}
        .title{font-size:10px;color:#52525b}
        img{width:100%;max-width:180px}
        .brand{margin-top:6px;font-size:9px;color:#71717a}
      </style></head><body>
      <div class="grid">
        ${items.map((i) => `
          <div class="card">
            <img src="${i.qr}" alt="QR"/>
            <div class="code">${i.row.employee_code}</div>
            <div class="name">${i.row.display_name ?? ""}</div>
            <div class="title">${[i.row.title, i.row.department].filter(Boolean).join(" · ")}</div>
            <div class="brand">orizino.com</div>
          </div>`).join("")}
      </div>
      <script>window.onload=()=>window.print();</script>
      </body></html>`;
      const w = window.open("", "_blank");
      if (!w) throw new Error("Popup blocked");
      w.document.write(html);
      w.document.close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Print failed");
    } finally {
      setBusy(false);
    }
  };

  const doRegen = async (userId: string) => {
    try {
      await regen({ data: { user_id: userId } });
      toast.success("Code regenerated");
      qc.invalidateQueries({ queryKey: ["admin-identities"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-6xl">
      <PageHeader
        title="Employee ID Cards"
        description="Generate QR codes and printable cards for staff."
        icon={<IdCard className="w-5 h-5" />}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
              <Tag className="w-4 h-4 mr-1.5" /> Manage designations
            </Button>
            <Button size="sm" variant="outline" onClick={downloadZip} disabled={busy || !selectedRows.length}>
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
              Download QR pack ({selectedRows.length})
            </Button>
            <Button size="sm" onClick={openPrintSheet} disabled={busy || !selectedRows.length}>
              <Printer className="w-4 h-4 mr-1.5" /> Print sheet
            </Button>
          </>
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search employees…" className="pl-9" />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3 w-10">
                <button onClick={toggleAll} className="cursor-pointer">
                  {filtered.length > 0 && filtered.every((r) => selected[r.id]) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
              </th>
              <th className="p-3 text-left">Employee</th>
              <th className="p-3 text-left hidden sm:table-cell">Code</th>
              <th className="p-3 text-left hidden md:table-cell">Designation</th>
              <th className="p-3 text-left hidden md:table-cell">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No employees found</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t border-border/60 hover:bg-muted/20">
                <td className="p-3">
                  <button onClick={() => toggle(r.id)} className="cursor-pointer">
                    {selected[r.id] ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                        {(r.display_name || "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.display_name || "—"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">/id/{r.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden sm:table-cell font-mono text-xs">{r.employee_code}</td>
                <td className="p-3 hidden md:table-cell">
                  <select
                    value={r.designation_id ?? ""}
                    onChange={(e) => handleAssignDesignation(r.user_id, e.target.value)}
                    className="text-xs bg-transparent border border-border/60 rounded-md px-2 py-1.5 max-w-[160px]"
                  >
                    <option value="">No designation</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                  {r.department && <div className="text-[11px] text-muted-foreground mt-1">{r.department}</div>}
                </td>
                <td className="p-3 hidden md:table-cell">
                  {r.is_public
                    ? <Badge variant="default" className="bg-green-500/15 text-green-600 hover:bg-green-500/20">Published</Badge>
                    : <Badge variant="secondary">Draft</Badge>}
                </td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/admin/profile?userId=${r.user_id}`)} title="Edit Full User Profile Mode">
                      <UserCircle2 className="w-4 h-4 text-primary" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => window.open(`${buildUrl(r.slug)}?preview=1`, "_blank")} title="Preview">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => doRegen(r.user_id)} title="Regenerate code">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={manageOpen} onOpenChange={(open) => { setManageOpen(open); if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage designations</DialogTitle>
            <DialogDescription>
              Create the job titles staff can be assigned. Once applied, a designation shows as that
              person's title everywhere, including their public employee ID.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              value={editing ? editing.title : newTitle}
              onChange={(e) => editing ? setEditing({ ...editing, title: e.target.value }) : setNewTitle(e.target.value)}
              placeholder="e.g. Senior Designer"
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveDesignation(); }}
            />
            <Button onClick={handleSaveDesignation} disabled={savingDesignation}>
              {savingDesignation ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save" : <Plus className="w-4 h-4" />}
            </Button>
            {editing && (
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-border/60 rounded-md border border-border/60">
            {designations.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No designations yet.</p>
            ) : designations.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{d.title}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(d)} title="Rename">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDeleteDesignation(d.id)} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmployeeIDCards;
