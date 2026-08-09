"use client";
import React, { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2, Video as VideoIcon } from "lucide-react";
import { toast } from "@/lib/app-toast";

interface VideoUploadProps {
  bucket: string;
  folder?: string;
  value?: string;
  onUploaded: (url: string) => void;
  className?: string;
}

/** Direct video upload, mirroring ImageUpload's API and fallback behavior. */
const VideoUpload: React.FC<VideoUploadProps> = ({ bucket, folder = "", value, onUploaded, className = "" }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    try {
      const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) {
        toast.error("Upload failed: " + error.message);
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(urlData.publicUrl);
      toast.success("Video uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + (err?.message ?? "unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`relative ${className}`}>
      {value ? (
        <div className="relative group">
          <video src={value} className="w-full h-32 object-cover rounded-xl border border-border bg-black" muted loop playsInline />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} className="p-2 rounded-full bg-primary text-primary-foreground">
              <Upload className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => onUploaded("")} className="p-2 rounded-full bg-destructive text-destructive-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : (<><VideoIcon className="w-6 h-6" /><span className="text-xs">Click to upload video</span></>)}
        </button>
      )}
      <input ref={inputRef} type="file" accept="video/*" onChange={handleChange} className="hidden" />
    </div>
  );
};

export default VideoUpload;
// code:4ce0
