"use client";
import React, { useState, useRef } from "react";
import { Star, Send, PackageCheck, ImagePlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const IMGBB_API_KEY = "ba66301b5419800417d1bfa691117307";
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";
const MAX_IMAGES = 5;

interface ReviewFormProps {
  productId: string;
}

async function uploadToImgBB(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", file);

  const res = await fetch(IMGBB_UPLOAD_URL, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || "Image upload failed");
  return data.data.display_url;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ productId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: hasDeliveredOrder, isLoading: checkingEligibility } = useQuery({
    queryKey: ["review-eligibility", user?.id, productId],
    queryFn: async () => {
      const { data: deliveredOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "delivered");
      if (!deliveredOrders || deliveredOrders.length === 0) return false;
      const orderIds = deliveredOrders.map((o) => o.id);
      const { data: items } = await supabase
        .from("order_items")
        .select("id")
        .in("order_id", orderIds)
        .eq("product_id", productId)
        .limit(1);
      return (items && items.length > 0) || false;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="rounded-2xl border border-border/50 p-5 bg-card/60 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Sign in to leave a review for this product.</p>
        <a href="/auth" className="rounded-full bg-primary text-primary-foreground font-semibold py-2 px-5 text-sm whitespace-nowrap shadow-sm hover:opacity-90 transition-opacity">
          Sign In
        </a>
      </div>
    );
  }

  if (checkingEligibility) return null;

  if (!hasDeliveredOrder) {
    return (
      <div className="rounded-2xl border border-border/50 p-5 bg-card/60 flex items-center gap-3 text-muted-foreground">
        <PackageCheck className="w-5 h-5 shrink-0 text-primary" />
        <p className="text-sm">You can write a review after your order has been delivered.</p>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = MAX_IMAGES - imageFiles.length;
    const validFiles = files.slice(0, remaining).filter((f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024);

    if (validFiles.length < files.length) {
      toast({ title: "Some files were skipped", description: `Max ${MAX_IMAGES} images, 5MB each.`, variant: "destructive" });
    }

    const newPreviews = validFiles.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    if (!comment.trim()) {
      toast({ title: "Please write a comment", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    // Upload images to imgbb
    let uploadedUrls: string[] = [];
    if (imageFiles.length > 0) {
      setUploading(true);
      try {
        uploadedUrls = await Promise.all(imageFiles.map(uploadToImgBB));
      } catch {
        toast({ title: "Failed to upload images", description: "Please try again.", variant: "destructive" });
        setSubmitting(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating,
      title: title.trim() || null,
      comment: comment.trim(),
      images: uploadedUrls.length > 0 ? uploadedUrls : [],
    } as any);

    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to submit review", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review submitted!", description: "It will appear after admin approval." });
      setRating(0);
      setTitle("");
      setComment("");
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImageFiles([]);
      setImagePreviews([]);
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <div className="rounded-2xl border border-border/50 p-5 bg-card/60">
      <h3 className="font-display font-semibold text-foreground text-lg mb-4">Write a Review</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating */}
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Your Rating</Label>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i + 1)}
                onMouseEnter={() => setHoveredRating(i + 1)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  className={`w-7 h-7 transition-colors ${
                    i < displayRating ? "fill-primary text-primary" : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
            {displayRating > 0 && (
              <span className="text-sm text-muted-foreground ml-2 self-center">{displayRating}/5</span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <Label htmlFor="review-title" className="text-sm text-muted-foreground">Title (optional)</Label>
          <Input
            id="review-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Summarize your experience"
            maxLength={100}
            className="mt-1 rounded-xl"
          />
        </div>

        {/* Comment */}
        <div>
          <Label htmlFor="review-comment" className="text-sm text-muted-foreground">Your Review</Label>
          <Textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What did you like or dislike about this product?"
            maxLength={1000}
            rows={4}
            className="mt-1 rounded-xl"
          />
        </div>

        {/* Image Upload */}
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">
            Photos (optional, max {MAX_IMAGES})
          </Label>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {imagePreviews.map((preview, i) => (
                <motion.div
                  key={preview}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="relative w-20 h-20 rounded-xl overflow-hidden group/img"
                >
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    <X className="w-5 h-5 text-destructive" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {imageFiles.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <ImagePlus className="w-5 h-5" />
                <span className="text-[10px]">Add</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-pill bg-gradient-primary text-primary-foreground font-semibold py-2.5 px-6 flex items-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              {uploading ? "Uploading photos..." : "Submitting..."}
            </div>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit Review
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
};

export default ReviewForm;
// code:4ce0
