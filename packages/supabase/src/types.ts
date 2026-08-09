export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      affiliate_accounts: {
        Row: {
          application_notes: string | null
          applied_at: string
          approved_at: string | null
          approved_by: string | null
          available_balance: number
          code: string
          created_at: string
          custom_rate: number | null
          id: string
          lifetime_paid: number
          payout_details: Json | null
          payout_method: string | null
          pending_balance: number
          promotion_method: string | null
          rejection_reason: string | null
          status: string
          tier: string | null
          total_clicks: number
          total_earnings: number
          total_orders: number
          total_signups: number
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          application_notes?: string | null
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          available_balance?: number
          code: string
          created_at?: string
          custom_rate?: number | null
          id?: string
          lifetime_paid?: number
          payout_details?: Json | null
          payout_method?: string | null
          pending_balance?: number
          promotion_method?: string | null
          rejection_reason?: string | null
          status?: string
          tier?: string | null
          total_clicks?: number
          total_earnings?: number
          total_orders?: number
          total_signups?: number
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          application_notes?: string | null
          applied_at?: string
          approved_at?: string | null
          approved_by?: string | null
          available_balance?: number
          code?: string
          created_at?: string
          custom_rate?: number | null
          id?: string
          lifetime_paid?: number
          payout_details?: Json | null
          payout_method?: string | null
          pending_balance?: number
          promotion_method?: string | null
          rejection_reason?: string | null
          status?: string
          tier?: string | null
          total_clicks?: number
          total_earnings?: number
          total_orders?: number
          total_signups?: number
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      affiliate_category_rates: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_active: boolean
          rate: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          rate: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string | null
          converted: boolean | null
          country: string | null
          created_at: string
          device: string | null
          id: string
          ip_hash: string | null
          landing_url: string | null
          link_id: string | null
          product_id: string | null
          ref_code: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id?: string | null
          converted?: boolean | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_hash?: string | null
          landing_url?: string | null
          link_id?: string | null
          product_id?: string | null
          ref_code: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string | null
          converted?: boolean | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_hash?: string | null
          landing_url?: string | null
          link_id?: string | null
          product_id?: string | null
          ref_code?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          available_at: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          notes: string | null
          order_amount: number
          order_id: string | null
          paid_at: string | null
          payout_id: string | null
          referral_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          available_at?: string | null
          commission_amount: number
          commission_rate: number
          created_at?: string
          id?: string
          notes?: string | null
          order_amount?: number
          order_id?: string | null
          paid_at?: string | null
          payout_id?: string | null
          referral_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          available_at?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_amount?: number
          order_id?: string | null
          paid_at?: string | null
          payout_id?: string | null
          referral_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_creatives: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          target_url: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          target_url?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          target_url?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_payouts: {
        Row: {
          admin_notes: string | null
          affiliate_id: string
          amount: number
          created_at: string
          details: Json | null
          id: string
          method: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_at: string
          status: string
          txn_reference: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          affiliate_id: string
          amount: number
          created_at?: string
          details?: Json | null
          id?: string
          method: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          txn_reference?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          affiliate_id?: string
          amount?: number
          created_at?: string
          details?: Json | null
          id?: string
          method?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string
          status?: string
          txn_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_product_links: {
        Row: {
          affiliate_id: string
          clicks: number
          conversions: number
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          product_id: string | null
          slug: string
          target_url: string
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          affiliate_id: string
          clicks?: number
          conversions?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          product_id?: string | null
          slug: string
          target_url: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          affiliate_id?: string
          clicks?: number
          conversions?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          product_id?: string | null
          slug?: string
          target_url?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_product_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_products: {
        Row: {
          bonus_amount: number
          created_at: string
          id: string
          is_active: boolean
          is_featured: boolean
          notes: string | null
          override_rate: number | null
          product_id: string
          updated_at: string
        }
        Insert: {
          bonus_amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          notes?: string | null
          override_rate?: number | null
          product_id: string
          updated_at?: string
        }
        Update: {
          bonus_amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          is_featured?: boolean
          notes?: string | null
          override_rate?: number | null
          product_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          click_id: string | null
          created_at: string
          first_order_id: string | null
          id: string
          ref_code: string
          referred_user_id: string
          signed_up_at: string
          status: string | null
          total_orders: number | null
        }
        Insert: {
          affiliate_id: string
          click_id?: string | null
          created_at?: string
          first_order_id?: string | null
          id?: string
          ref_code: string
          referred_user_id: string
          signed_up_at?: string
          status?: string | null
          total_orders?: number | null
        }
        Update: {
          affiliate_id?: string
          click_id?: string | null
          created_at?: string
          first_order_id?: string | null
          id?: string
          ref_code?: string
          referred_user_id?: string
          signed_up_at?: string
          status?: string | null
          total_orders?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliate_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_click_id_fkey"
            columns: ["click_id"]
            isOneToOne: false
            referencedRelation: "affiliate_clicks"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_report_config: {
        Row: {
          created_at: string
          id: number
          last_instant_at: string | null
          last_monthly_at: string | null
          last_weekly_at: string | null
          spreadsheet_id: string | null
          spreadsheet_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          last_instant_at?: string | null
          last_monthly_at?: string | null
          last_weekly_at?: string | null
          spreadsheet_id?: string | null
          spreadsheet_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          last_instant_at?: string | null
          last_monthly_at?: string | null
          last_weekly_at?: string | null
          spreadsheet_id?: string | null
          spreadsheet_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      affiliate_settings: {
        Row: {
          allow_self_referral: boolean
          approval_required: boolean
          attribution_model: string
          auto_approve: boolean
          benefits: Json | null
          branding: Json
          commission_rate: number
          cookie_days: number
          created_at: string
          default_category_rate: number | null
          display_style: string
          enabled: boolean
          faq: Json | null
          featured_only: boolean
          hero_image: string | null
          holding_period_days: number
          id: string
          min_payout: number
          payout_methods: Json | null
          program_description: string | null
          program_name: string | null
          referral_bonus: number
          status_message: string | null
          terms_md: string | null
          tier_thresholds: Json
          updated_at: string
        }
        Insert: {
          allow_self_referral?: boolean
          approval_required?: boolean
          attribution_model?: string
          auto_approve?: boolean
          benefits?: Json | null
          branding?: Json
          commission_rate?: number
          cookie_days?: number
          created_at?: string
          default_category_rate?: number | null
          display_style?: string
          enabled?: boolean
          faq?: Json | null
          featured_only?: boolean
          hero_image?: string | null
          holding_period_days?: number
          id?: string
          min_payout?: number
          payout_methods?: Json | null
          program_description?: string | null
          program_name?: string | null
          referral_bonus?: number
          status_message?: string | null
          terms_md?: string | null
          tier_thresholds?: Json
          updated_at?: string
        }
        Update: {
          allow_self_referral?: boolean
          approval_required?: boolean
          attribution_model?: string
          auto_approve?: boolean
          benefits?: Json | null
          branding?: Json
          commission_rate?: number
          cookie_days?: number
          created_at?: string
          default_category_rate?: number | null
          display_style?: string
          enabled?: boolean
          faq?: Json | null
          featured_only?: boolean
          hero_image?: string | null
          holding_period_days?: number
          id?: string
          min_payout?: number
          payout_methods?: Json | null
          program_description?: string | null
          program_name?: string | null
          referral_bonus?: number
          status_message?: string | null
          terms_md?: string | null
          tier_thresholds?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ai_user_memory: {
        Row: {
          created_at: string
          interests: string[] | null
          last_viewed_products: string[] | null
          notes: Json | null
          preferred_categories: string[] | null
          recent_intents: string[] | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          interests?: string[] | null
          last_viewed_products?: string[] | null
          notes?: Json | null
          preferred_categories?: string[] | null
          recent_intents?: string[] | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          interests?: string[] | null
          last_viewed_products?: string[] | null
          notes?: Json | null
          preferred_categories?: string[] | null
          recent_intents?: string[] | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_widget_settings: {
        Row: {
          chat_greeting_guest: string
          chat_greeting_logged_in: string
          chat_premade_questions: string[]
          created_at: string
          fab_animation_intensity: number
          fab_animation_style: string
          fab_floating_texts: string[]
          fab_show_avatar_inline: boolean
          id: string
          updated_at: string
          welcome_cinematic_duration_ms: number
          welcome_enabled: boolean
          welcome_first_time: string
          welcome_returning_logged_in: string[]
          welcome_returning_long: string[]
          welcome_returning_today: string[]
          welcome_returning_week: string[]
        }
        Insert: {
          chat_greeting_guest?: string
          chat_greeting_logged_in?: string
          chat_premade_questions?: string[]
          created_at?: string
          fab_animation_intensity?: number
          fab_animation_style?: string
          fab_floating_texts?: string[]
          fab_show_avatar_inline?: boolean
          id?: string
          updated_at?: string
          welcome_cinematic_duration_ms?: number
          welcome_enabled?: boolean
          welcome_first_time?: string
          welcome_returning_logged_in?: string[]
          welcome_returning_long?: string[]
          welcome_returning_today?: string[]
          welcome_returning_week?: string[]
        }
        Update: {
          chat_greeting_guest?: string
          chat_greeting_logged_in?: string
          chat_premade_questions?: string[]
          created_at?: string
          fab_animation_intensity?: number
          fab_animation_style?: string
          fab_floating_texts?: string[]
          fab_show_avatar_inline?: boolean
          id?: string
          updated_at?: string
          welcome_cinematic_duration_ms?: number
          welcome_enabled?: boolean
          welcome_first_time?: string
          welcome_returning_logged_in?: string[]
          welcome_returning_long?: string[]
          welcome_returning_today?: string[]
          welcome_returning_week?: string[]
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string | null
          position: string
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string | null
          position?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          caller_id: string
          conversation_id: string | null
          created_at: string
          drive_file_id: string | null
          drive_synced_at: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          receiver_id: string
          recording_admin_url: string | null
          recording_user_url: string | null
          started_at: string
          status: string
        }
        Insert: {
          caller_id: string
          conversation_id?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_synced_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          receiver_id: string
          recording_admin_url?: string | null
          recording_user_url?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          caller_id?: string
          conversation_id?: string | null
          created_at?: string
          drive_file_id?: string | null
          drive_synced_at?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          receiver_id?: string
          recording_admin_url?: string | null
          recording_user_url?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          accent_color: string | null
          banner_type: string | null
          banner_url: string | null
          created_at: string
          description: string | null
          flash_sale_ends_at: string | null
          icon: string | null
          icon_url: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured: boolean
          is_flash_sale: boolean
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          accent_color?: string | null
          banner_type?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          flash_sale_ends_at?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_flash_sale?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          accent_color?: string | null
          banner_type?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          flash_sale_ends_at?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured?: boolean
          is_flash_sale?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_filters: {
        Row: {
          category_id: string
          created_at: string
          filter_name: string
          filter_values: string[]
          id: string
          is_active: boolean
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          filter_name: string
          filter_values?: string[]
          id?: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          filter_name?: string
          filter_values?: string[]
          id?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_filters_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          first_order_only: boolean
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_items: number | null
          min_order_amount: number | null
          per_user_limit: number | null
          starts_at: string | null
          target_categories: string[] | null
          target_products: string[] | null
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_items?: number | null
          min_order_amount?: number | null
          per_user_limit?: number | null
          starts_at?: string | null
          target_categories?: string[] | null
          target_products?: string[] | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_items?: number | null
          min_order_amount?: number | null
          per_user_limit?: number | null
          starts_at?: string | null
          target_categories?: string[] | null
          target_products?: string[] | null
          usage_limit?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      courier_hubs: {
        Row: {
          address: string
          area: string | null
          city: string
          contact_phone: string | null
          created_at: string
          hub_name: string
          id: string
          is_active: boolean
          is_pickup_point: boolean
          latitude: number | null
          longitude: number | null
          provider: string
        }
        Insert: {
          address: string
          area?: string | null
          city: string
          contact_phone?: string | null
          created_at?: string
          hub_name: string
          id?: string
          is_active?: boolean
          is_pickup_point?: boolean
          latitude?: number | null
          longitude?: number | null
          provider: string
        }
        Update: {
          address?: string
          area?: string | null
          city?: string
          contact_phone?: string | null
          created_at?: string
          hub_name?: string
          id?: string
          is_active?: boolean
          is_pickup_point?: boolean
          latitude?: number | null
          longitude?: number | null
          provider?: string
        }
        Relationships: []
      }
      courier_pricing_rules: {
        Row: {
          base_fee: number
          created_at: string
          hub_pickup_discount: number
          id: string
          is_active: boolean
          per_kg_fee: number
          provider: string
          sort_order: number
          weight_max: number
          zone_type: string
        }
        Insert: {
          base_fee?: number
          created_at?: string
          hub_pickup_discount?: number
          id?: string
          is_active?: boolean
          per_kg_fee?: number
          provider: string
          sort_order?: number
          weight_max?: number
          zone_type: string
        }
        Update: {
          base_fee?: number
          created_at?: string
          hub_pickup_discount?: number
          id?: string
          is_active?: boolean
          per_kg_fee?: number
          provider?: string
          sort_order?: number
          weight_max?: number
          zone_type?: string
        }
        Relationships: []
      }
      courier_zones: {
        Row: {
          area_id: number | null
          area_name: string | null
          city_id: number | null
          city_name: string
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          provider: string
          zone_id: number | null
          zone_name: string | null
        }
        Insert: {
          area_id?: number | null
          area_name?: string | null
          city_id?: number | null
          city_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider: string
          zone_id?: number | null
          zone_name?: string | null
        }
        Update: {
          area_id?: number | null
          area_name?: string | null
          city_id?: number | null
          city_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          provider?: string
          zone_id?: number | null
          zone_name?: string | null
        }
        Relationships: []
      }
      customer_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          customer_id: string
          id: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          customer_id: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          customer_id?: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      customer_tag_assignments: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "customer_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      db_health_alerts: {
        Row: {
          created_at: string
          details: Json
          id: string
          kind: string
          message: string
          severity: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          kind: string
          message: string
          severity?: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          kind?: string
          message?: string
          severity?: string
        }
        Relationships: []
      }
      db_health_snapshots: {
        Row: {
          captured_at: string
          id: string
          idx_scan: number
          n_live_tup: number
          relname: string
          seq_scan: number
        }
        Insert: {
          captured_at?: string
          id?: string
          idx_scan: number
          n_live_tup: number
          relname: string
          seq_scan: number
        }
        Update: {
          captured_at?: string
          id?: string
          idx_scan?: number
          n_live_tup?: number
          relname?: string
          seq_scan?: number
        }
        Relationships: []
      }
      delivery_offers: {
        Row: {
          absorb_from_product: boolean
          applicable_couriers: string[]
          created_at: string
          description: string | null
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          min_order_amount: number | null
          offer_type: string
          source: string
          starts_at: string | null
          target_areas: string[] | null
          title: string
        }
        Insert: {
          absorb_from_product?: boolean
          applicable_couriers?: string[]
          created_at?: string
          description?: string | null
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          offer_type?: string
          source?: string
          starts_at?: string | null
          target_areas?: string[] | null
          title: string
        }
        Update: {
          absorb_from_product?: boolean
          applicable_couriers?: string[]
          created_at?: string
          description?: string | null
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          min_order_amount?: number | null
          offer_type?: string
          source?: string
          starts_at?: string | null
          target_areas?: string[] | null
          title?: string
        }
        Relationships: []
      }
      email_automation_events: {
        Row: {
          created_at: string
          entity_id: string | null
          event: string
          id: string
          payload: Json | null
          processed_at: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          event: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          event?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
        }
        Relationships: []
      }
      email_automations: {
        Row: {
          audience_filter: Json | null
          audience_type: string
          created_at: string
          delay_minutes: number
          event: string
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          quiet_hours_end: number | null
          quiet_hours_start: number | null
          run_count: number
          subject_override: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          audience_filter?: Json | null
          audience_type?: string
          created_at?: string
          delay_minutes?: number
          event: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          run_count?: number
          subject_override?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          audience_filter?: Json | null
          audience_type?: string
          created_at?: string
          delay_minutes?: number
          event?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          run_count?: number
          subject_override?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_automations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaign_recipients: {
        Row: {
          bounced_at: string | null
          campaign_id: string
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          email: string
          error: string | null
          id: string
          name: string | null
          opened_at: string | null
          provider_message_id: string | null
          sent_at: string | null
          status: string
          unsubscribed_at: string | null
          user_id: string | null
        }
        Insert: {
          bounced_at?: string | null
          campaign_id: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email: string
          error?: string | null
          id?: string
          name?: string | null
          opened_at?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Update: {
          bounced_at?: string | null
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          email?: string
          error?: string | null
          id?: string
          name?: string | null
          opened_at?: string | null
          provider_message_id?: string | null
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          audience_filter: Json | null
          audience_type: string
          bounced_count: number
          clicked_count: number
          created_at: string
          created_by: string | null
          delivered_count: number
          design: Json | null
          failed_count: number
          finished_at: string | null
          from_email: string | null
          from_name: string | null
          html: string
          id: string
          name: string
          opened_count: number
          reply_to: string | null
          schedule_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          subject: string
          template_id: string | null
          total_recipients: number
          unsubscribed_count: number
          updated_at: string
        }
        Insert: {
          audience_filter?: Json | null
          audience_type?: string
          bounced_count?: number
          clicked_count?: number
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          design?: Json | null
          failed_count?: number
          finished_at?: string | null
          from_email?: string | null
          from_name?: string | null
          html?: string
          id?: string
          name: string
          opened_count?: number
          reply_to?: string | null
          schedule_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          total_recipients?: number
          unsubscribed_count?: number
          updated_at?: string
        }
        Update: {
          audience_filter?: Json | null
          audience_type?: string
          bounced_count?: number
          clicked_count?: number
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          design?: Json | null
          failed_count?: number
          finished_at?: string | null
          from_email?: string | null
          from_name?: string | null
          html?: string
          id?: string
          name?: string
          opened_count?: number
          reply_to?: string | null
          schedule_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          total_recipients?: number
          unsubscribed_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscriptions: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_emailed_at: string | null
          name: string | null
          source: string | null
          tags: string[] | null
          unsubscribe_token: string | null
          unsubscribed_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          last_emailed_at?: string | null
          name?: string | null
          source?: string | null
          tags?: string[] | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          last_emailed_at?: string | null
          name?: string | null
          source?: string | null
          tags?: string[] | null
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      email_suppressions: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          design: Json | null
          html: string
          id: string
          is_system: boolean
          name: string
          subject: string
          thumbnail: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          design?: Json | null
          html?: string
          id?: string
          is_system?: boolean
          name: string
          subject?: string
          thumbnail?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          design?: Json | null
          html?: string
          id?: string
          is_system?: boolean
          name?: string
          subject?: string
          thumbnail?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_tiers: {
        Row: {
          badge_color: string | null
          badge_icon: string | null
          created_at: string
          discount_percentage: number
          id: string
          is_active: boolean
          min_lifetime_spend: number
          name: string
          perks: Json | null
          points_multiplier: number
          slug: string
          sort_order: number
        }
        Insert: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string
          discount_percentage?: number
          id?: string
          is_active?: boolean
          min_lifetime_spend?: number
          name: string
          perks?: Json | null
          points_multiplier?: number
          slug: string
          sort_order?: number
        }
        Update: {
          badge_color?: string | null
          badge_icon?: string | null
          created_at?: string
          discount_percentage?: number
          id?: string
          is_active?: boolean
          min_lifetime_spend?: number
          name?: string
          perks?: Json | null
          points_multiplier?: number
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          points_change: number
          reference_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          points_change: number
          reference_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          points_change?: number
          reference_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          icon: string | null
          id: string
          is_read: boolean
          link_url: string | null
          message: string | null
          priority: string
          scheduled_at: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string | null
          priority?: string
          scheduled_at?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          message?: string | null
          priority?: string
          scheduled_at?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_documents: {
        Row: {
          created_at: string
          created_by: string | null
          doc_type: string
          error_message: string | null
          external_doc_id: string
          external_url: string
          folder_id: string | null
          id: string
          order_id: string
          pdf_doc_id: string | null
          pdf_url: string | null
          provider: string
          status: string
          title: string | null
          trigger_reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doc_type: string
          error_message?: string | null
          external_doc_id: string
          external_url: string
          folder_id?: string | null
          id?: string
          order_id: string
          pdf_doc_id?: string | null
          pdf_url?: string | null
          provider?: string
          status?: string
          title?: string | null
          trigger_reason?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doc_type?: string
          error_message?: string | null
          external_doc_id?: string
          external_url?: string
          folder_id?: string | null
          id?: string
          order_id?: string
          pdf_doc_id?: string | null
          pdf_url?: string | null
          provider?: string
          status?: string
          title?: string | null
          trigger_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_documents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_courier: string | null
          coupon_code: string | null
          coupon_discount: number | null
          courier_assigned_at: string | null
          courier_assigned_by: string | null
          created_at: string
          delivery_cost_actual: number
          delivery_offer_id: string | null
          gift_message: string | null
          gift_wrap: boolean | null
          hub_pickup: boolean | null
          id: string
          loyalty_discount: number | null
          loyalty_points_used: number | null
          margin_absorbed: number
          notes: string | null
          order_number: string
          payment_method: string
          pickup_hub_id: string | null
          preferred_courier: string | null
          shipping_address: Json
          shipping_fee: number
          shipping_method_id: string | null
          status: string
          subtotal: number
          total: number
          tracking_number: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_courier?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          courier_assigned_at?: string | null
          courier_assigned_by?: string | null
          created_at?: string
          delivery_cost_actual?: number
          delivery_offer_id?: string | null
          gift_message?: string | null
          gift_wrap?: boolean | null
          hub_pickup?: boolean | null
          id?: string
          loyalty_discount?: number | null
          loyalty_points_used?: number | null
          margin_absorbed?: number
          notes?: string | null
          order_number: string
          payment_method?: string
          pickup_hub_id?: string | null
          preferred_courier?: string | null
          shipping_address?: Json
          shipping_fee?: number
          shipping_method_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          tracking_number?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_courier?: string | null
          coupon_code?: string | null
          coupon_discount?: number | null
          courier_assigned_at?: string | null
          courier_assigned_by?: string | null
          created_at?: string
          delivery_cost_actual?: number
          delivery_offer_id?: string | null
          gift_message?: string | null
          gift_wrap?: boolean | null
          hub_pickup?: boolean | null
          id?: string
          loyalty_discount?: number | null
          loyalty_points_used?: number | null
          margin_absorbed?: number
          notes?: string | null
          order_number?: string
          payment_method?: string
          pickup_hub_id?: string | null
          preferred_courier?: string | null
          shipping_address?: Json
          shipping_fee?: number
          shipping_method_id?: string | null
          status?: string
          subtotal?: number
          total?: number
          tracking_number?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_pickup_hub_id_fkey"
            columns: ["pickup_hub_id"]
            isOneToOne: false
            referencedRelation: "courier_hubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_method_id_fkey"
            columns: ["shipping_method_id"]
            isOneToOne: false
            referencedRelation: "shipping_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      page_analytics: {
        Row: {
          created_at: string
          duration_ms: number | null
          event_type: string
          id: string
          metadata: Json | null
          page: string
          section_id: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page?: string
          section_id?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page?: string
          section_id?: string | null
          session_id?: string | null
        }
        Relationships: []
      }
      pathao_shipments: {
        Row: {
          cod_amount: number | null
          consignment_id: string
          created_at: string
          delivery_fee: number | null
          environment: string
          id: string
          invoice_id: string | null
          last_synced_at: string | null
          merchant_order_id: string | null
          order_id: string
          order_status: string | null
          order_status_slug: string | null
          raw_response: Json | null
          recipient_area: number | null
          recipient_city: number | null
          recipient_city_name: string | null
          recipient_zone: number | null
          recipient_zone_name: string | null
          shipment_type: string
          updated_at: string
        }
        Insert: {
          cod_amount?: number | null
          consignment_id: string
          created_at?: string
          delivery_fee?: number | null
          environment?: string
          id?: string
          invoice_id?: string | null
          last_synced_at?: string | null
          merchant_order_id?: string | null
          order_id: string
          order_status?: string | null
          order_status_slug?: string | null
          raw_response?: Json | null
          recipient_area?: number | null
          recipient_city?: number | null
          recipient_city_name?: string | null
          recipient_zone?: number | null
          recipient_zone_name?: string | null
          shipment_type?: string
          updated_at?: string
        }
        Update: {
          cod_amount?: number | null
          consignment_id?: string
          created_at?: string
          delivery_fee?: number | null
          environment?: string
          id?: string
          invoice_id?: string | null
          last_synced_at?: string | null
          merchant_order_id?: string | null
          order_id?: string
          order_status?: string | null
          order_status_slug?: string | null
          raw_response?: Json | null
          recipient_area?: number | null
          recipient_city?: number | null
          recipient_city_name?: string | null
          recipient_zone?: number | null
          recipient_zone_name?: string | null
          shipment_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathao_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pathao_tokens: {
        Row: {
          access_token: string
          environment: string
          expires_at: string
          id: string
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          environment: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          environment?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_proofs: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          order_id: string
          payment_method: string
          screenshot_url: string
          sheet_synced: boolean
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          order_id: string
          payment_method: string
          screenshot_url: string
          sheet_synced?: boolean
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          order_id?: string
          payment_method?: string
          screenshot_url?: string
          sheet_synced?: boolean
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_proofs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      popups: {
        Row: {
          animation_style: string
          bg_color: string | null
          created_at: string
          display_type: string
          duration_hours: number | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link_text: string | null
          link_url: string | null
          max_views: number | null
          message: string | null
          position: string
          starts_at: string | null
          text_color: string | null
          title: string
          trigger_type: string
          trigger_value: number
        }
        Insert: {
          animation_style?: string
          bg_color?: string | null
          created_at?: string
          display_type?: string
          duration_hours?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          max_views?: number | null
          message?: string | null
          position?: string
          starts_at?: string | null
          text_color?: string | null
          title: string
          trigger_type?: string
          trigger_value?: number
        }
        Update: {
          animation_style?: string
          bg_color?: string | null
          created_at?: string
          display_type?: string
          duration_hours?: number | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          max_views?: number | null
          message?: string | null
          position?: string
          starts_at?: string | null
          text_color?: string | null
          title?: string
          trigger_type?: string
          trigger_value?: number
        }
        Relationships: []
      }
      product_import_requests: {
        Row: {
          admin_notes: string | null
          conversation_id: string | null
          created_at: string
          id: string
          notes: string | null
          product_images: string[] | null
          product_url: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_images?: string[] | null
          product_url: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          product_images?: string[] | null
          product_url?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_import_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_interactions: {
        Row: {
          created_at: string
          dwell_ms: number | null
          id: string
          kind: string
          product_id: string
          session_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dwell_ms?: number | null
          id?: string
          kind: string
          product_id: string
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dwell_ms?: number | null
          id?: string
          kind?: string
          product_id?: string
          session_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_interactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_requests: {
        Row: {
          admin_notes: string | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          product_name: string
          reference_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          product_name: string
          reference_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          product_name?: string
          reference_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          color: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          price_override: number | null
          product_id: string
          size: string | null
          sku: string | null
          sort_order: number
          stock_quantity: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_override?: number | null
          product_id: string
          size?: string | null
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_override?: number | null
          product_id?: string
          size?: string | null
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          avg_rating: number | null
          category_id: string | null
          compare_at_price: number | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean
          is_featured: boolean
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          name: string
          price: number
          review_count: number | null
          short_description: string | null
          sku: string | null
          slug: string
          specifications: Json | null
          stock_quantity: number
          tags: string[] | null
          thumbnail: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          avg_rating?: number | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name: string
          price?: number
          review_count?: number | null
          short_description?: string | null
          sku?: string | null
          slug: string
          specifications?: Json | null
          stock_quantity?: number
          tags?: string[] | null
          thumbnail?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          avg_rating?: number | null
          category_id?: string | null
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          name?: string
          price?: number
          review_count?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          specifications?: Json | null
          stock_quantity?: number
          tags?: string[] | null
          thumbnail?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: Json | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          order_id: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          order_id: string
          reason: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          order_id?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          images: string[] | null
          is_approved: boolean
          product_id: string
          rating: number
          title: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          is_approved?: boolean
          product_id: string
          rating: number
          title?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          images?: string[] | null
          is_approved?: boolean
          product_id?: string
          rating?: number
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_methods: {
        Row: {
          cod_enabled: boolean
          created_at: string
          description: string | null
          estimated_days: string | null
          id: string
          is_active: boolean
          min_order_free: number | null
          name: string
          price: number
          sort_order: number | null
        }
        Insert: {
          cod_enabled?: boolean
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          min_order_free?: number | null
          name: string
          price?: number
          sort_order?: number | null
        }
        Update: {
          cod_enabled?: boolean
          created_at?: string
          description?: string | null
          estimated_days?: string | null
          id?: string
          is_active?: boolean
          min_order_free?: number | null
          name?: string
          price?: number
          sort_order?: number | null
        }
        Relationships: []
      }
      showcase_slides: {
        Row: {
          created_at: string
          cta_link: string | null
          cta_text: string | null
          description: string | null
          id: string
          image_url: string
          is_active: boolean
          product_id: string | null
          sort_order: number
          subtitle: string | null
          text_align: string
          text_color: string | null
          title: string
          transition_type: string
        }
        Insert: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          product_id?: string | null
          sort_order?: number
          subtitle?: string | null
          text_align?: string
          text_color?: string | null
          title: string
          transition_type?: string
        }
        Update: {
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          description?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          product_id?: string | null
          sort_order?: number
          subtitle?: string | null
          text_align?: string
          text_color?: string | null
          title?: string
          transition_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_slides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      staff_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          meta: Json | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          meta?: Json | null
        }
        Relationships: []
      }
      staff_role_presets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          sections: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          sections?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          sections?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      staff_section_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          preset_id: string | null
          section: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          preset_id?: string | null
          section: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          preset_id?: string | null
          section?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_section_access_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "staff_role_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_section_access_section_fkey"
            columns: ["section"]
            isOneToOne: false
            referencedRelation: "staff_sections"
            referencedColumns: ["key"]
          },
        ]
      }
      staff_sections: {
        Row: {
          created_at: string
          description: string | null
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      steadfast_shipments: {
        Row: {
          cod_amount: number | null
          consignment_id: string
          created_at: string
          delivery_charge: number | null
          id: string
          invoice: string | null
          last_synced_at: string | null
          note: string | null
          order_id: string
          raw_response: Json | null
          recipient_address: string | null
          recipient_name: string | null
          recipient_phone: string | null
          status: string | null
          tracking_code: string | null
          tracking_message: string | null
          updated_at: string
        }
        Insert: {
          cod_amount?: number | null
          consignment_id: string
          created_at?: string
          delivery_charge?: number | null
          id?: string
          invoice?: string | null
          last_synced_at?: string | null
          note?: string | null
          order_id: string
          raw_response?: Json | null
          recipient_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string | null
          tracking_code?: string | null
          tracking_message?: string | null
          updated_at?: string
        }
        Update: {
          cod_amount?: number | null
          consignment_id?: string
          created_at?: string
          delivery_charge?: number | null
          id?: string
          invoice?: string | null
          last_synced_at?: string | null
          note?: string | null
          order_id?: string
          raw_response?: Json | null
          recipient_address?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string | null
          tracking_code?: string | null
          tracking_message?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_notifications: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_notified: boolean
          product_id: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_notified?: boolean
          product_id: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_notified?: boolean
          product_id?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_notifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_notifications_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          is_ai: boolean
          needs_human: boolean
          status: string
          subject: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          is_ai?: boolean
          needs_human?: boolean
          status?: string
          subject?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          is_ai?: boolean
          needs_human?: boolean
          status?: string
          subject?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_chats: {
        Row: {
          chat_id: number
          created_at: string
          id: string
          last_message_at: string | null
          notify_calls: boolean
          notify_orders: boolean
          notify_support: boolean
          title: string | null
          type: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          id?: string
          last_message_at?: string | null
          notify_calls?: boolean
          notify_orders?: boolean
          notify_support?: boolean
          title?: string | null
          type?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          id?: string
          last_message_at?: string | null
          notify_calls?: boolean
          notify_orders?: boolean
          notify_support?: boolean
          title?: string | null
          type?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      telegram_state: {
        Row: {
          id: number
          last_update_id: number
          updated_at: string
        }
        Insert: {
          id?: number
          last_update_id?: number
          updated_at?: string
        }
        Update: {
          id?: number
          last_update_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_type: string
          area: string | null
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          label: string
          latitude: number | null
          longitude: number | null
          pathao_area_id: number | null
          pathao_city_id: number | null
          pathao_zone_id: number | null
          phone: string
          postal_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_type?: string
          area?: string | null
          city: string
          country?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          pathao_area_id?: number | null
          pathao_city_id?: number | null
          pathao_zone_id?: number | null
          phone: string
          postal_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_type?: string
          area?: string | null
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          pathao_area_id?: number | null
          pathao_city_id?: number | null
          pathao_zone_id?: number | null
          phone?: string
          postal_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_loyalty: {
        Row: {
          created_at: string
          current_tier_id: string | null
          lifetime_points: number
          lifetime_spend: number
          points_balance: number
          referral_code: string | null
          total_orders: number
          total_reviews: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_tier_id?: string | null
          lifetime_points?: number
          lifetime_spend?: number
          points_balance?: number
          referral_code?: string | null
          total_orders?: number
          total_reviews?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_tier_id?: string | null
          lifetime_points?: number
          lifetime_spend?: number
          points_balance?: number
          referral_code?: string | null
          total_orders?: number
          total_reviews?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_loyalty_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_payment_methods: {
        Row: {
          account_label: string
          account_number_masked: string | null
          created_at: string
          id: string
          is_default: boolean
          provider: string
          user_id: string
        }
        Insert: {
          account_label: string
          account_number_masked?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          provider: string
          user_id: string
        }
        Update: {
          account_label?: string
          account_number_masked?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          currency: string | null
          email_notifications: boolean | null
          font_family: string | null
          language: string | null
          marketing_emails: boolean | null
          newsletter: boolean | null
          order_updates: boolean | null
          push_notifications: boolean | null
          sms_notifications: boolean | null
          theme: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          email_notifications?: boolean | null
          font_family?: string | null
          language?: string | null
          marketing_emails?: boolean | null
          newsletter?: boolean | null
          order_updates?: boolean | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          email_notifications?: boolean | null
          font_family?: string | null
          language?: string | null
          marketing_emails?: boolean | null
          newsletter?: boolean | null
          order_updates?: boolean | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_promo_claims: {
        Row: {
          claimed_at: string
          dismissed: boolean
          id: string
          is_used: boolean
          promo_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string
          dismissed?: boolean
          id?: string
          is_used?: boolean
          promo_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string
          dismissed?: boolean
          id?: string
          is_used?: boolean
          promo_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_promo_claims_promo_id_fkey"
            columns: ["promo_id"]
            isOneToOne: false
            referencedRelation: "user_promos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_promos: {
        Row: {
          condition_type: string
          condition_value: Json | null
          coupon_code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_amount: number | null
          popup_bg_color: string | null
          popup_image_url: string | null
          popup_message: string | null
          popup_text_color: string | null
          popup_title: string | null
          starts_at: string | null
          target_user_ids: string[] | null
          title: string
          usage_limit: number | null
          used_count: number | null
        }
        Insert: {
          condition_type?: string
          condition_value?: Json | null
          coupon_code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          popup_bg_color?: string | null
          popup_image_url?: string | null
          popup_message?: string | null
          popup_text_color?: string | null
          popup_title?: string | null
          starts_at?: string | null
          target_user_ids?: string[] | null
          title: string
          usage_limit?: number | null
          used_count?: number | null
        }
        Update: {
          condition_type?: string
          condition_value?: Json | null
          coupon_code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          popup_bg_color?: string | null
          popup_image_url?: string | null
          popup_message?: string | null
          popup_text_color?: string | null
          popup_title?: string | null
          starts_at?: string | null
          target_user_ids?: string[] | null
          title?: string
          usage_limit?: number | null
          used_count?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device: string | null
          id: string
          ip_address: string | null
          is_current: boolean | null
          last_active_at: string
          location: string | null
          os: string | null
          session_token: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string
          location?: string | null
          os?: string | null
          session_token?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip_address?: string | null
          is_current?: boolean | null
          last_active_at?: string
          location?: string | null
          os?: string | null
          session_token?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string | null
          images: string[] | null
          is_approved: boolean | null
          product_id: string | null
          rating: number | null
          title: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          images?: string[] | null
          is_approved?: boolean | null
          product_id?: string | null
          rating?: number | null
          title?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string | null
          images?: string[] | null
          is_approved?: boolean | null
          product_id?: string | null
          rating?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_product_requests: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string | null
          product_name: string | null
          reference_url: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          product_name?: string | null
          reference_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          product_name?: string | null
          reference_url?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_check_db_alerts: { Args: never; Returns: undefined }
      admin_cron_runs: {
        Args: { p_hours?: number }
        Returns: {
          duration_ms: number
          end_time: string
          jobid: number
          jobname: string
          return_message: string
          runid: number
          schedule: string
          start_time: string
          status: string
        }[]
      }
      admin_db_health_summary: { Args: never; Returns: Json }
      admin_db_table_stats: {
        Args: { p_tables?: string[] }
        Returns: {
          idx_scan: number
          idx_tup_fetch: number
          last_autoanalyze: string
          n_live_tup: number
          relname: string
          seq_scan: number
          seq_tup_read: number
        }[]
      }
      award_loyalty_points: {
        Args: {
          _description?: string
          _points: number
          _reference_id?: string
          _source: string
          _spend_amount?: number
          _user_id: string
        }
        Returns: undefined
      }
      generate_affiliate_code: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_section_access: {
        Args: { _section: string; _user_id: string }
        Returns: boolean
      }
      increment_campaign_counter: {
        Args: { _campaign_id: string; _field: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "manager"
        | "maintainer"
        | "support"
        | "marketing"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "moderator",
        "user",
        "manager",
        "maintainer",
        "support",
        "marketing",
      ],
    },
  },
} as const
// code:4ce0
