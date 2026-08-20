"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useServerFn } from "@/lib/server-fn-compat";
import QRCode from "qrcode";
import {
  listStaff,
  grantStaffRole,
  revokeStaffRole,
  setStaffSections,
  assignStaffDesignation,
  updateStaffProfile,
  setStaffStatus,
  submitStaffChangeRequest,
  listStaffChangeRequests,
  reviewStaffChangeRequest,
  getMyPendingChangeRequest,
  StaffMemberDetail,
} from "@/lib/staff.functions";
import { ROLE_LABELS, ROLE_COLORS, STAFF_ROLES, type StaffRole } from "@/lib/staff.constants";
import { listTeamsDetailed } from "@/lib/teams.functions";
import { listDesignations } from "@/lib/designations.functions";
import { useCompanyOrigin, buildIdentityUrl } from "@/lib/company-domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/lib/app-toast";
import { useNavigate } from "@/lib/router-compat";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, RefreshCw, Trash2, ShieldCheck, Users,
  ChevronRight, UserPlus, Settings2, Check, Loader2,
  Briefcase, BookOpen, Palette, BarChart3, Search, Bot,
  ShoppingCart, Package, Globe, Megaphone, UserCircle2,
  Building2, KeyRound, Download, Copy, CheckCircle2,
  X, Filter, Eye, Layers, Shield, Sparkles, LayoutGrid, List,
  IdCard, ExternalLink, Share2, QrCode, Image as ImageIcon,
  CheckCircle, Lock, EyeOff, Upload, Phone, Mail, FileText,
  Ban, Flame, UserCheck, AlertTriangle, MessageSquare, Clock,
  ArrowRight, ShieldAlert, CheckCheck, XCircle, Unlock
} from "lucide-react";

/* ── Section icons ── */
const SECTION_ICONS: Record<string, React.ReactNode> = {
  products: <Package className="w-4 h-4" />,
  orders: <ShoppingCart className="w-4 h-4" />,
  offline_orders: <ShoppingCart className="w-4 h-4" />,
  customers: <Users className="w-4 h-4" />,
  affiliate: <Briefcase className="w-4 h-4" />,
  seo: <Search className="w-4 h-4" />,
  storefront_ui: <Palette className="w-4 h-4" />,
  portfolio: <Globe className="w-4 h-4" />,
  ai: <Bot className="w-4 h-4" />,
  analytics: <BarChart3 className="w-4 h-4" />,
  employees: <Users className="w-4 h-4" />,
  settings: <Settings2 className="w-4 h-4" />,
};

interface StaffSection {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
}

interface Preset {
  id: string;
  name: string;
  description: string | null;
  sections: string[];
  is_system: boolean;
}

/* ────────────────────────────────────────────────────────────── */
/* Reusable Staff Avatar Component with Reliable Image Loading     */
/* ────────────────────────────────────────────────────────────── */
export function StaffAvatar({
  url,
  name,
  className = "w-9 h-9 text-sm",
}: {
  url?: string | null;
  name?: string | null;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const initial = (name || "S").charAt(0).toUpperCase();

  useEffect(() => {
    setHasError(false);
  }, [url]);

  if (url && !hasError) {
    return (
      <div className={`rounded-full overflow-hidden shrink-0 border border-border/60 bg-muted relative ${className}`}>
        <img
          src={url}
          alt={name || "Staff avatar"}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center font-bold text-primary-foreground shrink-0 shadow-sm ${className}`}
    >
      {initial}
    </div>
  );
}

/* Helper to build vCard string */
function toVCard(member: StaffMemberDetail, publicUrl: string): string {
  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${member.full_name || "Staff Member"}`,
    `N:${member.full_name || "Staff"};;;;`,
  ];
  if (member.title || member.designation_title) lines.push(`TITLE:${member.title || member.designation_title}`);
  if (member.department) lines.push(`ORG:Orizino;${member.department}`);
  else lines.push("ORG:Orizino");
  if (member.email) lines.push(`EMAIL;TYPE=INTERNET,WORK:${member.email}`);
  if (member.phone) lines.push(`TEL;TYPE=CELL,WORK:${member.phone}`);
  if (publicUrl) lines.push(`URL:${publicUrl}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/* ────────────────────────────────────────────────────────────── */
/* Granular Access, Profile & Public ID Editor Dialog             */
/* ────────────────────────────────────────────────────────────── */
function StaffAccessDialog({
  member,
  sections,
  presets,
  designations,
  teams,
  isMasterAdmin,
  isHRLead,
  isHRStaff,
  currentUserId,
  initialTab = "profile",
  open,
  onClose,
}: {
  member: StaffMemberDetail;
  sections: StaffSection[];
  presets: Preset[];
  designations: { id: string; title: string }[];
  teams: any[];
  isMasterAdmin: boolean;
  isHRLead: boolean;
  isHRStaff: boolean;
  currentUserId?: string;
  initialTab?: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const origin = useCompanyOrigin();
  const updateSections = useServerFn(setStaffSections);
  const setDesignation = useServerFn(assignStaffDesignation);
  const grantRole = useServerFn(grantStaffRole);
  const revokeRole = useServerFn(revokeStaffRole);
  const saveProfileFn = useServerFn(updateStaffProfile);
  const updateStatusFn = useServerFn(setStaffStatus);
  const fetchDraftFn = useServerFn(getMyPendingChangeRequest);

  const isSelf = currentUserId === member.user_id;
  const isFired = member.status === "fired";
  const isSuspended = member.status === "suspended";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedDesignation, setSelectedDesignation] = useState(member.designation_id || "none");
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<StaffRole>("moderator");

  // Profile Edit State
  const [fullName, setFullName] = useState(member.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(member.avatar_url || "");
  const [employeeCode, setEmployeeCode] = useState(member.employee_code || "");
  const [slug, setSlug] = useState(member.slug || member.user_id.slice(0, 8));
  const [department, setDepartment] = useState(member.department || "");
  const [title, setTitle] = useState(member.title || member.designation_title || "");
  const [phone, setPhone] = useState(member.phone || "");
  const [bio, setBio] = useState(member.bio || "");
  const [requestNote, setRequestNote] = useState("");

  // Public View Controls
  const [isPublic, setIsPublic] = useState(member.is_public ?? true);
  const [showEmail, setShowEmail] = useState(member.show_email ?? true);
  const [showPhone, setShowPhone] = useState(member.show_phone ?? true);
  const [showSocials, setShowSocials] = useState(member.show_socials ?? true);
  const [allowIndexing, setAllowIndexing] = useState(member.allow_indexing ?? true);

  // Status Management State
  const [statusReason, setStatusReason] = useState("");

  // QR Code State
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direct section access set
  const [directSecs, setDirectSecs] = useState<Set<string>>(new Set(member.direct_sections || []));
  const teamSecsSet = new Set(member.team_sections || []);
  const isAdmin = member.roles.includes("admin") || member.roles.includes("master_admin");

  // Query latest draft / change request for this member
  const { data: latestRequest, refetch: refetchDraft } = useQuery({
    queryKey: ["staff-draft-request", member.user_id],
    queryFn: () => fetchDraftFn({ data: { userId: member.user_id } }),
    enabled: open,
  });

  // Compute public canonical URL
  const publicSlug = slug || member.slug || member.user_id;
  const publicUrl = useMemo(() => {
    return buildIdentityUrl(origin, publicSlug);
  }, [origin, publicSlug]);

  // Sync state when member changes
  useEffect(() => {
    setDirectSecs(new Set(member.direct_sections || []));
    setSelectedDesignation(member.designation_id || "none");
    setFullName(member.full_name || "");
    setAvatarUrl(member.avatar_url || "");
    setEmployeeCode(member.employee_code || "");
    setSlug(member.slug || member.user_id.slice(0, 8));
    setDepartment(member.department || "");
    setTitle(member.title || member.designation_title || "");
    setPhone(member.phone || "");
    setBio(member.bio || "");
    setIsPublic(member.is_public ?? true);
    setShowEmail(member.show_email ?? true);
    setShowPhone(member.show_phone ?? true);
    setShowSocials(member.show_socials ?? true);
    setAllowIndexing(member.allow_indexing ?? true);
    setActiveTab(initialTab);
    setRequestNote("");
    setStatusReason(member.status_reason || "");
  }, [member, initialTab]);

  // If there's an active draft or rejected request, pre-populate draft changes!
  useEffect(() => {
    if (latestRequest && (latestRequest.status === "pending" || latestRequest.status === "rejected")) {
      const c = latestRequest.changes || {};
      if (c.fullName !== undefined) setFullName(c.fullName);
      if (c.avatarUrl !== undefined) setAvatarUrl(c.avatarUrl);
      if (c.employeeCode !== undefined) setEmployeeCode(c.employeeCode);
      if (c.slug !== undefined) setSlug(c.slug);
      if (c.department !== undefined) setDepartment(c.department);
      if (c.title !== undefined) setTitle(c.title);
      if (c.phone !== undefined) setPhone(c.phone);
      if (c.bio !== undefined) setBio(c.bio);
      if (c.isPublic !== undefined) setIsPublic(c.isPublic);
      if (c.showEmail !== undefined) setShowEmail(c.showEmail);
      if (c.showPhone !== undefined) setShowPhone(c.showPhone);
      if (c.showSocials !== undefined) setShowSocials(c.showSocials);
      if (c.allowIndexing !== undefined) setAllowIndexing(c.allowIndexing);
      if (c.designationId !== undefined) setSelectedDesignation(c.designationId || "none");
      if (latestRequest.note) setRequestNote(latestRequest.note);
    }
  }, [latestRequest]);

  // Generate QR Code
  useEffect(() => {
    if (publicUrl) {
      QRCode.toDataURL(publicUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 384,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(""));
    }
  }, [publicUrl]);

  // Save profile mutation
  const saveProfileMut = useMutation({
    mutationFn: async () => {
      const res = await saveProfileFn({
        data: {
          userId: member.user_id,
          fullName: fullName.trim(),
          avatarUrl: avatarUrl.trim() || null,
          employeeCode: employeeCode.trim() || undefined,
          slug: slug.trim() || undefined,
          department: department.trim() || null,
          title: title.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          designationId: selectedDesignation === "none" ? null : selectedDesignation,
          isPublic,
          showEmail,
          showPhone,
          showSocials,
          allowIndexing,
          requestNote: requestNote.trim() || undefined,
        },
      });
      return res;
    },
    onSuccess: (res: any) => {
      if (res?.pendingApproval) {
        toast.info(res?.message || "Changes saved as draft and submitted for HR review.");
      } else {
        toast.success("Staff profile & public controls saved successfully");
      }
      refetchDraft();
      qc.invalidateQueries({ queryKey: ["staff"] });
      qc.invalidateQueries({ queryKey: ["staff-change-requests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save profile"),
  });

  // Status change mutation (suspend / fire / reinstate)
  const statusMut = useMutation({
    mutationFn: async (newStatus: "active" | "suspended" | "fired") => {
      await updateStatusFn({
        data: {
          userId: member.user_id,
          status: newStatus,
          reason: statusReason.trim() || undefined,
        },
      });
    },
    onSuccess: (_, newStatus) => {
      if (newStatus === "active") toast.success("Staff member successfully REINSTATED / ACTIVATED");
      else if (newStatus === "suspended") toast.warning("Staff member SUSPENDED");
      else toast.error("Staff member marked as FIRED / TERMINATED");

      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update status"),
  });

  // Avatar upload handler
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file");
      return;
    }

    try {
      setUploadingAvatar(true);
      const ext = file.name.split(".").pop() || "png";
      const filePath = `staff/${member.user_id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        const { error: fallbackErr } = await supabase.storage
          .from("public")
          .upload(filePath, file, { upsert: true });
        if (fallbackErr) throw uploadError;
        const { data: pubData } = supabase.storage.from("public").getPublicUrl(filePath);
        setAvatarUrl(pubData.publicUrl);
      } else {
        const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(filePath);
        setAvatarUrl(pubData.publicUrl);
      }

      toast.success("Profile photo uploaded! Click Save/Submit to apply.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Public profile link copied to clipboard");
  };

  const downloadQrCode = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${employeeCode || slug || "staff"}-qr.png`;
    a.click();
  };

  const downloadVCardFile = () => {
    const blob = new Blob([toVCard({ ...member, full_name: fullName, title, department, phone }, publicUrl)], {
      type: "text/vcard;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${employeeCode || slug || "staff"}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("vCard downloaded");
  };

  const saveSectionsMut = useMutation({
    mutationFn: async (sectionsToSave: string[]) => {
      await updateSections({
        data: {
          userId: member.user_id,
          sections: sectionsToSave,
        },
      });
    },
    onSuccess: () => {
      toast.success("Section permissions updated");
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update permissions"),
  });

  const applyPreset = (preset: Preset) => {
    const next = new Set(preset.sections);
    setDirectSecs(next);
    saveSectionsMut.mutate(Array.from(next));
  };

  const toggleSection = (secKey: string) => {
    const next = new Set(directSecs);
    if (next.has(secKey)) next.delete(secKey);
    else next.add(secKey);
    setDirectSecs(next);
    saveSectionsMut.mutate(Array.from(next));
  };

  const revokeAllSections = () => {
    setDirectSecs(new Set());
    saveSectionsMut.mutate([]);
  };

  const updateDesignationMut = useMutation({
    mutationFn: async (desId: string | null) => {
      await setDesignation({
        data: {
          userId: member.user_id,
          designationId: desId === "none" ? null : desId,
        },
      });
    },
    onSuccess: () => {
      toast.success("Designation updated");
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update designation"),
  });

  const addRoleMut = useMutation({
    mutationFn: async () => {
      if (!member.email) throw new Error("Staff member has no email on record.");
      await grantRole({
        data: {
          email: member.email,
          role: selectedRoleToAdd,
        },
      });
    },
    onSuccess: () => {
      toast.success(`Role "${ROLE_LABELS[selectedRoleToAdd]}" granted`);
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to grant role"),
  });

  const removeRoleMut = useMutation({
    mutationFn: async (roleToRemove: StaffRole) => {
      await revokeRole({
        data: {
          userId: member.user_id,
          role: roleToRemove,
        },
      });
    },
    onSuccess: () => {
      toast.success("Role revoked");
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to revoke role"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/70 bg-card">
          {/* Status Alert Banner */}
          {isFired && (
            <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/30 p-3.5 flex items-center justify-between text-xs text-destructive">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">STATUS: FIRED / TERMINATED</p>
                  <p className="text-[11px] text-destructive/80 mt-0.5">
                    This staff member is terminated. Data is preserved for legal & audit records, but their profile and dashboard access are isolated/locked.
                  </p>
                </div>
              </div>
              {(isHRLead || isMasterAdmin) && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => statusMut.mutate("active")}
                  disabled={statusMut.isPending}
                  className="h-7 text-xs font-semibold gap-1.5 shrink-0 shadow-sm"
                >
                  <Unlock className="w-3.5 h-3.5" /> Re-assign & Unlock
                </Button>
              )}
            </div>
          )}

          {isSuspended && (
            <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
              <div className="flex items-center gap-2.5">
                <Ban className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">STATUS: SUSPENDED</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {member.status_reason ? `Reason: ${member.status_reason}` : "Access is temporarily revoked."}
                  </p>
                </div>
              </div>
              {(isHRLead || isMasterAdmin) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => statusMut.mutate("active")}
                  disabled={statusMut.isPending}
                  className="h-7 text-xs font-semibold gap-1.5 shrink-0 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                >
                  <UserCheck className="w-3.5 h-3.5" /> Reinstate Staff
                </Button>
              )}
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <StaffAvatar
                url={avatarUrl || member.avatar_url}
                name={fullName || member.full_name || member.email}
                className="w-12 h-12 text-base border-2 border-border"
              />
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>{fullName || member.full_name || member.email || "Staff Member"}</span>
                  {member.employee_code && (
                    <Badge variant="outline" className="font-mono text-[10px] bg-muted/40 font-normal">
                      {member.employee_code}
                    </Badge>
                  )}
                  {member.status === "active" && (
                    <Badge variant="default" className="text-[10px] bg-emerald-600">Active</Badge>
                  )}
                  {member.status === "suspended" && (
                    <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-500 bg-amber-500/10">Suspended</Badge>
                  )}
                  {member.status === "fired" && (
                    <Badge variant="destructive" className="text-[10px]">Fired</Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2">
                  <span>{member.email || "No email on record"}</span>
                  {(member.designation_title || member.title) && (
                    <>
                      <span>·</span>
                      <span className="text-foreground/90 font-medium">{member.designation_title || member.title}</span>
                    </>
                  )}
                  {member.department && (
                    <>
                      <span>·</span>
                      <span className="text-muted-foreground">{member.department}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 shrink-0">
              {member.roles.map((r) => (
                <Badge
                  key={r}
                  style={{ backgroundColor: `${ROLE_COLORS[r]}22`, color: ROLE_COLORS[r], borderColor: `${ROLE_COLORS[r]}44` }}
                  variant="outline"
                  className="text-[11px]"
                >
                  {ROLE_LABELS[r] || r}
                </Badge>
              ))}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-5 h-8.5">
              <TabsTrigger value="profile" className="text-xs gap-1.5">
                <IdCard className="w-3.5 h-3.5" /> Staff ID & Profile
              </TabsTrigger>
              <TabsTrigger value="sections" className="text-xs gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Permissions
              </TabsTrigger>
              <TabsTrigger value="roles" className="text-xs gap-1.5">
                <KeyRound className="w-3.5 h-3.5" /> Designation & Roles
              </TabsTrigger>
              <TabsTrigger value="teams" className="text-xs gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Departments
              </TabsTrigger>
              <TabsTrigger value="status" className="text-xs gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Employment Status
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Tab 0: Staff ID & Public Profile */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Digital ID Badge & Live QR Sharing */}
              <div className="lg:col-span-5 space-y-4">
                <div className="rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/30 p-5 shadow-sm space-y-4 text-center relative overflow-hidden">
                  {/* Top corporate banner */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${isFired ? "bg-destructive" : isSuspended ? "bg-amber-500" : "bg-gradient-to-r from-primary via-indigo-500 to-purple-500"}`} />

                  <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-muted-foreground uppercase pt-1">
                    <span>ORIZINO CORP</span>
                    <span className="font-mono text-primary">{employeeCode || member.employee_code || "ORZ-0000"}</span>
                  </div>

                  {/* Photo & Identity */}
                  <div className="flex flex-col items-center pt-2">
                    <div className="relative">
                      <StaffAvatar
                        url={avatarUrl || member.avatar_url}
                        name={fullName || member.full_name}
                        className="w-20 h-20 text-xl border-4 border-background shadow-md"
                      />
                      {isFired ? (
                        <div className="absolute -bottom-1 -right-1 bg-destructive text-white rounded-full p-1 shadow" title="Fired">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      ) : isSuspended ? (
                        <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow" title="Suspended">
                          <Ban className="w-3.5 h-3.5" />
                        </div>
                      ) : isPublic ? (
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 shadow" title="Public Profile Active">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="absolute -bottom-1 -right-1 bg-zinc-500 text-white rounded-full p-1 shadow" title="Private Profile">
                          <EyeOff className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-foreground mt-3">
                      {fullName || member.full_name || "Staff Member"}
                    </h3>
                    <p className="text-xs font-medium text-primary">
                      {title || member.designation_title || "Official Staff"}
                    </p>
                    {department && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{department}</p>
                    )}
                  </div>

                  {/* QR Code Container */}
                  <div className="bg-white p-2.5 rounded-xl border border-border/60 inline-block shadow-inner mx-auto">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="Public ID QR" className="w-28 h-28 object-contain mx-auto" />
                    ) : (
                      <div className="w-28 h-28 flex items-center justify-center text-muted-foreground">
                        <QrCode className="w-8 h-8 opacity-40 animate-pulse" />
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-muted-foreground truncate px-2">
                    {publicUrl}
                  </div>

                  {/* Quick ID Actions */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyPublicLink}
                      className="h-8 text-xs gap-1.5 bg-background"
                    >
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" /> Copy Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(publicUrl, "_blank")}
                      className="h-8 text-xs gap-1.5 bg-background"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /> View Page
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadQrCode}
                      disabled={!qrDataUrl}
                      className="h-8 text-xs gap-1.5 bg-background"
                    >
                      <Download className="w-3.5 h-3.5 text-muted-foreground" /> QR Image
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={downloadVCardFile}
                      className="h-8 text-xs gap-1.5 bg-background"
                    >
                      <Share2 className="w-3.5 h-3.5 text-muted-foreground" /> vCard (.vcf)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Profile Edits & Public View Controls */}
              <div className="lg:col-span-7 space-y-5">
                {/* Draft / Pending Application Banner */}
                {latestRequest?.status === "pending" && (
                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-400">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Draft Profile Application Pending HR Approval</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Your proposed updates are currently in the HR review queue. You can refine any fields below and click <strong>"Update Draft Application"</strong> to update your submission before approval.
                      </p>
                      {latestRequest.note && (
                        <p className="text-[11px] mt-1 italic text-muted-foreground">
                          Note: "{latestRequest.note}"
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Rejected Application Banner */}
                {latestRequest?.status === "rejected" && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3.5 flex items-start gap-2.5 text-xs text-destructive">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Previous Profile Application Rejected by HR</p>
                      <p className="text-[11px] text-destructive/90 mt-0.5">
                        <strong>HR Reason:</strong> "{latestRequest.reviewer_note || "Please revise your submitted details."}"
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Please adjust your draft values according to the feedback above and click <strong>"Re-apply for HR Approval"</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Public View Controls */}
                <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-primary" /> Public Visibility Controls
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Configure what the public sees at the staff identity URL.
                      </p>
                    </div>
                    <Badge variant={isPublic ? "default" : "secondary"} className="text-[10px]">
                      {isPublic ? "Publicly Accessible" : "Disabled / Private"}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">Public Profile Page Active</p>
                        <p className="text-[11px] text-muted-foreground">Allows external verification via QR scan or URL</p>
                      </div>
                      <Switch checked={isPublic} onCheckedChange={setIsPublic} disabled={isFired} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">Display Work Email</p>
                        <p className="text-[11px] text-muted-foreground">Show corporate email address on public badge</p>
                      </div>
                      <Switch checked={showEmail} onCheckedChange={setShowEmail} disabled={isFired} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">Display Public Phone</p>
                        <p className="text-[11px] text-muted-foreground">Show contact phone number on public badge</p>
                      </div>
                      <Switch checked={showPhone} onCheckedChange={setShowPhone} disabled={isFired} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">Display Social Links</p>
                        <p className="text-[11px] text-muted-foreground">Show LinkedIn, GitHub, and social media handles</p>
                      </div>
                      <Switch checked={showSocials} onCheckedChange={setShowSocials} disabled={isFired} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-foreground">Search Engine Indexing</p>
                        <p className="text-[11px] text-muted-foreground">Allow Google & search crawlers to index identity page</p>
                      </div>
                      <Switch checked={allowIndexing} onCheckedChange={setAllowIndexing} disabled={isFired} />
                    </div>
                  </div>
                </div>

                {/* Profile Information Form */}
                <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <UserCircle2 className="w-3.5 h-3.5 text-primary" /> Profile Details & Badge Information
                    </h4>
                    {!isHRStaff && (
                      <Badge variant="outline" className="text-[10px] text-amber-500 bg-amber-500/10 border-amber-500/30">
                        Staff Draft Mode (Pending HR Review)
                      </Badge>
                    )}
                  </div>

                  {/* Avatar upload / link */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Profile Picture / Avatar</label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://... image URL"
                        disabled={isFired}
                        className="h-8.5 text-xs flex-1"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar || isFired}
                        className="h-8.5 text-xs gap-1.5 shrink-0"
                      >
                        {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        Upload
                      </Button>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Full Display Name *</label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ace Zero"
                      disabled={isFired}
                      className="h-8.5 text-xs"
                    />
                  </div>

                  {/* Job Title & Department */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Job Title / Role</label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Chief Executive Officer (CEO)"
                        disabled={isFired}
                        className="h-8.5 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Department</label>
                      <Input
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Executive Board / Core"
                        disabled={isFired}
                        className="h-8.5 text-xs"
                      />
                    </div>
                  </div>

                  {/* Employee Code & Public Slug */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Employee Code</label>
                      <Input
                        value={employeeCode}
                        onChange={(e) => setEmployeeCode(e.target.value)}
                        placeholder="e.g. ORZ-0001"
                        disabled={isFired}
                        className="h-8.5 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Custom Public Slug</label>
                      <Input
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="e.g. ace-zero"
                        disabled={isFired}
                        className="h-8.5 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Phone & Bio */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Public Phone</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1..."
                      disabled={isFired}
                      className="h-8.5 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Bio / Public Description</label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Brief description of responsibilities, skills, and bio..."
                      disabled={isFired}
                      rows={2}
                      className="text-xs resize-none"
                    />
                  </div>

                  {/* Note message for approval */}
                  {!isHRStaff && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" /> Application Note / Reason for HR
                      </label>
                      <Input
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        placeholder="e.g. Updated profile photo and requested department transfer."
                        disabled={isFired}
                        className="h-8.5 text-xs"
                      />
                    </div>
                  )}

                  {/* Save / Submit Button */}
                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => saveProfileMut.mutate()}
                      disabled={saveProfileMut.isPending || isFired}
                      className="h-8.5 text-xs font-medium gap-1.5 px-4 shadow-sm"
                    >
                      {saveProfileMut.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      {isHRStaff
                        ? "Save Profile Changes Immediately"
                        : latestRequest?.status === "pending"
                        ? "Update Draft Application"
                        : latestRequest?.status === "rejected"
                        ? "Re-apply for HR Approval"
                        : "Submit Profile for HR Approval"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Section Permissions */}
          {activeTab === "sections" && (
            <div className="space-y-4">
              {isAdmin && (
                <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3 text-xs text-indigo-400 flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>
                    This member is an <strong>{member.roles.includes("master_admin") ? "Master Admin" : "Admin"}</strong> and automatically has full platform access to every section.
                  </span>
                </div>
              )}

              {/* Preset Shortcuts */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Quick Role Presets
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      disabled={saveSectionsMut.isPending || isAdmin || isFired}
                      className="flex flex-col items-start rounded-lg border border-border/70 bg-card hover:bg-muted/40 hover:border-primary/40 p-2.5 text-left transition-all disabled:opacity-50"
                    >
                      <span className="text-xs font-semibold text-foreground">{preset.name}</span>
                      <span className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {preset.description || `${preset.sections.length} sections`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Individual Section Toggles */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Section Access Control ({sections.length})
                  </p>
                  {directSecs.size > 0 && !isAdmin && !isFired && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={revokeAllSections}
                      className="h-6 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Revoke all direct
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sections.map((sec) => {
                    const isDirect = directSecs.has(sec.key);
                    const isTeamInherited = teamSecsSet.has(sec.key);
                    const isEffective = isAdmin || isDirect || isTeamInherited;

                    return (
                      <div
                        key={sec.key}
                        className={`flex items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 border transition-all ${
                          isEffective
                            ? "border-primary/30 bg-primary/5"
                            : "border-border/60 bg-card/60 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-1.5 rounded-md ${isEffective ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {SECTION_ICONS[sec.key] || <BookOpen className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground">{sec.label}</span>
                              {isTeamInherited && !isDirect && !isAdmin && (
                                <Badge variant="secondary" className="text-[9px] py-0 px-1 font-normal bg-indigo-500/10 text-indigo-400">
                                  Team inherited
                                </Badge>
                              )}
                              {isDirect && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal border-primary/40 text-primary">
                                  Direct grant
                                </Badge>
                              )}
                            </div>
                            {sec.description && (
                              <p className="text-[11px] text-muted-foreground truncate">{sec.description}</p>
                            )}
                          </div>
                        </div>

                        <Switch
                          checked={isEffective}
                          disabled={isAdmin || isTeamInherited || saveSectionsMut.isPending || isFired}
                          onCheckedChange={() => toggleSection(sec.key)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Designation & Roles */}
          {activeTab === "roles" && (
            <div className="space-y-5">
              {/* Designation Selector */}
              <div className="rounded-xl border border-border p-4 bg-card space-y-2.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Corporate Designation & Title
                </label>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedDesignation}
                    disabled={isFired || (!isHRStaff && isSelf)}
                    onValueChange={(val) => {
                      setSelectedDesignation(val);
                      if (isHRStaff) updateDesignationMut.mutate(val);
                    }}
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue placeholder="Select corporate designation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Standard Staff)</SelectItem>
                      {designations.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updateDesignationMut.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Corporate designations include CEO, CMO, COO, CTO, General Manager (GM), Manager, Assistant Manager, etc.
                </p>
              </div>

              {/* Active Roles List */}
              <div className="rounded-xl border border-border p-4 bg-card space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Assigned Platform Roles
                </label>
                <div className="space-y-2">
                  {member.roles.map((r) => (
                    <div key={r} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ROLE_COLORS[r] || "#6366f1" }} />
                        <span className="text-xs font-semibold text-foreground">{ROLE_LABELS[r] || r}</span>
                        {r === "master_admin" && (
                          <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                            Founder
                          </Badge>
                        )}
                      </div>
                      {(!r.includes("master_admin") || isMasterAdmin) && member.roles.length > 1 && !isFired && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRoleMut.mutate(r)}
                          disabled={removeRoleMut.isPending}
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Additional Role */}
                <div className="pt-2 flex items-center gap-2">
                  <Select
                    value={selectedRoleToAdd}
                    onValueChange={(v) => setSelectedRoleToAdd(v as StaffRole)}
                    disabled={isFired}
                  >
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="support">Customer Support</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="maintainer">Maintainer</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {isMasterAdmin && <SelectItem value="master_admin">Master Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addRoleMut.mutate()}
                    disabled={addRoleMut.isPending || member.roles.includes(selectedRoleToAdd) || isFired}
                    className="h-8 text-xs gap-1"
                  >
                    {addRoleMut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    Grant Role
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Department Teams */}
          {activeTab === "teams" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Teams bundle staff into departments. When this member is part of a team, they automatically inherit that team's section permissions.
              </p>

              <div className="space-y-2">
                {teams.map((team) => {
                  const isMemberOfTeam = member.teams.some((t) => t.id === team.id);

                  return (
                    <div
                      key={team.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        isMemberOfTeam
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60 bg-card/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm"
                          style={{ backgroundColor: team.color || "#6366f1" }}
                        >
                          {team.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{team.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {team.sections.length} shared section{team.sections.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>

                      <Badge variant={isMemberOfTeam ? "default" : "outline"} className="text-[10px]">
                        {isMemberOfTeam ? "Member" : "Not in team"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 4: Employment Status & Lifecycle */}
          {activeTab === "status" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border p-4 bg-card space-y-4">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Staff Employment Status Management
                </h4>

                <div className="p-3.5 rounded-lg border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">Current Status:</span>
                    {member.status === "active" && <Badge className="bg-emerald-600">Active</Badge>}
                    {member.status === "suspended" && <Badge className="bg-amber-500">Suspended</Badge>}
                    {member.status === "fired" && <Badge variant="destructive">Fired / Terminated</Badge>}
                  </div>
                  {member.status_reason && (
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Recorded Reason:</strong> {member.status_reason}
                    </p>
                  )}
                  {member.fired_at && (
                    <p className="text-[11px] text-muted-foreground">
                      Fired on: {new Date(member.fired_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Action Reason / Notes</label>
                  <Textarea
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Enter reason for suspension, termination, or reinstatement notes..."
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                {(isHRLead || isMasterAdmin) ? (
                  <div className="pt-2 flex flex-wrap gap-2.5">
                    {member.status !== "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => statusMut.mutate("active")}
                        disabled={statusMut.isPending}
                        className="h-8.5 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Reinstate / Activate Staff
                      </Button>
                    )}

                    {member.status !== "suspended" && member.status !== "fired" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => statusMut.mutate("suspended")}
                        disabled={statusMut.isPending}
                        className="h-8.5 text-xs gap-1.5 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
                      >
                        <Ban className="w-3.5 h-3.5" /> Suspend Staff Member
                      </Button>
                    )}

                    {member.status !== "fired" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`Are you sure you want to FIRE / TERMINATE ${member.full_name || member.email}? Their data will be preserved, but access and profile will be locked.`)) {
                            statusMut.mutate("fired");
                          }
                        }}
                        disabled={statusMut.isPending}
                        className="h-8.5 text-xs gap-1.5"
                      >
                        <Flame className="w-3.5 h-3.5" /> Fire / Terminate Staff
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Only HR Leaders, General Managers, and Platform Admins can alter staff employment status.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/20 border-t border-border/70 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            User ID: <code className="font-mono text-[10px]">{member.user_id.slice(0, 8)}...</code>
          </div>
          <Button size="sm" onClick={onClose} className="h-8 text-xs font-medium">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* HR Approvals & Change Applications Queue Tab                   */
/* ────────────────────────────────────────────────────────────── */
function HRApprovalsQueue({
  isHRStaff,
}: {
  isHRStaff: boolean;
}) {
  const qc = useQueryClient();
  const fetchRequests = useServerFn(listStaffChangeRequests);
  const reviewRequestFn = useServerFn(reviewStaffChangeRequest);

  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const { data: requests = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["staff-change-requests", filterStatus],
    queryFn: () => fetchRequests({ data: { status: filterStatus } }),
  });

  const reviewMut = useMutation({
    mutationFn: async ({ requestId, decision, note }: { requestId: string; decision: "approved" | "rejected"; note?: string }) => {
      await reviewRequestFn({
        data: {
          requestId,
          decision,
          reviewerNote: note,
        },
      });
    },
    onSuccess: (_, vars) => {
      if (vars.decision === "approved") {
        toast.success("Change application APPROVED and applied to staff profile!");
      } else {
        toast.info("Change application rejected with required feedback note");
      }
      setRejectModalId(null);
      setRejectNote("");
      qc.invalidateQueries({ queryKey: ["staff-change-requests"] });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Review failed"),
  });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
            <SelectTrigger className="h-8.5 text-xs w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved Applications</SelectItem>
              <SelectItem value="rejected">Rejected Applications</SelectItem>
              <SelectItem value="all">All Change Requests</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8.5 text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {requests.map((req: any) => {
          const targetName = req.targetUser?.profile?.full_name || req.targetUser?.identity?.display_name || "Staff Member";
          const requesterName = req.requester?.profile?.full_name || req.requester?.identity?.display_name || "Requester";
          const isSelfRequest = req.user_id === req.requested_by;

          return (
            <div
              key={req.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm hover:border-primary/40 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
                <div className="flex items-center gap-3">
                  <StaffAvatar
                    url={req.targetUser?.identity?.avatar_url || req.targetUser?.profile?.avatar_url}
                    name={targetName}
                    className="w-10 h-10 text-sm border"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">{targetName}</h4>
                      {req.targetUser?.identity?.employee_code && (
                        <Badge variant="outline" className="font-mono text-[9px]">
                          {req.targetUser.identity.employee_code}
                        </Badge>
                      )}
                      <Badge
                        variant={req.status === "pending" ? "default" : req.status === "approved" ? "secondary" : "destructive"}
                        className="text-[10px] uppercase font-mono"
                      >
                        {req.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>Submitted by: <strong>{isSelfRequest ? "Self (Employee)" : requesterName}</strong></span>
                      <span>·</span>
                      <span>{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</span>
                    </p>
                  </div>
                </div>

                {req.status === "pending" && isHRStaff && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejectModalId(req.id);
                        setRejectNote("");
                      }}
                      className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject Application
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => reviewMut.mutate({ requestId: req.id, decision: "approved" })}
                      disabled={reviewMut.isPending}
                      className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 font-medium"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Approve & Apply
                    </Button>
                  </div>
                )}
              </div>

              {/* Note / Message */}
              {req.note && (
                <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-foreground flex items-start gap-2 border border-border/40">
                  <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-muted-foreground text-[11px] block">Application Reason:</span>
                    <span>{req.note}</span>
                  </div>
                </div>
              )}

              {/* Proposed Changes Diff View */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Requested Field Changes (Draft)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(req.changes || {}).map(([key, newVal]: [string, any]) => {
                    const currentVal = (req.targetUser?.identity as any)?.[key] || (req.targetUser?.profile as any)?.[key] || "—";
                    const displayLabel = key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").toUpperCase();

                    return (
                      <div key={key} className="rounded-lg border border-border/70 p-2 text-xs bg-muted/20 space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground">{displayLabel}</span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-muted-foreground line-through truncate max-w-[90px]">{String(currentVal)}</span>
                          <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                          <span className="text-foreground font-semibold truncate max-w-[120px]">{String(newVal)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mandatory Rejection Reason from HR if rejected */}
              {req.status === "rejected" && req.reviewer_note && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2.5 text-xs text-destructive space-y-1">
                  <span className="font-bold block flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> HR Rejection Reason Note:
                  </span>
                  <p className="italic">"{req.reviewer_note}"</p>
                </div>
              )}
            </div>
          );
        })}

        {requests.length === 0 && !isLoading && (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
            <CheckCircle className="w-8 h-8 opacity-40 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-medium text-foreground">No change requests found</p>
            <p className="text-xs text-muted-foreground mt-0.5">All staff profile drafts and designation applications are up to date.</p>
          </div>
        )}
      </div>

      {/* Mandatory Rejection Reason Modal */}
      <Dialog open={!!rejectModalId} onOpenChange={(v) => !v && setRejectModalId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" /> Reject Staff Application
            </DialogTitle>
            <DialogDescription>
              A rejection reason note is required from the HR team to explain why this draft update cannot be approved.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Rejection Reason Note *</span>
              <span className="text-[10px] text-muted-foreground">(Required)</span>
            </label>
            <Textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g. Requested job title does not match corporate banding. Please revise and re-apply."
              rows={3}
              className="text-xs"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRejectModalId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (rejectNote.trim().length < 3) {
                  toast.error("Please enter a mandatory rejection reason for the staff member.");
                  return;
                }
                if (rejectModalId) {
                  reviewMut.mutate({ requestId: rejectModalId, decision: "rejected", note: rejectNote.trim() });
                }
              }}
              disabled={reviewMut.isPending || rejectNote.trim().length < 3}
              className="gap-1.5 font-medium"
            >
              {reviewMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/* Main AdminEmployees Component                                  */
/* ────────────────────────────────────────────────────────────── */
export default function AdminEmployees() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchStaff = useServerFn(listStaff);
  const fetchTeams = useServerFn(listTeamsDetailed);
  const fetchDesignations = useServerFn(listDesignations);
  const grantRole = useServerFn(grantStaffRole);
  const fetchRequests = useServerFn(listStaffChangeRequests);

  // Queries
  const { data: staff = [], isLoading: staffLoading, error: loadError, refetch, isFetching } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetchStaff(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["admin-teams-detailed"],
    queryFn: () => fetchTeams(),
  });

  const { data: sections = [] } = useQuery<StaffSection[]>({
    queryKey: ["staff-sections-list"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_sections").select("*").order("sort_order");
      return (data ?? []) as StaffSection[];
    },
  });

  const { data: presets = [] } = useQuery<Preset[]>({
    queryKey: ["staff-presets"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_role_presets").select("*").order("name");
      return (data ?? []) as Preset[];
    },
  });

  const { data: designations = [] } = useQuery<{ id: string; title: string }[]>({
    queryKey: ["designations-list"],
    queryFn: () => fetchDesignations(),
  });

  // Pending change requests count
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["staff-change-requests", "pending"],
    queryFn: () => fetchRequests({ data: { status: "pending" } }),
  });

  // Top-level View Tab: "directory" vs "approvals"
  const [topTab, setTopTab] = useState<"directory" | "approvals">("directory");

  // Filters & State
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Selected member for dialog
  const [selectedMember, setSelectedMember] = useState<StaffMemberDetail | null>(null);
  const [dialogInitialTab, setDialogInitialTab] = useState<string>("profile");
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);

  // Add Member Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("moderator");
  const [inviteDesignation, setInviteDesignation] = useState<string>("none");
  const [inviteTeamIds, setInviteTeamIds] = useState<Set<string>>(new Set());
  const [invitePresetId, setInvitePresetId] = useState<string>("none");

  // Check permissions
  const currentUserStaff = useMemo(() => {
    return (staff as StaffMemberDetail[]).find((s) => s.user_id === user?.id);
  }, [staff, user]);

  const isMasterAdmin = useMemo(() => {
    return currentUserStaff?.roles.includes("master_admin") ?? false;
  }, [currentUserStaff]);

  const isHRLead = useMemo(() => {
    if (!currentUserStaff) return false;
    if (currentUserStaff.roles.includes("master_admin") || currentUserStaff.roles.includes("admin")) return true;
    const title = (currentUserStaff.designation_title || currentUserStaff.title || "").toLowerCase();
    return (
      title.includes("hr manager") ||
      title.includes("hr lead") ||
      title.includes("general manager") ||
      title.includes("chairman") ||
      title.includes("ceo") ||
      title.includes("coo")
    );
  }, [currentUserStaff]);

  const isHRStaff = useMemo(() => {
    if (isHRLead || isMasterAdmin) return true;
    if (!currentUserStaff) return false;
    const teamNames = currentUserStaff.teams.map((t) => t.name.toLowerCase());
    return (
      teamNames.some((n) => n.includes("hr") || n.includes("human resource")) ||
      currentUserStaff.roles.includes("moderator") ||
      currentUserStaff.roles.includes("support")
    );
  }, [isHRLead, isMasterAdmin, currentUserStaff]);

  // Invite mutation
  const inviteMut = useMutation({
    mutationFn: async () => {
      const preset = presets.find((p) => p.id === invitePresetId);
      await grantRole({
        data: {
          email: inviteEmail.trim(),
          role: inviteRole,
          designationId: inviteDesignation === "none" ? null : inviteDesignation,
          teamIds: Array.from(inviteTeamIds),
          sections: preset ? preset.sections : [],
          presetId: preset ? preset.id : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Team member added successfully");
      setAddModalOpen(false);
      setInviteEmail("");
      setInviteDesignation("none");
      setInviteTeamIds(new Set());
      setInvitePresetId("none");
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to add member"),
  });

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return (staff as StaffMemberDetail[]).filter((member) => {
      const needle = q.trim().toLowerCase();
      const matchesSearch =
        !needle ||
        (member.full_name && member.full_name.toLowerCase().includes(needle)) ||
        (member.email && member.email.toLowerCase().includes(needle)) ||
        (member.designation_title && member.designation_title.toLowerCase().includes(needle)) ||
        (member.employee_code && member.employee_code.toLowerCase().includes(needle)) ||
        (member.department && member.department.toLowerCase().includes(needle)) ||
        member.user_id.toLowerCase().includes(needle);

      const matchesRole =
        roleFilter === "all" || member.roles.includes(roleFilter as StaffRole);

      const matchesTeam =
        teamFilter === "all" || member.teams.some((t) => t.id === teamFilter);

      const matchesStatus =
        statusFilter === "all" || (member.status || "active") === statusFilter;

      return matchesSearch && matchesRole && matchesTeam && matchesStatus;
    });
  }, [staff, q, roleFilter, teamFilter, statusFilter]);

  const openMemberDialog = (m: StaffMemberDetail, tab: string = "profile") => {
    setSelectedMember(m);
    setDialogInitialTab(tab);
    setAccessDialogOpen(true);
  };

  const toggleInviteTeam = (tId: string) => {
    setInviteTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(tId)) next.delete(tId);
      else next.add(tId);
      return next;
    });
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2.5">
            <Users className="w-7 h-7 text-primary" /> Employees & Staff Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Corporate staff digital IDs, draft application workflow, HR review governance, and lifecycle management.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="gap-2 h-9 font-medium shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Add Team Member
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              qc.invalidateQueries({ queryKey: ["staff-change-requests"] });
            }}
            disabled={isFetching}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Tabs: Directory vs HR Approvals */}
      <div className="flex items-center justify-between border-b border-border/70">
        <div className="flex gap-4">
          <button
            onClick={() => setTopTab("directory")}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 ${
              topTab === "directory"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="w-4 h-4" /> Staff Directory ({staff.length})
          </button>
          <button
            onClick={() => setTopTab("approvals")}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 border-b-2 ${
              topTab === "approvals"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" /> HR Change Applications
            {pendingRequests.length > 0 && (
              <Badge variant="default" className="text-[10px] bg-primary h-5 px-1.5">
                {pendingRequests.length} Pending
              </Badge>
            )}
          </button>
        </div>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Staff directory could not be loaded</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{loadError instanceof Error ? loadError.message : "Error connecting to Supabase"}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main View Area */}
      {topTab === "approvals" ? (
        <HRApprovalsQueue isHRStaff={isHRStaff || isHRLead || isMasterAdmin} />
      ) : (
        <>
          {/* Filter & Search Bar */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, email, designation, employee ID, or department..."
                  className="pl-9 h-9 text-xs"
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="suspended">Suspended Only</SelectItem>
                    <SelectItem value="fired">Fired / Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Filter */}
              <div className="w-full md:w-44">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles ({staff.length})</SelectItem>
                    <SelectItem value="master_admin">Master Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="maintainer">Maintainer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Team Filter */}
              <div className="w-full md:w-44">
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/20 shrink-0">
                <button
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-md text-xs transition-colors ${
                    viewMode === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                  title="Table View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded-md text-xs transition-colors ${
                    viewMode === "cards" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                  title="Cards View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Staff Roster: Table View */}
          {viewMode === "table" ? (
            <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/70">
                    <tr>
                      <th className="px-4 py-3">Employee & ID</th>
                      <th className="px-3 py-3">Corporate Designation</th>
                      <th className="px-3 py-3">Roles</th>
                      <th className="px-3 py-3">Department & Teams</th>
                      <th className="px-3 py-3">Employment Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredStaff.map((s) => {
                      const isFired = s.status === "fired";
                      const isSuspended = s.status === "suspended";

                      return (
                        <tr
                          key={s.user_id}
                          className={`hover:bg-muted/20 transition-colors group ${
                            isFired ? "bg-destructive/5 opacity-80" : isSuspended ? "bg-amber-500/5" : ""
                          }`}
                        >
                          {/* Employee Info & Avatar */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <StaffAvatar
                                url={s.avatar_url}
                                name={s.full_name || s.email}
                                className={`w-10 h-10 text-xs border ${
                                  isFired ? "border-destructive/60" : isSuspended ? "border-amber-500/60" : "border-border/70"
                                }`}
                              />
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-semibold text-foreground truncate">
                                    {s.full_name || "Unnamed Staff"}
                                  </p>
                                  {s.employee_code && (
                                    <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 bg-muted/40 text-muted-foreground">
                                      {s.employee_code}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {s.email || "No email"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Designation */}
                          <td className="px-3 py-3">
                            {s.designation_title || s.title ? (
                              <Badge variant="outline" className="text-[11px] font-normal gap-1 bg-muted/30">
                                <Briefcase className="w-3 h-3 text-muted-foreground" />
                                {s.designation_title || s.title}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">—</span>
                            )}
                          </td>

                          {/* Roles */}
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {s.roles.map((r) => (
                                <Badge
                                  key={r}
                                  variant="outline"
                                  style={{
                                    backgroundColor: `${ROLE_COLORS[r]}18`,
                                    color: ROLE_COLORS[r],
                                    borderColor: `${ROLE_COLORS[r]}38`,
                                  }}
                                  className="text-[10px] font-medium"
                                >
                                  {ROLE_LABELS[r] || r}
                                </Badge>
                              ))}
                            </div>
                          </td>

                          {/* Department & Teams */}
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {s.department && (
                                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border border-border bg-muted/30 text-foreground">
                                  {s.department}
                                </span>
                              )}
                              {s.teams.map((t) => (
                                <span
                                  key={t.id}
                                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border"
                                  style={{
                                    backgroundColor: `${t.color}15`,
                                    color: t.color,
                                    borderColor: `${t.color}35`,
                                  }}
                                >
                                  {t.name}
                                </span>
                              ))}
                              {!s.department && s.teams.length === 0 && (
                                <span className="text-[11px] text-muted-foreground italic">—</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3">
                            {isFired ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-destructive font-semibold">
                                <Lock className="w-3.5 h-3.5" /> Fired / Terminated
                              </span>
                            ) : isSuspended ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 font-semibold">
                                <Ban className="w-3.5 h-3.5" /> Suspended
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openMemberDialog(s, "profile")}
                                className="h-7 text-xs gap-1"
                              >
                                <IdCard className="w-3.5 h-3.5 text-primary" />
                                Digital ID & Profile
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openMemberDialog(s, "status")}
                                className="h-7 text-xs gap-1"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Status
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredStaff.length === 0 && !staffLoading && (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-muted-foreground">
                          <Users className="w-8 h-8 opacity-30 mx-auto mb-2" />
                          <p className="text-sm font-medium text-foreground">No employees match criteria</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Try clearing filters or search queries</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Staff Roster: Cards View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((s) => {
                const isFired = s.status === "fired";
                const isSuspended = s.status === "suspended";

                return (
                  <div
                    key={s.user_id}
                    className={`rounded-xl border p-4 transition-all space-y-3.5 shadow-sm ${
                      isFired
                        ? "border-destructive/40 bg-destructive/5"
                        : isSuspended
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-border/70 bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <StaffAvatar
                          url={s.avatar_url}
                          name={s.full_name || s.email}
                          className={`w-12 h-12 text-base border shadow-sm ${
                            isFired ? "border-destructive/60" : isSuspended ? "border-amber-500/60" : "border-border/70"
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {s.full_name || "Unnamed Staff"}
                            </h3>
                            {s.employee_code && (
                              <Badge variant="outline" className="font-mono text-[9px] px-1 py-0 bg-muted/40">
                                {s.employee_code}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{s.email || "No email"}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {isFired ? (
                          <Badge variant="destructive" className="text-[9px]">Fired</Badge>
                        ) : isSuspended ? (
                          <Badge variant="outline" className="text-[9px] border-amber-500 text-amber-500 bg-amber-500/10">Suspended</Badge>
                        ) : (
                          <Badge variant="default" className="text-[9px] bg-emerald-600">Active</Badge>
                        )}
                      </div>
                    </div>

                    {(s.designation_title || s.title || s.department) && (
                      <div className="space-y-1 text-xs text-foreground/90 font-medium">
                        {(s.designation_title || s.title) && (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{s.designation_title || s.title}</span>
                          </div>
                        )}
                        {s.department && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>{s.department}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {s.teams.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {s.teams.map((t) => (
                          <span
                            key={t.id}
                            className="rounded-md px-1.5 py-0.5 text-[10px] font-medium border"
                            style={{
                              backgroundColor: `${t.color}15`,
                              color: t.color,
                              borderColor: `${t.color}35`,
                            }}
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openMemberDialog(s, "profile")}
                        className="h-7 text-xs gap-1"
                      >
                        <IdCard className="w-3 h-3 text-primary" /> Digital ID
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openMemberDialog(s, "status")}
                        className="h-7 text-xs gap-1"
                      >
                        <ShieldAlert className="w-3 h-3" /> Status
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add / Invite Team Member Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Add Team Member
            </DialogTitle>
            <DialogDescription>
              Grant an existing registered user a staff role and configure initial team & section permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">User Email *</label>
              <Input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="staff@example.com"
                type="email"
              />
              <p className="text-[11px] text-muted-foreground">The user must have an active account registered with this email.</p>
            </div>

            {/* Base Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Base Role *</label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as StaffRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="support">Customer Support</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="maintainer">Maintainer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {isMasterAdmin && <SelectItem value="master_admin">Master Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Designation */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Corporate Designation</label>
              <Select value={inviteDesignation} onValueChange={setInviteDesignation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Standard Staff)</SelectItem>
                  {designations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Section Preset</label>
              <Select value={invitePresetId} onValueChange={setInvitePresetId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Custom / No initial direct sections</SelectItem>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.sections.length} sections)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teams */}
            {teams.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Initial Department Teams</label>
                <div className="grid grid-cols-2 gap-2">
                  {teams.map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-border/70 bg-muted/20 text-xs cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={inviteTeamIds.has(t.id)}
                        onCheckedChange={() => toggleInviteTeam(t.id)}
                      />
                      <span className="font-medium text-foreground truncate">{t.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMut.mutate()}
              disabled={inviteMut.isPending || !inviteEmail.trim()}
              className="gap-1.5"
            >
              {inviteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add Staff Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Access & Profile Dialog */}
      {selectedMember && (
        <StaffAccessDialog
          member={selectedMember}
          sections={sections}
          presets={presets}
          designations={designations}
          teams={teams}
          isMasterAdmin={isMasterAdmin}
          isHRLead={isHRLead}
          isHRStaff={isHRStaff}
          currentUserId={user?.id}
          initialTab={dialogInitialTab}
          open={accessDialogOpen}
          onClose={() => {
            setAccessDialogOpen(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
}
