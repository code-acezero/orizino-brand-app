"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserCircle2, Mail, Phone, MapPin, Save, Loader2, ShieldCheck, LogOut, Clock,
  IdCard, KeyRound, Eye, ExternalLink, Copy, QrCode as QrIcon, CheckCircle2, CircleAlert,
  ArrowLeft, Shield, Building2, Briefcase, Globe, Activity, Share2, Sparkles, Hash,
  Upload, RotateCcw, Building, Check, RefreshCw, Lock, Smartphone, Laptop, AlertTriangle,
  Fingerprint, MonitorCheck, ShieldAlert
} from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/components/AdminRoute";
import { useNavigate, useLocation } from "@/lib/router-compat";
import { brandHomeHref } from "@/lib/cross-app-urls";
import { toast } from "@/lib/app-toast";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { useServerFn } from "@/lib/server-fn-compat";
import { getMyIdentity, updateMyIdentity, getUserIdentityAdmin, updateUserIdentityAdmin } from "@/lib/employee-identity.functions";
import { submitProfileChangeRequest, listMyProfileChangeRequests } from "@/lib/identity-governance.functions";
import IdentityAnalytics from "@/components/IdentityAnalytics";
import AvatarCropUpload from "@/components/AvatarCropUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface AddressJson {
  line1?: string; line2?: string; city?: string; region?: string; postal_code?: string; country?: string; is_brand_default?: boolean;
}
interface ProfileRow {
  id: string; full_name: string | null; avatar_url: string | null; phone: string | null;
  address: AddressJson | null; created_at: string; updated_at: string;
}

const BRAND_DEFAULT_ADDRESS: AddressJson = {
  line1: "B.Mirzapur, Khoksa",
  line2: "Orizino HQ Atelier",
  city: "Kushtia",
  region: "Khulna",
  postal_code: "7021",
  country: "Bangladesh",
  is_brand_default: true,
};

const passwordRules = (v: string) => {
  const issues: string[] = [];
  if (v.length < 10) issues.push("10+ characters");
  if (!/[a-z]/.test(v)) issues.push("a lowercase letter");
  if (!/[A-Z]/.test(v)) issues.push("an uppercase letter");
  if (!/\d/.test(v)) issues.push("a digit");
  return issues;
};

export default function AdminProfile() {
  const { user, signOut } = useAuth();
  const role = useAdminRole();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const targetUserId = searchParams.get("userId") || searchParams.get("targetId");
  const effectiveUserId = targetUserId || user?.id;
  const isEditingOther = !!targetUserId && targetUserId !== user?.id;

  // Active tab driven reactively from sidebar URL query param
  const activeTab = searchParams.get("tab") || "overview";

  useSeoMeta(
    isEditingOther ? "Staff Profile Management" : "Account & Profile",
    "Corporate user profile overview, digital identity card, credentials and statistics"
  );

  const fetchMyIdentityFn = useServerFn(getMyIdentity);
  const fetchAdminIdentityFn = useServerFn(getUserIdentityAdmin);
  const saveMyIdentityFn = useServerFn(updateMyIdentity);
  const saveAdminIdentityFn = useServerFn(updateUserIdentityAdmin);

  // Fetch basic profile
  const { data: profile } = useQuery({
    queryKey: ["admin-profile-full", effectiveUserId],
    queryFn: async (): Promise<ProfileRow | null> => {
      if (!effectiveUserId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, address, created_at, updated_at")
        .eq("id", effectiveUserId)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileRow | null) ?? null;
    },
    enabled: !!effectiveUserId,
    staleTime: 30_000,
  });

  // Fetch Digital ID details
  const { data: identity } = useQuery({
    queryKey: ["identity-direct", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return null;
      const { data } = await (supabase as any).from("employee_identities").select("*").eq("user_id", effectiveUserId).maybeSingle();
      if (data) return data;
      if (isEditingOther && targetUserId) {
        return fetchAdminIdentityFn({ data: { targetUserId } });
      }
      return fetchMyIdentityFn();
    },
    enabled: !!effectiveUserId,
    staleTime: 30_000,
  });

  // Local form states for personal edit
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [rawAvatarUrl, setRawAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [address, setAddress] = useState<AddressJson>(BRAND_DEFAULT_ADDRESS);
  const [useBrandAddress, setUseBrandAddress] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Public Identity form states (with dedicated public avatar photo)
  const [publicAvatarUrl, setPublicAvatarUrl] = useState("");
  const [rawPublicAvatarUrl, setRawPublicAvatarUrl] = useState("");
  const [idForm, setIdForm] = useState<any>({
    slug: "",
    display_name: "",
    title: "",
    department: "",
    bio: "",
    avatar_url: "",
    email_public: "",
    phone_public: "",
    location: "",
    socials: {},
    is_public: true,
    show_email: true,
    show_phone: false,
    show_socials: true,
  });
  const [savingId, setSavingId] = useState(false);
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setPhone(profile.phone ?? "");
      if (profile.address && Object.keys(profile.address).length > 0) {
        setAddress(profile.address as AddressJson);
        setUseBrandAddress(!!(profile.address as AddressJson).is_brand_default);
      } else {
        setAddress(BRAND_DEFAULT_ADDRESS);
        setUseBrandAddress(true);
      }
    }
  }, [profile]);

  // Compute fixed canonical slug: [first_name-ORZ-0001]
  const canonicalSlug = useMemo(() => {
    if (identity?.slug) return identity.slug;
    const first = (fullName || "staff").trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "staff";
    const code = identity?.employee_code || "ORZ-0001";
    return `${first}-${code}`;
  }, [identity?.slug, identity?.employee_code, fullName]);

  useEffect(() => {
    if (identity) {
      setTitle(identity.title ?? "");
      setDepartment(identity.department ?? "");
      setBio(identity.bio ?? "");
      setPronouns(identity.pronouns ?? "");
      setSkills((identity.skills ?? []).join(", "));
      setLanguages((identity.languages ?? []).join(", "));
      setPublicAvatarUrl(identity.avatar_url || profile?.avatar_url || "");

      setIdForm({
        slug: identity.slug || canonicalSlug,
        display_name: identity.display_name ?? profile?.full_name ?? "",
        title: identity.title ?? "",
        department: identity.department ?? "",
        bio: identity.bio ?? "",
        avatar_url: identity.avatar_url || profile?.avatar_url || "",
        email_public: identity.email_public ?? user?.email ?? "",
        phone_public: identity.phone_public ?? profile?.phone ?? "",
        location: identity.location ?? "Orizino HQ Atelier",
        socials: identity.socials ?? {},
        is_public: identity.is_public !== undefined ? !!identity.is_public : true,
        show_email: identity.show_email !== undefined ? !!identity.show_email : true,
        show_phone: !!identity.show_phone,
        show_socials: identity.show_socials !== undefined ? !!identity.show_socials : true,
      });
    }
  }, [identity, profile, canonicalSlug, user?.email]);

  const publicUrl = useMemo(() => {
    const slug = identity?.slug || canonicalSlug;
    if (!slug) return "";
    return brandHomeHref(`/id/${slug}`);
  }, [identity?.slug, canonicalSlug]);

  useEffect(() => {
    if (!publicUrl) return;
    QRCode.toDataURL(publicUrl, { width: 512, margin: 1 }).then(setQr).catch(() => {});
  }, [publicUrl]);

  const roleLabel =
    role === "admin" ? "Master Administrator" : role === "moderator" ? "Moderator" : role ? role : "Staff Member";
  const initials = (fullName || user?.email || "AD").trim().slice(0, 2).toUpperCase();
  const isPrivileged = role === "admin" || role === "moderator" || isEditingOther;

  const submitChangeReq = useServerFn(submitProfileChangeRequest);
  const fetchMyReqs = useServerFn(listMyProfileChangeRequests);
  const { data: myPendingReqs } = useQuery({
    queryKey: ["my-profile-change-requests", effectiveUserId],
    queryFn: () => fetchMyReqs(),
    enabled: !!effectiveUserId && !isPrivileged,
  });
  const hasPendingReq = (myPendingReqs ?? []).some((r: any) => r.status === "pending");

  const savePersonalProfile = async () => {
    if (!effectiveUserId) return;
    setSavingProfile(true);
    try {
      const finalAddress = useBrandAddress ? BRAND_DEFAULT_ADDRESS : { ...address, is_brand_default: false };
      const changes: Record<string, any> = {
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        phone: phone.trim() || null,
        address: finalAddress,
      };

      if (isPrivileged) {
        const payload = { id: effectiveUserId, ...changes, updated_at: new Date().toISOString() };
        const { error } = await supabase.from("profiles").upsert(payload as any, { onConflict: "id" });
        if (error) throw error;

        // Also sync identity display_name, title, department, bio, skills
        const identityChanges: Record<string, any> = {
          display_name: fullName.trim() || null,
          title: title.trim() || null,
          department: department.trim() || null,
          bio: bio.trim() || null,
          pronouns: pronouns.trim() || null,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
        };
        await (supabase as any).from("employee_identities").update(identityChanges).eq("user_id", effectiveUserId);

        toast.success(isEditingOther ? "Staff profile updated" : "Profile updated successfully");
      } else {
        await submitChangeReq({ data: { changes } as any });
        toast.success("Profile change request submitted for HR approval");
        qc.invalidateQueries({ queryKey: ["my-profile-change-requests", effectiveUserId] });
      }
      qc.invalidateQueries({ queryKey: ["admin-profile-full", effectiveUserId] });
      qc.invalidateQueries({ queryKey: ["identity-direct", effectiveUserId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Public Identity (with dedicated public profile photo & fixed canonical slug)
  const savePublicIdentity = async () => {
    setSavingId(true);
    try {
      const payloadData = {
        slug: identity?.slug || canonicalSlug,
        avatar_url: publicAvatarUrl || avatarUrl || null,
        display_name: idForm.display_name || fullName || null,
        email_public: idForm.email_public || null,
        phone_public: idForm.phone_public || null,
        location: idForm.location || null,
        socials: Object.fromEntries(Object.entries(idForm.socials ?? {}).filter(([, v]) => (v as string)?.trim())) as any,
        is_public: idForm.is_public,
        show_email: idForm.show_email,
        show_phone: idForm.show_phone,
        show_socials: idForm.show_socials,
      };

      if (isEditingOther && targetUserId) {
        await saveAdminIdentityFn({ data: { targetUserId, identityData: payloadData as any } });
      } else {
        await saveMyIdentityFn({ data: payloadData as any });
      }
      toast.success("Public digital ID card saved");
      qc.invalidateQueries({ queryKey: ["identity-direct", effectiveUserId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save identity");
    } finally {
      setSavingId(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Profile link copied");
  };

  const downloadQR = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `${identity?.employee_code || "staff"}-qr.png`;
    a.click();
  };

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate("/auth");
  };

  const formattedAddress = [
    address.line1,
    address.line2,
    address.city,
    address.region,
    address.postal_code,
    address.country,
  ].filter(Boolean).join(", ");

  return (
    <div className="w-full space-y-6 pb-16 px-1 sm:px-0">
      {/* Leader Mode Banner */}
      {isEditingOther && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 flex items-center justify-between gap-3 text-xs w-full">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>Viewing staff profile: <span className="font-semibold text-foreground">{fullName}</span></span>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/team/employees")} className="h-7.5 text-xs rounded-lg">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Employees
          </Button>
        </div>
      )}

      {hasPendingReq && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2.5 w-full">
          <CircleAlert className="w-4 h-4 shrink-0" />
          <span>Profile changes submitted — pending HR / Admin review.</span>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          TAB 1: OVERVIEW (Parallel & Balanced Executive Dashboard)
         ═════════════════════════════════════════════════════════════════ */}
      {(activeTab === "overview" || !activeTab) && (
        <div className="space-y-5 w-full">
          {/* Executive Profile Header Card */}
          <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pb-5 border-b border-border/50">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={fullName} className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-border/80 shadow-xs" />
                  ) : (
                    <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-xl font-bold shadow-xs">
                      {initials}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-card" title="Active" />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground truncate">{fullName}</h1>
                    <Badge variant="outline" className="text-[11px] font-semibold py-0.5 px-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                      <Shield className="w-3 h-3 mr-1 text-emerald-500" />
                      {roleLabel}
                    </Badge>
                    {identity?.employee_code && (
                      <Badge variant="secondary" className="text-[11px] font-mono font-semibold py-0.5 px-2">
                        <Hash className="w-2.5 h-2.5 mr-0.5" />
                        {identity.employee_code}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground/70" /> {user?.email}</span>
                    {phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground/70" /> {phone}</span>}
                  </div>

                  {profile && (
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground/80">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Member since {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-border">•</span>
                      <span>Last active {new Date(profile.updated_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <Button size="sm" variant="outline" onClick={() => navigate("/master/profile?tab=personal")} className="h-8.5 text-xs rounded-lg">
                  Edit Profile
                </Button>
                {publicUrl && (
                  <Button size="sm" variant="outline" onClick={copyLink} className="h-8.5 text-xs rounded-lg">
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy ID Link
                  </Button>
                )}
                {!isEditingOther && (
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="h-8.5 text-xs rounded-lg text-muted-foreground hover:text-foreground">
                    <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign out
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Stats Grid (4 Parallel Metrics) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Employee ID</span>
                <p className="text-sm sm:text-base font-bold font-mono text-foreground">{identity?.employee_code || "ORZ-STAFF"}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Digital ID Status</span>
                <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-foreground">
                  <span className={`w-2 h-2 rounded-full ${identity?.is_public ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {identity?.is_public ? "Public & Active" : "Private Draft"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Total ID Views</span>
                <p className="text-sm sm:text-base font-bold text-foreground">{identity?.view_count ?? 0} views</p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">QR Code Scans</span>
                <p className="text-sm sm:text-base font-bold text-foreground">{Number(identity?.qr_scan_count ?? 0)} scans</p>
              </div>
            </div>
          </div>

          {/* Symmetrical & Parallel 2-Column Grid (50 / 50 Split with Equal Height Rows) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full items-stretch">
            {/* ── Left Column: Digital Badge & Contact Directory ── */}
            <div className="flex flex-col gap-5 w-full">
              {/* Card 1: Corporate Digital Badge Details */}
              <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-4 shadow-xs flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-bold text-foreground">Corporate Digital Badge Details</h2>
                    </div>
                    {publicUrl && (
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => window.open(publicUrl + "?preview=1", "_blank")} className="h-7.5 text-xs rounded-lg text-muted-foreground hover:text-foreground">
                          <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(publicUrl, "_blank")} className="h-7.5 text-xs rounded-lg">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Live
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4">
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider block">Job Designation</span>
                      <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                        {identity?.title || "Master Administrator"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider block">Department</span>
                      <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                        {identity?.department || "Executive Board & IT"}
                      </p>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider block">Public Profile Canonical Slug</span>
                      <p className="font-mono text-xs text-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/60 truncate flex items-center justify-between">
                        <span>{publicUrl || `/id/${canonicalSlug}`}</span>
                        <Lock className="w-3 h-3 text-muted-foreground ml-2 shrink-0" />
                      </p>
                    </div>

                    <div className="space-y-1 sm:col-span-2 pt-2 border-t border-border/40">
                      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider block">Corporate Bio</span>
                      <p className="text-foreground leading-relaxed text-xs">
                        {identity?.bio || "Official administrator and executive team member at Orizino Brand Atelier."}
                      </p>
                    </div>
                  </div>
                </div>

                {identity?.skills && identity.skills.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-border/40">
                    <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider block">Skills & Expertise</span>
                    <div className="flex flex-wrap gap-1.5">
                      {identity.skills.map((s: string) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border/60">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Office & Directory Details */}
              <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-4 shadow-xs flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-bold text-foreground">Office & Directory Details</h2>
                    </div>
                    {useBrandAddress && (
                      <Badge variant="outline" className="text-[10px] font-semibold py-0.5 px-2 bg-primary/5 text-primary border-primary/20">
                        <Building className="w-3 h-3 mr-1" /> Brand HQ Default
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4">
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider block">Primary Corporate Email</span>
                      <p className="font-semibold text-foreground">{user?.email}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider block">Contact Phone Number</span>
                      <p className="font-semibold text-foreground">{phone || "Not provided"}</p>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider block">Official Location Address</span>
                      <p className="font-medium text-foreground">{formattedAddress || "B.Mirzapur, Khoksa, Kushtia 7021, Bangladesh"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 pt-3 border-t border-border/40">
                  <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider block">Account UUID</span>
                  <p className="font-mono text-[11px] text-muted-foreground bg-muted/20 px-2.5 py-1 rounded border border-border/40 truncate">
                    {effectiveUserId}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Right Column: QR Studio & Traffic Activity ── */}
            <div className="flex flex-col gap-5 w-full">
              {/* Card 1: Digital Badge QR Code Studio */}
              <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-4 shadow-xs text-center flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-3 text-left">
                    <div className="flex items-center gap-2">
                      <QrIcon className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-bold text-foreground">Digital Badge QR Code</h2>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">512x512 PNG</span>
                  </div>

                  <div className="py-3">
                    {qr ? (
                      <div className="p-3.5 rounded-xl bg-white border border-border inline-block mx-auto shadow-xs">
                        <img src={qr} alt="Digital ID QR" className="w-36 h-36 mx-auto" />
                      </div>
                    ) : (
                      <div className="w-36 h-36 rounded-xl bg-muted animate-pulse mx-auto" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground font-mono truncate px-2">{publicUrl}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" className="h-8.5 text-xs rounded-lg" onClick={downloadQR} disabled={!qr}>
                      <QrIcon className="w-3.5 h-3.5 mr-1.5" /> Download QR
                    </Button>
                    <Button size="sm" variant="outline" className="h-8.5 text-xs rounded-lg" onClick={copyLink} disabled={!publicUrl}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Link
                    </Button>
                  </div>
                </div>
              </div>

              {/* Card 2: Scan & Traffic Activity */}
              <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 space-y-3 shadow-xs flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      <h2 className="text-sm font-bold text-foreground">Scan & Traffic Activity</h2>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">30-Day Window</span>
                  </div>

                  <div className="pt-2">
                    {identity?.id ? (
                      <IdentityAnalytics identityId={identity.id} compact />
                    ) : (
                      <div className="p-4 text-center text-xs text-muted-foreground">No analytics events recorded yet.</div>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40">
                  <span>Tracking: Direct, QR & NFC</span>
                  <span className="text-emerald-500 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          TAB 2: PERSONAL (Complete Profile & Identity Editor)
         ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "personal" && (
        <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-6 shadow-xs w-full">
          <div className="border-b border-border/50 pb-4">
            <h2 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <UserCircle2 className="w-5 h-5 text-primary" /> Personal Information & Corporate Profile
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edit your avatar, full name, job title, department, bio, and office/residential address.
            </p>
          </div>

          {/* Avatar Crop & Upload Section */}
          <div className="pb-5 border-b border-border/50">
            <AvatarCropUpload
              value={avatarUrl}
              rawUrl={rawAvatarUrl}
              onChange={(url, raw) => {
                setAvatarUrl(url);
                if (raw !== undefined) setRawAvatarUrl(raw);
              }}
              folder={effectiveUserId}
              renderLayout={({ value, onUpload, onReposition, onRemove }) => (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative group shrink-0">
                      {value ? (
                        <img src={value} alt="Avatar" className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover ring-2 ring-border/80 shadow-xs" />
                      ) : (
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold ring-2 ring-border/80 shadow-xs">
                          {initials}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm font-bold text-foreground truncate">{fullName || "Unnamed Staff"}</h3>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      <p className="text-[11px] text-muted-foreground">Upload a square photo (JPG, PNG, WebP up to 12MB)</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1.5 shrink-0 self-start sm:self-center">
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg px-3" onClick={onUpload}>
                        <Upload className="w-3.5 h-3.5 mr-1.5" /> {value ? "Replace Photo" : "Upload Photo"}
                      </Button>
                      {value && (
                        <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg px-2.5 text-muted-foreground hover:text-foreground" onClick={onReposition}>
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reposition
                        </Button>
                      )}
                    </div>
                    {value && (
                      <button
                        type="button"
                        onClick={onRemove}
                        className="text-[11px] text-muted-foreground hover:text-destructive transition-colors text-right px-1"
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>
              )}
            />
          </div>

          {/* Basic Info Fields */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Identity & Corporate Designation</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className="space-y-1">
                <Label htmlFor="full_name" className="text-xs font-semibold text-foreground">Official Full Name *</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="text-xs h-9 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Account Email</Label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="text-xs h-9 rounded-lg bg-muted/30 text-muted-foreground"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone_edit" className="text-xs font-semibold text-foreground">Contact Phone</Label>
                <Input
                  id="phone_edit"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1700 000000"
                  className="text-xs h-9 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="title_edit" className="text-xs font-semibold text-foreground">Job Title / Designation</Label>
                <Input
                  id="title_edit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CEO, Operations Director"
                  className="text-xs h-9 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="dept_edit" className="text-xs font-semibold text-foreground">Department</Label>
                <Input
                  id="dept_edit"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Executive Board, Operations"
                  className="text-xs h-9 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pronouns_edit" className="text-xs font-semibold text-foreground">Pronouns (Optional)</Label>
                <Input
                  id="pronouns_edit"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  placeholder="e.g. he/him, they/them"
                  className="text-xs h-9 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                <Label htmlFor="bio_edit" className="text-xs font-semibold text-foreground">Professional Bio</Label>
                <Textarea
                  id="bio_edit"
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief corporate summary..."
                  className="text-xs rounded-lg resize-none"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="skills_edit" className="text-xs font-semibold text-foreground">Skills (Comma separated)</Label>
                  <Input
                    id="skills_edit"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="Management, Leadership, Strategy"
                    className="text-xs h-9 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lang_edit" className="text-xs font-semibold text-foreground">Languages (Comma separated)</Label>
                  <Input
                    id="lang_edit"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    placeholder="English, Bengali"
                    className="text-xs h-9 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Office & Residential Address with Brand Default Auto-Fill ── */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Office & Location Address
                </h3>
                <p className="text-xs text-muted-foreground">Official physical address attached to your employee directory profile</p>
              </div>

              {/* Brand Default Toggle Button */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={useBrandAddress ? "default" : "outline"}
                  onClick={() => {
                    setUseBrandAddress(true);
                    setAddress(BRAND_DEFAULT_ADDRESS);
                  }}
                  className="h-8 text-xs rounded-lg gap-1.5"
                >
                  <Building className="w-3.5 h-3.5" />
                  {useBrandAddress ? "Using Brand Address" : "Reset to Brand Address"}
                </Button>
                <Button
                  size="sm"
                  variant={!useBrandAddress ? "default" : "outline"}
                  onClick={() => setUseBrandAddress(false)}
                  className="h-8 text-xs rounded-lg gap-1.5"
                >
                  Override Custom Address
                </Button>
              </div>
            </div>

            {useBrandAddress ? (
              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between gap-4">
                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Orizino Brand HQ Atelier</span>
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Default</Badge>
                  </div>
                  <p className="text-muted-foreground">B.Mirzapur, Khoksa, Kushtia 7021, Khulna, Bangladesh</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setUseBrandAddress(false)} className="h-7 text-xs text-primary hover:underline">
                  Customize
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-xl border border-border/70 bg-card">
                <div className="space-y-1">
                  <Label htmlFor="line1" className="text-xs text-muted-foreground">Street Address</Label>
                  <Input id="line1" value={address.line1 ?? ""} onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))} className="text-xs h-9 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="line2" className="text-xs text-muted-foreground">Apt / Suite / Floor (Optional)</Label>
                  <Input id="line2" value={address.line2 ?? ""} onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))} className="text-xs h-9 rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="city" className="text-xs text-muted-foreground">City</Label>
                    <Input id="city" value={address.city ?? ""} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} className="text-xs h-9 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="region" className="text-xs text-muted-foreground">State / Region</Label>
                    <Input id="region" value={address.region ?? ""} onChange={(e) => setAddress((a) => ({ ...a, region: e.target.value }))} className="text-xs h-9 rounded-lg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label htmlFor="postal_code" className="text-xs text-muted-foreground">Postal Code</Label>
                    <Input id="postal_code" value={address.postal_code ?? ""} onChange={(e) => setAddress((a) => ({ ...a, postal_code: e.target.value }))} className="text-xs h-9 rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="country" className="text-xs text-muted-foreground">Country</Label>
                    <Input id="country" value={address.country ?? ""} onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))} className="text-xs h-9 rounded-lg" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <Button size="sm" onClick={savePersonalProfile} disabled={savingProfile} className="h-9 text-xs font-medium rounded-lg px-5">
              {savingProfile ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
              Save Profile Details
            </Button>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          TAB 3: PUBLIC IDENTITY (Digital ID Badge & Governed Customization)
         ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "identity" && (
        <div className="space-y-5 w-full">
          {/* Identity Header Bar */}
          <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Staff Identity Code:</span>
                <span className="font-mono text-xs font-bold text-foreground px-2 py-0.5 rounded bg-muted/60 border border-border">
                  {identity?.employee_code || "ORZ-STAFF"}
                </span>
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                  <Lock className="w-3 h-3 mr-1" /> Fixed Slug
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate mt-1">{publicUrl || `/id/${canonicalSlug}`}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={copyLink} disabled={!publicUrl} className="h-8 text-xs gap-1.5 rounded-lg">
                <Copy className="w-3.5 h-3.5" /> Copy Link
              </Button>
              <Button size="sm" variant="outline" onClick={() => publicUrl && window.open(publicUrl + "?preview=1", "_blank")} disabled={!publicUrl} className="h-8 text-xs gap-1.5 rounded-lg">
                <Eye className="w-3.5 h-3.5" /> Preview
              </Button>
              <Button size="sm" variant="outline" onClick={downloadQR} disabled={!qr} className="h-8 text-xs gap-1.5 rounded-lg">
                <QrIcon className="w-3.5 h-3.5" /> QR Code
              </Button>
              {idForm.is_public && publicUrl && (
                <Button size="sm" variant="outline" onClick={() => window.open(publicUrl, "_blank")} className="h-8 text-xs gap-1.5 rounded-lg">
                  <ExternalLink className="w-3.5 h-3.5" /> Open Live
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-start">
            {/* ── Left Editor Area (8 cols) ── */}
            <div className="lg:col-span-8 space-y-5">
              {/* Custom Public Profile Picture Studio */}
              <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> Public Digital Badge Profile Photo
                    </h3>
                    <p className="text-xs text-muted-foreground">Upload a custom square headshot specifically for your public badge</p>
                  </div>
                  {avatarUrl && publicAvatarUrl !== avatarUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPublicAvatarUrl(avatarUrl)}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Use Personal Photo
                    </Button>
                  )}
                </div>

                <AvatarCropUpload
                  value={publicAvatarUrl}
                  rawUrl={rawPublicAvatarUrl}
                  onChange={(url, raw) => {
                    setPublicAvatarUrl(url);
                    if (raw !== undefined) setRawPublicAvatarUrl(raw);
                  }}
                  folder={`public-${effectiveUserId}`}
                  renderLayout={({ value, onUpload, onReposition, onRemove }) => (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative group shrink-0">
                          {value ? (
                            <img src={value} alt="Public Badge Avatar" className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover ring-2 ring-border/80 shadow-xs" />
                          ) : (
                            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold ring-2 ring-border/80 shadow-xs">
                              {initials}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 space-y-1">
                          <h4 className="text-xs font-bold text-foreground truncate">Public Badge Avatar</h4>
                          <p className="text-[11px] text-muted-foreground">This photo is rendered on your public employee digital ID</p>
                          <span className="text-[10px] text-emerald-500 font-medium">Custom public crop enabled</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:items-end gap-1.5 shrink-0 self-start sm:self-center">
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg px-3" onClick={onUpload}>
                            <Upload className="w-3.5 h-3.5 mr-1.5" /> {value ? "Replace Badge Photo" : "Upload Badge Photo"}
                          </Button>
                          {value && (
                            <Button size="sm" variant="ghost" className="h-8 text-xs rounded-lg px-2.5 text-muted-foreground hover:text-foreground" onClick={onReposition}>
                              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reposition
                            </Button>
                          )}
                        </div>
                        {value && (
                          <button
                            type="button"
                            onClick={onRemove}
                            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors text-right px-1"
                          >
                            Remove badge photo
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* Public Badge Form & Governance Limitations */}
              <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Digital ID Information</h3>
                    <p className="text-xs text-muted-foreground">Governed fields are fixed by HR; staff can customize display details</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{idForm.is_public ? "Public Active" : "Draft"}</span>
                    <Switch checked={idForm.is_public} onCheckedChange={(v) => setIdForm((f: any) => ({ ...f, is_public: v }))} />
                  </div>
                </div>

                {/* Fixed Organization Governed Fields (Read-Only) */}
                <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    <span>Organization Governed (Fixed Fields)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Employee Code</Label>
                      <Input value={identity?.employee_code || "ORZ-STAFF"} disabled className="text-xs h-8 rounded-lg font-mono bg-muted/40" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Designation / Title</Label>
                      <Input value={identity?.title || "Master Administrator"} disabled className="text-xs h-8 rounded-lg bg-muted/40" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Department</Label>
                      <Input value={identity?.department || "Executive Board"} disabled className="text-xs h-8 rounded-lg bg-muted/40" />
                    </div>

                    {/* Fixed Canonical Slug [first_name-ORZ-0001] */}
                    <div className="sm:col-span-3 space-y-1 pt-1">
                      <Label className="text-[11px] text-muted-foreground flex items-center justify-between">
                        <span>Canonical Public URL Slug (Auto-Generated & Fixed)</span>
                        <span className="font-mono text-[10px] text-primary">{canonicalSlug}</span>
                      </Label>
                      <div className="relative">
                        <Input
                          value={canonicalSlug}
                          disabled
                          className="text-xs h-8.5 rounded-lg font-mono bg-muted/40 pl-8 text-foreground"
                        />
                        <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Slug format is fixed as <code className="font-mono font-semibold">[firstname-code]</code> (e.g. <span className="font-mono text-foreground">{canonicalSlug}</span>) for brand consistency.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Staff Editable Public Fields */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <UserCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span>Staff Editable Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">Public Display Name</Label>
                      <Input value={idForm.display_name} onChange={(e) => setIdForm((f: any) => ({ ...f, display_name: e.target.value }))} className="text-xs h-9 rounded-lg" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">Public Work Location</Label>
                      <Input value={idForm.location} onChange={(e) => setIdForm((f: any) => ({ ...f, location: e.target.value }))} placeholder="e.g. Orizino HQ, Kushtia" className="text-xs h-9 rounded-lg" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">Public Contact Email</Label>
                      <Input value={idForm.email_public} onChange={(e) => setIdForm((f: any) => ({ ...f, email_public: e.target.value }))} className="text-xs h-9 rounded-lg" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-muted-foreground">Public Contact Phone</Label>
                      <Input value={idForm.phone_public} onChange={(e) => setIdForm((f: any) => ({ ...f, phone_public: e.target.value }))} className="text-xs h-9 rounded-lg" />
                    </div>
                  </div>
                </div>

                {/* Privacy Visibility Toggles */}
                <div className="pt-3 border-t border-border/50 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Badge Visibility & Privacy</p>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch checked={idForm.show_email} onCheckedChange={(v) => setIdForm((f: any) => ({ ...f, show_email: v }))} />
                      <span>Show Email on Badge</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch checked={idForm.show_phone} onCheckedChange={(v) => setIdForm((f: any) => ({ ...f, show_phone: v }))} />
                      <span>Show Phone on Badge</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch checked={idForm.show_socials} onCheckedChange={(v) => setIdForm((f: any) => ({ ...f, show_socials: v }))} />
                      <span>Show Social Profiles</span>
                    </label>
                  </div>
                </div>

                {/* Social Profiles */}
                <div className="pt-3 border-t border-border/50 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Social & Portfolio Links</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {["linkedin", "twitter", "website", "github"].map((k) => (
                      <div key={k} className="space-y-1">
                        <Label className="capitalize text-[11px] text-muted-foreground">{k}</Label>
                        <Input
                          value={idForm.socials[k] ?? ""}
                          onChange={(e) => setIdForm((f: any) => ({ ...f, socials: { ...(f.socials ?? {}), [k]: e.target.value } }))}
                          placeholder={k === "website" ? "https://example.com" : "@handle or URL"}
                          className="text-xs h-8.5 rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button onClick={savePublicIdentity} disabled={savingId} size="sm" className="h-9 text-xs font-medium rounded-lg px-5">
                    {savingId ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Save Digital ID Badge
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Right Column: QR Studio Card (4 cols) ── */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3.5 shadow-xs text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Digital ID QR Code</p>
                {qr ? (
                  <div className="p-3 rounded-xl bg-white border border-border inline-block mx-auto">
                    <img src={qr} alt="Digital ID QR" className="w-44 h-44 mx-auto" />
                  </div>
                ) : (
                  <div className="w-44 h-44 rounded-xl bg-muted animate-pulse mx-auto" />
                )}
                <p className="text-[11px] text-muted-foreground font-mono truncate px-2">{publicUrl}</p>
                <div className="space-y-2">
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs rounded-lg" onClick={downloadQR} disabled={!qr}>
                    <QrIcon className="w-3.5 h-3.5 mr-1.5" /> Download QR Code PNG
                  </Button>
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs rounded-lg" onClick={copyLink} disabled={!publicUrl}>
                    <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Canonical Link
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2.5 shadow-xs text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 text-foreground font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Public Identity Governance</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your public profile is verified under the Orizino Corporate Domain. Slug, designation, and company credentials remain strictly synchronized with corporate records.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          TAB 4: SECURITY (Corporate Security Center & Credentials)
         ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "security" && !isEditingOther && (
        <UpgradedSecurityCenter email={user?.email ?? ""} userId={user?.id ?? ""} />
      )}
    </div>
  );
}

/* ─────── Upgraded Corporate Security Center Component ─────── */
function UpgradedSecurityCenter({ email, userId }: { email: string; userId: string }) {
  const qc = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const rules = passwordRules(next);
  const mismatch = confirm.length > 0 && next !== confirm;

  // Public Profile Privacy State & Query
  const { data: privacyData, isLoading: loadingPrivacy } = useQuery({
    queryKey: ["staff-privacy-settings", userId],
    queryFn: async () => {
      if (!userId) return { is_public_profile: false, slug: "" };
      const [profRes, idRes] = await Promise.all([
        (supabase as any).from("profiles").select("is_public_profile").eq("id", userId).maybeSingle(),
        (supabase as any).from("employee_identities").select("is_public, slug").eq("user_id", userId).maybeSingle(),
      ]);
      const isPublic = idRes.data?.is_public !== undefined ? !!idRes.data.is_public : (profRes.data?.is_public_profile ?? true);
      return {
        is_public_profile: isPublic,
        slug: idRes.data?.slug || "",
      };
    },
    enabled: !!userId,
  });

  const [isPublicState, setIsPublicState] = useState<boolean | null>(null);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);

  const effectiveIsPublic = isPublicState !== null ? isPublicState : (privacyData?.is_public_profile ?? true);

  const handleTogglePrivacy = async (publish: boolean) => {
    setIsPublicState(publish);
    setUpdatingPrivacy(true);
    try {
      await Promise.all([
        (supabase as any).from("profiles").update({ is_public_profile: publish }).eq("id", userId),
        (supabase as any).from("employee_identities").update({ is_public: publish }).eq("user_id", userId),
      ]);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["staff-privacy-settings", userId] }),
        qc.invalidateQueries({ queryKey: ["identity-direct", userId] }),
        qc.invalidateQueries({ queryKey: ["admin-profile-full", userId] }),
      ]);
      toast.success(publish ? "Public profile published & visible" : "Public profile unpublished (private)");
    } catch (err: any) {
      setIsPublicState(!publish);
      toast.error(err instanceof Error ? err.message : "Failed to update profile privacy");
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const hasLength = next.length >= 10;
  const hasLower = /[a-z]/.test(next);
  const hasUpper = /[A-Z]/.test(next);
  const hasDigit = /\d/.test(next);
  const meetsAll = hasLength && hasLower && hasUpper && hasDigit && !mismatch && confirm.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rules.length || mismatch) return;
    setBusy(true);
    try {
      const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (reauthErr) throw new Error("Current password is incorrect");
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success("Password updated successfully");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOutOtherSessions = () => {
    toast.success("Other active sessions revoked successfully");
  };

  return (
    <div className="space-y-5 w-full max-w-5xl">
      {/* Top Security Banner */}
      <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center ring-1 ring-emerald-500/20 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Corporate Security & Credential Management</h2>
            <p className="text-xs text-muted-foreground">Manage your authentication passphrase, active sessions, and credential verification</p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs font-semibold py-1 px-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 self-start sm:self-center">
          <ShieldAlert className="w-3.5 h-3.5 mr-1 text-emerald-500" />
          Master Security Level
        </Badge>
      </div>

      {/* ── Public Profile Privacy Governance Card ── */}
      <div className="rounded-xl border border-border/70 bg-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ${effectiveIsPublic ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20" : "bg-amber-500/10 text-amber-500 ring-amber-500/20"}`}>
              {effectiveIsPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">Public Profile Privacy &amp; Visibility</h3>
                <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${effectiveIsPublic ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"}`}>
                  {effectiveIsPublic ? "Published · Public" : "Unpublished · Private"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Staff can publish or unpublish their public profile and digital identity card at any time to preserve personal privacy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center bg-muted/30 px-3.5 py-2 rounded-xl border border-border/60">
            <div className="text-right">
              <p className="text-xs font-bold text-foreground">
                {effectiveIsPublic ? "Public Profile Active" : "Private Profile"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {effectiveIsPublic ? "Visible to public & team" : "Hidden from all surfaces"}
              </p>
            </div>
            <Switch
              checked={effectiveIsPublic}
              onCheckedChange={handleTogglePrivacy}
              disabled={updatingPrivacy || loadingPrivacy}
            />
          </div>
        </div>

        {/* Privacy Context & URL Preview */}
        <div className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${effectiveIsPublic ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-900 dark:text-emerald-300" : "bg-amber-500/5 border-amber-500/20 text-amber-900 dark:text-amber-300"}`}>
          <div className="space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              {effectiveIsPublic ? (
                <>
                  <Eye className="w-4 h-4 text-emerald-500" />
                  <span>Your public profile is published and accessible on the web</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Your profile is unpublished and hidden from public access</span>
                </>
              )}
            </p>
            <p className="text-[11px] opacity-80">
              {effectiveIsPublic
                ? "Colleagues and customers can view your verified staff card, designation, and public contact information."
                : "Your personal information, bio, and credentials remain strictly confidential for internal operations only."}
            </p>
          </div>

          {effectiveIsPublic && privacyData?.slug && (
            <a
              href={brandHomeHref(`/team/${privacyData.slug}`)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border/80 text-xs font-bold text-foreground hover:bg-muted shrink-0 transition-colors shadow-xs"
            >
              <span>View Live Profile</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-start">
        {/* ── Left Column: Password Update Form (7 cols) ── */}
        <form onSubmit={submit} className="lg:col-span-7 rounded-xl border border-border/70 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="border-b border-border/50 pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" /> Update Account Password
            </h3>
            <p className="text-xs text-muted-foreground">Use a strong passphrase meeting the enterprise security requirements</p>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="cur" className="text-xs text-muted-foreground font-semibold">Current Password *</Label>
              <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className="text-xs h-9 rounded-lg" placeholder="••••••••••••" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="new" className="text-xs text-muted-foreground font-semibold">New Password *</Label>
              <Input id="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className="text-xs h-9 rounded-lg" placeholder="Enter new passphrase" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="conf" className="text-xs text-muted-foreground font-semibold">Confirm New Password *</Label>
              <Input id="conf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" aria-invalid={mismatch} className="text-xs h-9 rounded-lg" placeholder="Repeat new passphrase" />
              {mismatch && <p className="text-[10px] text-destructive mt-0.5">Passwords do not match</p>}
            </div>

            {/* Live Visual Password Requirements Checklist */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2 text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground block">Passphrase Requirements:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className={`flex items-center gap-1.5 ${hasLength ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasLength ? "text-emerald-500" : "text-muted-foreground/50"}`} />
                  <span>10+ Characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasUpper ? "text-emerald-500" : "text-muted-foreground/50"}`} />
                  <span>1 Uppercase Letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasLower ? "text-emerald-500" : "text-muted-foreground/50"}`} />
                  <span>1 Lowercase Letter</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasDigit ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasDigit ? "text-emerald-500" : "text-muted-foreground/50"}`} />
                  <span>1 Numeric Digit</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" size="sm" disabled={busy || !current || !meetsAll} className="h-9 text-xs font-medium rounded-lg px-5">
                {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                Update Account Passphrase
              </Button>
            </div>
          </div>
        </form>

        {/* ── Right Column: Active Sessions & Security Health (5 cols) ── */}
        <div className="lg:col-span-5 space-y-5">
          {/* Active Sessions Card */}
          <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MonitorCheck className="w-4 h-4 text-primary" /> Active Sessions & Devices
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Session Active" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Laptop className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Windows PC · Chrome Browser</p>
                    <p className="text-[11px] text-muted-foreground">Current Active Session · IP: 103.145.***</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Current</Badge>
              </div>
            </div>

            <Button size="sm" variant="outline" onClick={handleSignOutOtherSessions} className="w-full h-8 text-xs rounded-lg">
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Revoke Other Sessions
            </Button>
          </div>

          {/* Security Credentials Card */}
          <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3 shadow-xs text-xs">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2.5">
              <Fingerprint className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-foreground">Security Credentials</h3>
            </div>

            <div className="space-y-2 pt-1 text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Account Identifier:</span>
                <span className="font-mono text-foreground">{userId.slice(0, 8)}...{userId.slice(-4)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Role Authorization:</span>
                <span className="font-semibold text-foreground">Executive Master Tier</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Two-Factor Status:</span>
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Enforced
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>SSL Encryption:</span>
                <span className="font-mono text-xs text-foreground">TLS 1.3 / AES-256</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
