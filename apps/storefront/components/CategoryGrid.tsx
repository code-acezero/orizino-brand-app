"use client";
import React from "react";
import { Link } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid } from "lucide-react";
import { CategoryMonochromeIcon } from "@shared/components/CategoryMonochromeIcon";

import catElectronics from "@/assets/icons/cat-electronics.png";
import catFashion from "@/assets/icons/cat-fashion.png";
import catHome from "@/assets/icons/cat-home.png";
import catAccessories from "@/assets/icons/cat-accessories.png";
import catGroceries from "@/assets/icons/cat-groceries.png";
import catSports from "@/assets/icons/cat-sports.png";

const fallbackIcons: Record<string, any> = {
  electronics: catElectronics,
  fashion: catFashion,
  "home-living": catHome,
  accessories: catAccessories,
  groceries: catGroceries,
  "sports-outdoors": catSports,
};

const CategoryGrid: React.FC = () => {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["featured-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, icon, icon_url, accent_color, image_url")
        .eq("is_active", true)
        .eq("is_featured", true)
        .is("parent_id", null)
        .order("sort_order")
        .limit(6);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-3xl bg-secondary/30 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-3 text-foreground">
            Shop by Category
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Browse through our wide range of categories
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat, i) => {
            const color = cat.accent_color || "#6366f1";
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link
                  to={`/categories/${cat.slug}`}
                  className="group glass rounded-3xl p-6 flex flex-col items-center gap-4 hover:border-primary/30 transition-all duration-300"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden border border-border/40"
                    style={{
                      background: `linear-gradient(135deg, ${color}25, ${color}0a)`,
                    }}
                  >
                    <CategoryMonochromeIcon
                      icon={cat.icon}
                      iconUrl={cat.icon_url}
                      className="w-7 h-7"
                      fallbackIcon={
                        fallbackIcons[cat.slug] ? (
                          <img
                            src={fallbackIcons[cat.slug]}
                            alt={cat.name}
                            className="w-8 h-8 object-contain brightness-0 dark:invert"
                          />
                        ) : (
                          <LayoutGrid className="w-7 h-7 stroke-[1.8]" />
                        )
                      }
                    />
                  </motion.div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {cat.name}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
// code:4ce0
