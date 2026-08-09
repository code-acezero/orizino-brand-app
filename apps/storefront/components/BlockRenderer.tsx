"use client";
import React from "react";
import { Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import type { PageBlock } from "@/components/admin/PageBuilder";
import ProductCard from "@/components/ProductCard";

/* ── Individual Block Renderers ── */
const HeroBlock: React.FC<{ p: Record<string, any> }> = ({ p }) => (
  <section
    className={`relative py-20 px-6 rounded-3xl overflow-hidden text-${p.textAlign || "center"}`}
    style={p.bgImage ? { backgroundImage: `url(${p.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
  >
    {p.bgImage && <div className="absolute inset-0 bg-black/40 rounded-3xl" />}
    <div className="relative z-10 max-w-3xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">{p.title}</h1>
      {p.subtitle && <p className="text-lg text-muted-foreground mt-4">{p.subtitle}</p>}
      {p.buttonText && (
        <Link to={p.buttonLink || "/inventory"} className="inline-block mt-6 px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-medium hover:opacity-90 transition-opacity">
          {p.buttonText}
        </Link>
      )}
    </div>
  </section>
);

const TextBlock: React.FC<{ p: Record<string, any> }> = ({ p }) => {
  const sizeClass = p.size === "sm" ? "text-sm" : p.size === "lg" ? "text-lg" : p.size === "xl" ? "text-xl" : "text-base";
  return (
    <div className={`text-${p.align || "left"}`}>
      {p.heading && <h2 className="text-2xl font-display font-bold text-foreground mb-3">{p.heading}</h2>}
      <p className={`${sizeClass} text-muted-foreground leading-relaxed`}>{p.body}</p>
    </div>
  );
};

const ImageBlock: React.FC<{ p: Record<string, any> }> = ({ p }) =>
  p.url ? (
    <figure>
      <img src={p.url} alt={p.alt || ""} className={`w-full object-cover ${p.rounded ? "rounded-2xl" : ""}`} loading="lazy" />
      {p.caption && <figcaption className="text-sm text-muted-foreground mt-2 text-center">{p.caption}</figcaption>}
    </figure>
  ) : null;

const CTABlock: React.FC<{ p: Record<string, any> }> = ({ p }) => (
  <section className="py-12 px-8 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 text-center">
    <h2 className="text-2xl font-display font-bold text-foreground">{p.title}</h2>
    {p.subtitle && <p className="text-muted-foreground mt-2">{p.subtitle}</p>}
    <Link to={p.buttonLink || "/inventory"} className="inline-block mt-6 px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-medium hover:opacity-90 transition-opacity">
      {p.buttonText}
    </Link>
  </section>
);

const TestimonialBlock: React.FC<{ p: Record<string, any> }> = ({ p }) => (
  <blockquote className="py-8 px-6 bg-secondary/30 rounded-3xl text-center">
    <p className="text-lg italic text-foreground">"{p.quote}"</p>
    <div className="mt-4">
      <span className="font-medium text-foreground">{p.author}</span>
      {p.role && <span className="text-muted-foreground text-sm"> · {p.role}</span>}
    </div>
  </blockquote>
);

const FeatureGrid: React.FC<{ p: Record<string, any> }> = ({ p }) => (
  <div className={`grid grid-cols-2 md:grid-cols-3 gap-6`}>
    {(p.items || []).map((f: any, i: number) => (
      <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
        className="text-center p-6 rounded-2xl bg-secondary/30 border border-border/30">
        <span className="text-3xl block mb-3">{f.icon}</span>
        <h3 className="font-display font-bold text-foreground">{f.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
      </motion.div>
    ))}
  </div>
);

const VideoBlock: React.FC<{ p: Record<string, any> }> = ({ p }) => {
  if (!p.url) return null;
  const embedUrl = p.url.includes("youtube.com/watch")
    ? p.url.replace("watch?v=", "embed/")
    : p.url.includes("youtu.be/")
    ? `https://www.youtube.com/embed/${p.url.split("youtu.be/")[1]}`
    : p.url;
  return (
    <div className="aspect-video rounded-2xl overflow-hidden">
      <iframe src={embedUrl} title={p.title || "Video"} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media" loading="lazy" />
    </div>
  );
};

const ProductGridBlock: React.FC<{ p: Record<string, any> }> = ({ p }) => {
  const { data: products = [] } = useQuery({
    queryKey: ["block-products", p.featured, p.count],
    queryFn: async () => {
      let q = supabase.from("products").select("*").eq("is_active", true);
      if (p.featured) q = q.eq("is_featured", true);
      const { data } = await q.limit(p.count || 4).order("created_at", { ascending: false });
      return data || [];
    },
    staleTime: 60_000,
  });

  return (
    <div>
      {p.title && <h2 className="text-2xl font-display font-bold text-foreground mb-6">{p.title}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product: any) => (
          <ProductCard
            key={product.id}
            id={product.id}
            name={product.name}
            price={product.price}
            compareAtPrice={product.compare_at_price}
            thumbnail={product.thumbnail}
            avgRating={product.avg_rating}
            reviewCount={product.review_count}
            slug={product.slug}
          />
        ))}
      </div>
    </div>
  );
};

const CategoryGridBlock: React.FC<{ p: Record<string, any> }> = ({ p }) => {
  const { data: categories = [] } = useQuery({
    queryKey: ["block-categories", p.count],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).is("parent_id", null).order("sort_order").limit(p.count || 6);
      return data || [];
    },
    staleTime: 60_000,
  });

  return (
    <div>
      {p.title && <h2 className="text-2xl font-display font-bold text-foreground mb-6">{p.title}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((cat: any) => (
          <Link key={cat.id} to={`/categories/${cat.slug}`} className="p-6 rounded-2xl bg-secondary/30 border border-border/30 hover:border-primary/30 transition-all text-center">
            {cat.image_url && <img src={cat.image_url} alt={cat.name} className="w-16 h-16 mx-auto rounded-xl object-cover mb-3" />}
            <h3 className="font-medium text-foreground">{cat.name}</h3>
          </Link>
        ))}
      </div>
    </div>
  );
};

/* ── Main Block Renderer ── */
const BlockRenderer: React.FC<{ blocks: PageBlock[] }> = ({ blocks }) => {
  return (
    <div className="space-y-8">
      {blocks.filter((b) => b.visible).map((block, i) => (
        <motion.div
          key={block.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: i * 0.05 }}
        >
          {block.type === "hero" && <HeroBlock p={block.props} />}
          {block.type === "text" && <TextBlock p={block.props} />}
          {block.type === "image" && <ImageBlock p={block.props} />}
          {block.type === "cta" && <CTABlock p={block.props} />}
          {block.type === "testimonial" && <TestimonialBlock p={block.props} />}
          {block.type === "features" && <FeatureGrid p={block.props} />}
          {block.type === "video" && <VideoBlock p={block.props} />}
          {block.type === "divider" && <hr className="border-border" />}
          {block.type === "spacer" && <div style={{ height: block.props.height || 48 }} />}
          {block.type === "banner" && block.props.imageUrl && (
            block.props.linkUrl ? (
              <Link to={block.props.linkUrl}><img src={block.props.imageUrl} alt={block.props.alt} className="w-full rounded-2xl" loading="lazy" /></Link>
            ) : (
              <img src={block.props.imageUrl} alt={block.props.alt} className="w-full rounded-2xl" loading="lazy" />
            )
          )}
          {block.type === "richtext" && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{block.props.content}</ReactMarkdown>
            </div>
          )}
          {block.type === "products" && <ProductGridBlock p={block.props} />}
          {block.type === "categories" && <CategoryGridBlock p={block.props} />}
        </motion.div>
      ))}
    </div>
  );
};

export default BlockRenderer;
// code:4ce0
