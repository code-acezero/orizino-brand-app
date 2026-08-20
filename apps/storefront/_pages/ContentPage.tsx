"use client";
import React from "react";
import { useParams } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import BlockRenderer from "@/components/BlockRenderer";
import type { PageBlock } from "@/components/admin/PageBuilder";

const ContentPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading } = useQuery({
    queryKey: ["cms-page", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const isBlockPage = page?.content?.startsWith("<!--BLOCKS:");
  const blocks: PageBlock[] = React.useMemo(() => {
    if (!isBlockPage || !page?.content) return [];
    try {
      const json = page.content.slice(11, page.content.indexOf("-->"));
      return JSON.parse(json);
    } catch { return []; }
  }, [page?.content, isBlockPage]);

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <main className={`container mx-auto px-4 py-10 ${isBlockPage ? "max-w-5xl" : "max-w-3xl"}`}>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : !page ? (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">Page not found</p>
          </div>
        ) : isBlockPage ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BlockRenderer blocks={blocks} />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-8">{page.title}</h1>
            <div className="prose prose-sm dark:prose-invert max-w-none [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_a]:text-primary">
              <ReactMarkdown>{page.content}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default ContentPage;
// code:4ce0
