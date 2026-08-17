"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserCircle2, Mail, Phone, MapPin, Save, Loader2, ShieldCheck, LogOut, Clock,
  IdCard, KeyRound, Eye, ExternalLink, Copy, QrCode as QrIcon, CheckCircle2, CircleAlert, ArrowLeft,
} from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/components/AdminRoute";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "@/lib/app-toast";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { useServerFn } from "@/lib/server-fn-compat";
import { getMyIdentity, updateMyIdentity, getUserIdentityAdmin, updateUserIdentityAdmin } from "@/lib/employee-identity.functions";
import { submitProfileChangeRequest, listMyProfileChangeRequests } from "@/lib/identity-governance.functions";
import { IDENTITY_LAYOUT_PRESETS } from "@/lib/identity-presets";
import { themePalettes } from "@/lib/theme-palettes";
import PageHeader from "@/components/admin/PageHeader";
import IdentityAnalytics from "@/components/IdentityAnalytics";
import AvatarCropUpload from "@/components/AvatarCropUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface AddressJson {
  line1?: string; line2?: string; city?: string; region?: string; postal_code?: string; country?: string;
}
interface ProfileRow {
  id: string; full_name: string | null; avatar_url: string | null; phone: string | null;
  address: AddressJson | null; created_at: string; updated_at: string;
}

/* ─────── validation helpers ─────── */
const nameRe = /^.{2,80}$/;
const phoneRe = /^\+?[0-9\s\-().]{7,20}$/;
const passwordRules = (v: string) => {
  const issues: string[] = [];
  if (v.length < 10) issues.push("10+ characters");
  if (!/[a-z]/.test(v)) issues.push("a lowercase letter");
  if (!/[A-Z]/.test(v)) issues.push("an uppercase letter");
  if (!/\d/.test(v)) issues.push("a digit");
  return issues;
};

/* ─────── page ─────── */
const AdminProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const role = useAdminRole();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const targetUserId = searchParams.get("userId") || searchParams.get("targetId");
  const effectiveUserId = targetUserId || user?.id;
  const isEditingOther = !!targetUserId && targetUserId !== user?.id;

  useSeoMeta(
    isEditingOther ? "User Profile Mode (Leader Edit)" : "My Profile",
    "Manage admin profile, avatar, frames and contact details"
  );

  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState(initialTab ?? "overview");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("tab") === tab) return;
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  }, [tab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t && t !== tab) setTab(t);
    };
    window.addEventListener("popstate", onPop);
    const id = window.setInterval(() => {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t && t !== tab) setTab(t);
    }, 300);
    return () => { window.removeEventListener("popstate", onPop); window.clearInterval(id); };
  }, [tab]);

  /* ── personal ── */
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [rawAvatarUrl, setRawAvatarUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<AddressJson>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const { data: profile, isLoading } = useQuery({
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
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setPhone(profile.phone ?? "");
    setAddress((profile.address as AddressJson) ?? {});
  }, [profile]);

  const errors = {
    fullName: fullName && !nameRe.test(fullName) ? "2–80 characters" : "",
    phone: phone && !phoneRe.test(phone) ? "Enter a valid phone number" : "",
  };

  const initials = (fullName || user?.email || "AD").trim().slice(0, 2).toUpperCase();

  /* ── completeness ── */
  const completeness = useMemo(() => {
    const checks: Array<{ label: string; ok: boolean; goto?: string }> = [
      { label: "Avatar", ok: !!avatarUrl, goto: "overview" },
      { label: "Full name", ok: !!fullName && nameRe.test(fullName), goto: "overview" },
      { label: "Phone", ok: !!phone && phoneRe.test(phone), goto: "personal" },
      { label: "Street address", ok: !!address.line1, goto: "personal" },
      { label: "City", ok: !!address.city, goto: "personal" },
      { label: "Country", ok: !!address.country, goto: "personal" },
    ];
    const done = checks.filter((c) => c.ok).length;
    return { checks, done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
  }, [avatarUrl, fullName, phone, address]);

  const submitChangeReq = useServerFn(submitProfileChangeRequest);
  const fetchMyReqs = useServerFn(listMyProfileChangeRequests);
  const { data: myPendingReqs } = useQuery({
    queryKey: ["my-profile-change-requests", effectiveUserId],
    queryFn: () => fetchMyReqs(),
    enabled: !!effectiveUserId && role !== "admin" && role !== "moderator" && !isEditingOther,
  });
  const hasPendingReq = (myPendingReqs ?? []).some((r: any) => r.status === "pending");
  const isPrivileged = role === "admin" || role === "moderator" || isEditingOther;

  const saveProfile = async () => {
    if (!effectiveUserId) return;
    if (Object.values(errors).some(Boolean)) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSavingProfile(true);
    try {
      const changes: Record<string, any> = {
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        phone: phone.trim() || null,
        address: Object.values(address).some((v) => (v ?? "").toString().trim() !== "") ? address : null,
      };
      if (isPrivileged) {
        const payload = { id: effectiveUserId, ...changes, updated_at: new Date().toISOString() };
        const { error } = await supabase.from("profiles").upsert(payload as any, { onConflict: "id" });
        if (error) throw error;
        if (changes.full_name) {
          await ((supabase as any).from("employee_identities")).update({ display_name: changes.full_name }).eq("user_id", effectiveUserId);
        }
        toast.success(isEditingOther ? "User profile updated" : "Profile saved");
      } else {
        await submitChangeReq({ data: { changes } as any });
        toast.success("Change request submitted for approval");
        qc.invalidateQueries({ queryKey: ["my-profile-change-requests", effectiveUserId] });
      }
      qc.invalidateQueries({ queryKey: ["admin-profile-full", effectiveUserId] });
      qc.invalidateQueries({ queryKey: ["admin-profile", effectiveUserId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate("/auth");
  };

  const roleLabel =
    role === "admin" ? "Administrator" : role === "moderator" ? "Moderator" : role ? role : "Staff";
  const isStaff = !!role || isEditingOther;

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-5xl space-y-4">
      {/* Leader Mode Switcher Banner */}
      {isEditingOther && (
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5 font-medium">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="font-semibold text-foreground">User Profile Mode (Leader Mode Active)</p>
              <p className="text-xs text-muted-foreground">Editing user: <span className="font-mono text-foreground">{fullName || effectiveUserId}</span> with full administrative control</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/team/employees")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Employees
          </Button>
        </div>
      )}

      <PageHeader
        title={isEditingOther ? `User Profile — ${fullName || "Employee"}` : "My Profile"}
        description={isEditingOther ? "Managing full native user profile, avatar, privacy, and frames as Leader." : "Your account, public identity, and security."}
        icon={<UserCircle2 className="w-5 h-5" />}
        actions={
          !isEditingOther ? (
            <Button variant="outline" size="sm" onClick={handleSignOut} className="text-destructive hover:text-destructive">
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </Button>
          ) : (
            <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save changes
            </Button>
          )
        }
      />

      {hasPendingReq && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <CircleAlert className="w-4 h-4 shrink-0" />
          <span>You have a pending profile change request awaiting admin approval.</span>
        </div>
      )}

      {/* Completeness banner */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">Profile completeness</p>
            <p className="text-xs text-muted-foreground">{completeness.done} of {completeness.total} required fields filled</p>
          </div>
          <span
            className={`text-lg font-bold ${completeness.pct === 100 ? "text-green-500" : completeness.pct >= 60 ? "text-amber-500" : "text-destructive"}`}
          >
            {completeness.pct}%
          </span>
        </div>
        <Progress value={completeness.pct} className="h-2" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {completeness.checks.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => c.goto && setTab(c.goto)}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border transition-colors ${
                c.ok
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15"
              }`}
            >
              {c.ok ? <CheckCircle2 className="w-3 h-3" /> : <CircleAlert className="w-3 h-3" />}
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="md:hidden flex flex-wrap w-full h-auto justify-start gap-1 sticky top-0 z-10 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <TabsTrigger value="overview"><UserCircle2 className="w-4 h-4 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="personal"><MapPin className="w-4 h-4 mr-1.5" /> Personal</TabsTrigger>
          {isStaff && <TabsTrigger value="identity"><IdCard className="w-4 h-4 mr-1.5" /> Public identity</TabsTrigger>}
          {!isEditingOther && <TabsTrigger value="security"><KeyRound className="w-4 h-4 mr-1.5" /> Security</TabsTrigger>}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className="lg:col-span-1 rounded-2xl border border-border/60 bg-card p-5 flex flex-col items-center text-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover ring-2 ring-border/60" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center ring-2 ring-border/40">
                  <span className="text-2xl font-semibold text-primary-foreground">{initials}</span>
                </div>
              )}
              <div className="min-w-0 w-full">
                <p className="text-base font-semibold truncate">{fullName || "Unnamed"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> {isEditingOther ? "User Mode (Leader Edit)" : roleLabel}
              </div>
              {profile && (
                <div className="w-full pt-3 mt-1 border-t border-border/60 text-left space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Account
                  </p>
                  <p className="text-[11px] text-muted-foreground">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                  <p className="text-[11px] text-muted-foreground">Last update {new Date(profile.updated_at).toLocaleDateString()}</p>
                </div>
              )}
            </section>

            <section className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <UserCircle2 className="w-4 h-4 text-primary" /> Profile Photo & Basic Identity
              </h2>
              <div>
                <Label>Avatar Photo & Repositioning</Label>
                <AvatarCropUpload
                  value={avatarUrl}
                  rawUrl={rawAvatarUrl}
                  onChange={(url, raw) => {
                    setAvatarUrl(url);
                    if (raw !== undefined) setRawAvatarUrl(raw);
                  }}
                  folder={effectiveUserId}
                />
              </div>
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  aria-invalid={!!errors.fullName}
                />
                {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <Label>Account ID</Label>
                <div className="flex items-center h-10 px-3 rounded-md border border-border/60 bg-muted/40 text-sm text-muted-foreground gap-2 min-w-0 font-mono text-xs">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{effectiveUserId}</span>
                </div>
              </div>
              <div className="pt-2">
                <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Profile
                </Button>
              </div>
            </section>
          </div>
        </TabsContent>

        {/* Personal */}
        <TabsContent value="personal" className="mt-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" /> Contact Details
            </h2>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" aria-invalid={!!errors.phone} />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
            <h2 className="text-sm font-semibold flex items-center gap-2 pt-2">
              <MapPin className="w-4 h-4 text-primary" /> Address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="line1">Street address</Label>
                <Input id="line1" value={address.line1 ?? ""} onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="line2">Apt / Suite (optional)</Label>
                <Input id="line2" value={address.line2 ?? ""} onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))} />
              </div>
              <div><Label htmlFor="city">City</Label><Input id="city" value={address.city ?? ""} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} /></div>
              <div><Label htmlFor="region">State / Region</Label><Input id="region" value={address.region ?? ""} onChange={(e) => setAddress((a) => ({ ...a, region: e.target.value }))} /></div>
              <div><Label htmlFor="postal_code">Postal code</Label><Input id="postal_code" value={address.postal_code ?? ""} onChange={(e) => setAddress((a) => ({ ...a, postal_code: e.target.value }))} /></div>
              <div><Label htmlFor="country">Country</Label><Input id="country" value={address.country ?? ""} onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))} /></div>
            </div>
            <div className="pt-2">
              <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Personal Details
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Identity & Privacy */}
        {isStaff && (
          <TabsContent value="identity" className="mt-4">
            <IdentityEditor targetUserId={isEditingOther ? targetUserId : null} />
          </TabsContent>
        )}

        {/* Security */}
        {!isEditingOther && (
          <TabsContent value="security" className="mt-4">
            <ChangePasswordSection email={user?.email ?? ""} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

/* ─────── Change password ─────── */
const ChangePasswordSection: React.FC<{ email: string }> = ({ email }) => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const rules = passwordRules(next);
  const mismatch = confirm.length > 0 && next !== confirm;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rules.length || mismatch) return;
    setBusy(true);
    try {
      const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (reauthErr) throw new Error("Current password is incorrect");
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw error;
      toast.success("Password updated");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-primary" /> Change password
      </h2>
      <div>
        <Label htmlFor="cur">Current password</Label>
        <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      </div>
      <div>
        <Label htmlFor="new">New password</Label>
        <Input id="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        {next && rules.length > 0 && (
          <p className="text-xs text-destructive mt-1">Needs: {rules.join(", ")}</p>
        )}
      </div>
      <div>
        <Label htmlFor="conf">Confirm new password</Label>
        <Input id="conf" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" aria-invalid={mismatch} />
        {mismatch && <p className="text-xs text-destructive mt-1">Passwords don't match</p>}
      </div>
      <Button type="submit" size="sm" disabled={busy || !current || !next || !!rules.length || mismatch}>
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
        Update password
      </Button>
    </form>
  );
};

/* ─────── Public Identity & Privacy Editor ─────── */
const IdentityEditor: React.FC<{ targetUserId?: string | null }> = ({ targetUserId }) => {
  const qc = useQueryClient();
  const fetchMyIdentityFn = useServerFn(getMyIdentity);
  const saveMyIdentityFn = useServerFn(updateMyIdentity);
  const fetchAdminIdentityFn = useServerFn(getUserIdentityAdmin);
  const saveAdminIdentityFn = useServerFn(updateUserIdentityAdmin);

  const isOther = !!targetUserId;

  const { data: identity, isLoading } = useQuery({
    queryKey: ["identity", targetUserId || "me"],
    queryFn: () => (isOther ? fetchAdminIdentityFn({ data: { targetUserId } }) : fetchMyIdentityFn()),
  });

  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [qr, setQr] = useState<string>("");

  useEffect(() => {
    if (identity && !form) {
      setForm({
        slug: identity.slug,
        display_name: identity.display_name ?? "",
        title: identity.title ?? "",
        department: identity.department ?? "",
        bio: identity.bio ?? "",
        pronouns: identity.pronouns ?? "",
        avatar_url: identity.avatar_url ?? "",
        cover_url: identity.cover_url ?? "",
        accent_color: identity.accent_color ?? "#3B82F6",
        email_public: identity.email_public ?? "",
        phone_public: identity.phone_public ?? "",
        location: identity.location ?? "",
        socials: identity.socials ?? {},
        skills: (identity.skills ?? []).join(", "),
        languages: (identity.languages ?? []).join(", "),
        is_public: !!identity.is_public,
        show_email: !!identity.show_email,
        show_phone: !!identity.show_phone,
        show_socials: !!identity.show_socials,
        layout_preset: (identity as any).layout_preset ?? "classic",
        theme_preset: (identity as any).theme_preset ?? "system",
      });
    }
  }, [identity, form]);

  const publicUrl = useMemo(() => {
    if (!identity?.slug) return "";
    const companyOrigin = (typeof window !== "undefined" && (import.meta as any).env?.VITE_COMPANY_ORIGIN) || "";
    return companyOrigin ? `${companyOrigin}/id/${identity.slug}` : `/id/${identity.slug}`;
  }, [identity?.slug]);

  useEffect(() => {
    if (!publicUrl) return;
    QRCode.toDataURL(publicUrl, { width: 512, margin: 1 }).then(setQr).catch(() => {});
  }, [publicUrl]);

  if (isLoading || !form) {
    return <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">Loading user profile & identity…</div>;
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setSocial = (k: string, v: string) => setForm((f: any) => ({ ...f, socials: { ...(f.socials ?? {}), [k]: v } }));

  const save = async () => {
    setSaving(true);
    try {
      const payloadData = {
        slug: form.slug || undefined,
        display_name: form.display_name || null,
        title: form.title || null,
        department: form.department || null,
        bio: form.bio || null,
        pronouns: form.pronouns || null,
        avatar_url: form.avatar_url || null,
        cover_url: form.cover_url || null,
        accent_color: form.accent_color || null,
        email_public: form.email_public || null,
        phone_public: form.phone_public || null,
        location: form.location || null,
        socials: Object.fromEntries(Object.entries(form.socials ?? {}).filter(([, v]) => (v as string)?.trim())) as any,
        skills: form.skills.split(",").map((s: string) => s.trim()).filter(Boolean),
        languages: form.languages.split(",").map((s: string) => s.trim()).filter(Boolean),
        is_public: form.is_public,
        show_email: form.show_email,
        show_phone: form.show_phone,
        show_socials: form.show_socials,
        layout_preset: form.layout_preset || "classic",
        theme_preset: form.theme_preset || "system",
      };

      if (isOther && targetUserId) {
        await saveAdminIdentityFn({ data: { targetUserId, identityData: payloadData as any } });
      } else {
        await saveMyIdentityFn({ data: payloadData as any });
      }
      toast.success("User identity & profile settings saved");
      qc.invalidateQueries({ queryKey: ["identity", targetUserId || "me"] });
      qc.invalidateQueries({ queryKey: ["my-identity"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save identity");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied");
  };
  const downloadQR = () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `${identity!.employee_code}-qr.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Employee code</p>
            <p className="text-lg font-bold">{identity!.employee_code}</p>
            <p className="text-xs text-muted-foreground truncate">{publicUrl}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copyLink}><Copy className="w-4 h-4 mr-1.5" /> Copy link</Button>
            <Button size="sm" variant="outline" onClick={() => window.open(publicUrl + "?preview=1", "_blank")}>
              <Eye className="w-4 h-4 mr-1.5" /> Preview
            </Button>
            <Button size="sm" variant="outline" onClick={downloadQR}><QrIcon className="w-4 h-4 mr-1.5" /> QR</Button>
            {form.is_public && (
              <Button size="sm" variant="outline" onClick={() => window.open(publicUrl, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-1.5" /> Open
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Publish state & Privacy</p>
              <p className="text-xs text-muted-foreground">Control public profile visibility and data exposure.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{form.is_public ? "Published" : "Draft"}</span>
              <Switch checked={form.is_public} onCheckedChange={(v) => set("is_public", v)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label>Public avatar</Label>
              <AvatarCropUpload value={form.avatar_url} onChange={(v) => set("avatar_url", v)} folder={`identity/${identity!.user_id}`} />
            </div>
            <div><Label>Display name</Label><Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} /></div>
            <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} /></div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Senior Designer" /></div>
            <div><Label>Department</Label><Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Product" /></div>
            <div><Label>Pronouns</Label><Input value={form.pronouns} onChange={(e) => set("pronouns", e.target.value)} placeholder="she/her" /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label>Bio</Label><Textarea rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="A short bio…" /></div>
            <div><Label>Accent color & Frame Theme</Label><Input type="color" value={form.accent_color} onChange={(e) => set("accent_color", e.target.value)} /></div>
            <div><Label>Cover / Banner Image URL</Label><Input value={form.cover_url} onChange={(e) => set("cover_url", e.target.value)} /></div>
          </div>

          <div className="pt-2 border-t border-border/60">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Public Contact & Privacy Toggles</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Public email</Label><Input value={form.email_public} onChange={(e) => set("email_public", e.target.value)} /></div>
              <div><Label>Public phone</Label><Input value={form.phone_public} onChange={(e) => set("phone_public", e.target.value)} /></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-2"><Switch checked={form.show_email} onCheckedChange={(v) => set("show_email", v)} /> Show email</label>
              <label className="flex items-center gap-2"><Switch checked={form.show_phone} onCheckedChange={(v) => set("show_phone", v)} /> Show phone</label>
              <label className="flex items-center gap-2"><Switch checked={form.show_socials} onCheckedChange={(v) => set("show_socials", v)} /> Show socials</label>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Social Profiles</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["website","linkedin","twitter","instagram","github","whatsapp","telegram"].map((k) => (
                <div key={k}>
                  <Label className="capitalize">{k}</Label>
                  <Input value={form.socials[k] ?? ""} onChange={(e) => setSocial(k, e.target.value)} placeholder={k === "website" ? "example.com" : "@handle or URL"} />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-border/60">
            <div><Label>Skills (comma separated)</Label><Input value={form.skills} onChange={(e) => set("skills", e.target.value)} /></div>
            <div className="mt-3"><Label>Languages (comma separated)</Label><Input value={form.languages} onChange={(e) => set("languages", e.target.value)} /></div>
          </div>

          <div className="pt-4 border-t border-border/60 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Public Profile Layout</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {IDENTITY_LAYOUT_PRESETS.map((p) => {
                  const active = (form.layout_preset || "classic") === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => set("layout_preset", p.id)}
                      className={`text-left rounded-xl border p-3 transition-colors ${active ? "border-primary bg-primary/10" : "border-border/60 bg-card hover:bg-muted/40"}`}
                    >
                      <p className="text-xs font-semibold">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Theme Palette & Frame Styling</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => set("theme_preset", "system")}
                  className={`text-left rounded-xl border p-3 transition-colors ${(form.theme_preset || "system") === "system" ? "border-primary bg-primary/10" : "border-border/60 bg-card hover:bg-muted/40"}`}
                >
                  <div className="flex gap-1 mb-1.5">
                    {["hsl(var(--primary))","hsl(var(--accent))","hsl(var(--muted))","hsl(var(--card))"].map((c) => (
                      <span key={c} className="w-4 h-4 rounded-sm border border-border/40" style={{ background: c }} />
                    ))}
                  </div>
                  <p className="text-xs font-semibold">Follow system</p>
                  <p className="text-[10px] text-muted-foreground">Matches current brand theme.</p>
                </button>
                {themePalettes.map((t) => {
                  const active = form.theme_preset === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => set("theme_preset", t.id)}
                      className={`text-left rounded-xl border p-3 transition-colors ${active ? "border-primary bg-primary/10" : "border-border/60 bg-card hover:bg-muted/40"}`}
                    >
                      <div className="flex gap-1 mb-1.5">
                        {t.preview.slice(0, 4).map((c, i) => (
                          <span key={i} className="w-4 h-4 rounded-sm border border-border/40" style={{ background: c }} />
                        ))}
                      </div>
                      <p className="text-xs font-semibold truncate">{t.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={save} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save User Profile & Identity
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">QR Code</p>
          {qr ? <img src={qr} alt="QR" className="w-full rounded-xl bg-white p-2" /> : <div className="aspect-square rounded-xl bg-muted animate-pulse" />}
          <p className="text-[11px] text-muted-foreground break-all">{publicUrl}</p>
          <Button size="sm" variant="outline" className="w-full" onClick={downloadQR}><QrIcon className="w-4 h-4 mr-1.5" /> Download PNG</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="mb-3">
          <p className="text-sm font-semibold">Public Profile Analytics</p>
          <p className="text-xs text-muted-foreground">Views, QR scans, and top shared links · last 30 days</p>
        </div>
        <IdentityAnalytics identityId={identity!.id} compact />
      </div>
    </div>
  );
};

export default AdminProfile;
