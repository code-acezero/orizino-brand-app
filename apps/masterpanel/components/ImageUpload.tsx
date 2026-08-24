"use client";
import { optimizeImageForUpload } from "@/lib/image-optimizer";
import React, { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "@/lib/app-toast";

interface ImageUploadProps {
  bucket: string;
  folder?: string;
  value?: string;
  onUploaded: (url: string) => void;
  className?: string;
  accept?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  bucket,
  folder = "",
  value,
  onUploaded,
  className = "",
  accept = "image/*,video/*,video/mp4,video/webm,video/quicktime",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (rawFile: File) => {
    setUploading(true);
    const file = await optimizeImageForUpload(rawFile);
    const ext = file.name.split(".").pop();
    const path = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    try {
      // Try upload
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        // If bucket doesn't exist or permission denied, try 'site-assets' bucket as fallback
        if (error.message?.includes("not found") || error.message?.includes("Bucket") || error.statusCode === "404") {
          const fallbackPath = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: fallbackError } = await supabase.storage.from("site-assets").upload(fallbackPath, file, {
            cacheControl: "3600",
            upsert: false,
          });
          if (fallbackError) {
            // Last resort: convert to base64 data URL
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target?.result as string;
              if (dataUrl) {
                onUploaded(dataUrl);
                toast.success("Image loaded (local)");
              }
            };
            reader.readAsDataURL(file);
            setUploading(false);
            return;
          }
          const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(fallbackPath);
          onUploaded(urlData.publicUrl);
          setUploading(false);
          toast.success("Image uploaded");
          return;
        }

        toast.error("Upload failed: " + error.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(urlData.publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      // Fallback: use data URL if all storage fails
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          onUploaded(dataUrl);
          toast.success("Image loaded (local)");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    // Reset input so re-uploading the same file works
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={`relative ${className}`}>
      {value ? (
        <div className="relative group">
          {value.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i) || value.startsWith("data:video/") ? (
            <video
              src={value}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-32 object-cover rounded-xl border border-border bg-black"
            />
          ) : (
            <img
              src={value}
              alt="Preview"
              className="w-full h-32 object-cover rounded-xl border border-border"
            />
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="p-2 rounded-full bg-primary text-primary-foreground"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onUploaded("")}
              className="p-2 rounded-full bg-destructive text-destructive-foreground"
            >
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
          {uploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Upload className="w-6 h-6" />
              <span className="text-xs">Click to upload</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;
// code:4ce0
