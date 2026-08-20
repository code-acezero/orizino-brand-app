"use client";
import React, { useCallback, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { Upload, X, Loader2, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface Props {
  value?: string | null;
  rawUrl?: string | null;
  onChange: (url: string, rawUrl?: string) => void;
  bucket?: string;
  folder?: string;
  size?: number; // output px, default 512
  renderLayout?: (props: {
    value?: string | null;
    onUpload: () => void;
    onReposition: () => void;
    onRemove: () => void;
  }) => React.ReactNode;
}

async function cropToBlob(
  imageSrc: string,
  area: { x: number; y: number; width: number; height: number },
  size: number
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), "image/webp", 0.9)
  );
}

const AvatarCropUpload: React.FC<Props> = ({
  value,
  rawUrl,
  onChange,
  bucket = "avatars",
  folder,
  size = 512,
  renderLayout,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_c: any, pixels: any) => setArea(pixels), []);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 12 * 1024 * 1024) {
      toast.error("Image is larger than 12 MB");
      return;
    }
    setRawFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setImageSrc(ev.target?.result as string);
    reader.readAsDataURL(f);
    if (inputRef.current) inputRef.current.value = "";
  };

  const startReposition = () => {
    const srcToUse = rawUrl || value;
    if (!srcToUse) {
      inputRef.current?.click();
      return;
    }
    setImageSrc(srcToUse);
  };

  const cancel = () => {
    setImageSrc(null);
    setRawFile(null);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    setArea(null);
  };

  const save = async () => {
    if (!imageSrc || !area) return;
    setSaving(true);
    try {
      let finalRawUrl = rawUrl || null;

      // 1. Upload uncropped original photo if a new file was chosen
      if (rawFile) {
        const ext = rawFile.name.split(".").pop() || "jpg";
        const rawPath = `${folder ? folder + "/" : ""}raw_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: rawErr } = await supabase.storage.from(bucket).upload(rawPath, rawFile, {
          cacheControl: "31536000",
          upsert: false,
          contentType: rawFile.type,
        });
        if (!rawErr) {
          const { data: rawData } = supabase.storage.from(bucket).getPublicUrl(rawPath);
          finalRawUrl = rawData.publicUrl;
        }
      }

      // 2. Generate and upload cropped 512x512 WebP avatar
      const blob = await cropToBlob(imageSrc, area, size);
      const croppedPath = `${folder ? folder + "/" : ""}avatar_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
      const { error } = await supabase.storage.from(bucket).upload(croppedPath, blob, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/webp",
      });
      if (error) throw new Error(error.message);

      const { data } = supabase.storage.from(bucket).getPublicUrl(croppedPath);
      onChange(data.publicUrl, finalRawUrl || undefined);
      toast.success("Avatar updated");
      cancel();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {imageSrc ? (
        <div className="space-y-3">
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black/80">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={0.5}
              maxZoom={4}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="flex items-center gap-3 px-1">
            <RotateCcw className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={0.5}
              max={4}
              step={0.02}
              onValueChange={(v) => setZoom(v[0])}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Save avatar
            </Button>
            <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      ) : renderLayout ? (
        <>
          {renderLayout({
            value,
            onUpload: () => inputRef.current?.click(),
            onReposition: startReposition,
            onRemove: () => onChange("", ""),
          })}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
        </>
      ) : (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
          {value ? (
            <img src={value} alt="Avatar" className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover ring-1 ring-border/80 shadow-xs shrink-0" />
          ) : (
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground text-xs font-medium shrink-0">
              No Photo
            </div>
          )}
          <div className="flex flex-col gap-1.5 justify-center">
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" className="h-7.5 text-xs px-2.5 rounded-lg" onClick={() => inputRef.current?.click()}>
                <Upload className="w-3.5 h-3.5 mr-1.5" /> {value ? "Replace" : "Upload"}
              </Button>
              {value && (
                <Button size="sm" variant="ghost" className="h-7.5 text-xs px-2 rounded-lg text-muted-foreground hover:text-foreground" onClick={startReposition} title="Reposition">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reposition
                </Button>
              )}
            </div>
            {value && (
              <button
                type="button"
                onClick={() => onChange("", "")}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors text-left pl-1"
              >
                Remove photo
              </button>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
        </div>
      )}
    </div>
  );
};

export default AvatarCropUpload;
