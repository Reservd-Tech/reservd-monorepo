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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auth_usernames: {
        Row: {
          created_at: string
          id: string
          normalized_username: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_username: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          normalized_username?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          sort_order: number
          storefront_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          sort_order?: number
          storefront_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          sort_order?: number
          storefront_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "public_vendor_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string | null
          cost_per_unit: number
          created_at: string
          created_by: string | null
          current_quantity: number
          expiry_date: string | null
          id: string
          maximum_quantity: number
          minimum_quantity: number
          name: string
          notes: string | null
          sku: string | null
          status: Database["public"]["Enums"]["inventory_status"]
          storage_location: string | null
          unit: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          expiry_date?: string | null
          id?: string
          maximum_quantity?: number
          minimum_quantity?: number
          name: string
          notes?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          storage_location?: string | null
          unit?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          category?: string | null
          cost_per_unit?: number
          created_at?: string
          created_by?: string | null
          current_quantity?: number
          expiry_date?: string | null
          id?: string
          maximum_quantity?: number
          minimum_quantity?: number
          name?: string
          notes?: string | null
          sku?: string | null
          status?: Database["public"]["Enums"]["inventory_status"]
          storage_location?: string | null
          unit?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          action: Database["public"]["Enums"]["inventory_action"]
          created_at: string
          from_location: string | null
          id: string
          item_id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          to_location: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["inventory_action"]
          created_at?: string
          from_location?: string | null
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          to_location?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["inventory_action"]
          created_at?: string
          from_location?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          to_location?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_archives: {
        Row: {
          created_at: string
          csv: string
          id: string
          label: string
          order_count: number
          period: string
          total: number
        }
        Insert: {
          created_at?: string
          csv: string
          id?: string
          label: string
          order_count?: number
          period: string
          total?: number
        }
        Update: {
          created_at?: string
          csv?: string
          id?: string
          label?: string
          order_count?: number
          period?: string
          total?: number
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          quantity_prepared: number
          quantity_preparing: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          quantity_prepared?: number
          quantity_preparing?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          quantity_prepared?: number
          quantity_preparing?: number
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
          accepted_at: string | null
          archived_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number
          eta_minutes: number | null
          id: string
          notes: string | null
          order_number: number
          order_type: Database["public"]["Enums"]["order_type"]
          payment_app: string | null
          payment_claimed_at: string | null
          payment_confirmed_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          ready_at: string | null
          rejection_reason: string | null
          source: string
          status: Database["public"]["Enums"]["order_status"]
          storefront_id: string | null
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          eta_minutes?: number | null
          id?: string
          notes?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_app?: string | null
          payment_claimed_at?: string | null
          payment_confirmed_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          ready_at?: string | null
          rejection_reason?: string | null
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          storefront_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          eta_minutes?: number | null
          id?: string
          notes?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_app?: string | null
          payment_claimed_at?: string | null
          payment_confirmed_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          ready_at?: string | null
          rejection_reason?: string | null
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          storefront_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "public_vendor_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          storefront_id: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price: number
          storefront_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          storefront_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "public_vendor_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_at: string | null
          id: string
          notes: string | null
          order_number: number
          ordered_at: string | null
          received_at: string | null
          status: Database["public"]["Enums"]["purchase_order_status"]
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          ordered_at?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          total_amount?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_at?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          ordered_at?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["purchase_order_status"]
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      storefronts: {
        Row: {
          address: string | null
          archived_at: string | null
          bank_account_holder_name: string | null
          bank_account_number: string | null
          bank_alert_phone: string | null
          bank_ifsc: string | null
          brand_name: string
          business_address: string | null
          business_pincode: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          entity_type: string | null
          fssai_certificate_url: string | null
          fssai_number: string | null
          fssai_type: string | null
          fssai_verified: boolean
          gallery_urls: string[]
          gstin: string | null
          id: string
          id_proof_type: string | null
          id_proof_url: string | null
          is_gst_registered: boolean
          is_open: boolean
          latitude: number | null
          legal_name: string | null
          listing_status: string
          logo_url: string | null
          longitude: number | null
          onboarding_step: number
          opening_hours: string | null
          owner_id: string | null
          pan_number: string | null
          phone: string | null
          self_declaration_accepted: boolean
          slug: string
          stall_photo_url: string | null
          tagline: string | null
          updated_at: string
          upi_id: string | null
          upi_payee_name: string | null
          upi_qr_url: string | null
          upi_vpa: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_alert_phone?: string | null
          bank_ifsc?: string | null
          brand_name: string
          business_address?: string | null
          business_pincode?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          entity_type?: string | null
          fssai_certificate_url?: string | null
          fssai_number?: string | null
          fssai_type?: string | null
          fssai_verified?: boolean
          gallery_urls?: string[]
          gstin?: string | null
          id?: string
          id_proof_type?: string | null
          id_proof_url?: string | null
          is_gst_registered?: boolean
          is_open?: boolean
          latitude?: number | null
          legal_name?: string | null
          listing_status?: string
          logo_url?: string | null
          longitude?: number | null
          onboarding_step?: number
          opening_hours?: string | null
          owner_id?: string | null
          pan_number?: string | null
          phone?: string | null
          self_declaration_accepted?: boolean
          slug: string
          stall_photo_url?: string | null
          tagline?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
          upi_qr_url?: string | null
          upi_vpa?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          bank_account_holder_name?: string | null
          bank_account_number?: string | null
          bank_alert_phone?: string | null
          bank_ifsc?: string | null
          brand_name?: string
          business_address?: string | null
          business_pincode?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          entity_type?: string | null
          fssai_certificate_url?: string | null
          fssai_number?: string | null
          fssai_type?: string | null
          fssai_verified?: boolean
          gallery_urls?: string[]
          gstin?: string | null
          id?: string
          id_proof_type?: string | null
          id_proof_url?: string | null
          is_gst_registered?: boolean
          is_open?: boolean
          latitude?: number | null
          legal_name?: string | null
          listing_status?: string
          logo_url?: string | null
          longitude?: number | null
          onboarding_step?: number
          opening_hours?: string | null
          owner_id?: string | null
          pan_number?: string | null
          phone?: string | null
          self_declaration_accepted?: boolean
          slug?: string
          stall_photo_url?: string | null
          tagline?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
          upi_qr_url?: string | null
          upi_vpa?: string | null
        }
        Relationships: []
      }
      user_access_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          performed_by: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          performed_by?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          performed_by?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          storefront_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          storefront_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          storefront_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "public_vendor_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_purchases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string | null
          item_name: string
          notes: string | null
          purchase_order_id: string | null
          purchased_at: string
          quantity: number
          total_cost: number
          unit_cost: number
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          item_name: string
          notes?: string | null
          purchase_order_id?: string | null
          purchased_at?: string
          quantity: number
          total_cost: number
          unit_cost: number
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          item_name?: string
          notes?: string | null
          purchase_order_id?: string | null
          purchased_at?: string
          quantity?: number
          total_cost?: number
          unit_cost?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_purchases_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_purchases_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          avg_delivery_days: number | null
          business_name: string
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gst_number: string | null
          id: string
          last_purchase_date: string | null
          notes: string | null
          outstanding_balance: number
          payment_terms: string | null
          phone: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avg_delivery_days?: number | null
          business_name: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          last_purchase_date?: string | null
          notes?: string | null
          outstanding_balance?: number
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avg_delivery_days?: number | null
          business_name?: string
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          last_purchase_date?: string | null
          notes?: string | null
          outstanding_balance?: number
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_vendor_listings: {
        Row: {
          address: string | null
          brand_name: string | null
          cover_url: string | null
          description: string | null
          fssai_number: string | null
          gallery_urls: string[] | null
          id: string | null
          is_open: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          opening_hours: string | null
          phone: string | null
          slug: string | null
          tagline: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          brand_name?: string | null
          cover_url?: string | null
          description?: string | null
          fssai_number?: string | null
          gallery_urls?: string[] | null
          id?: string | null
          is_open?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          opening_hours?: string | null
          phone?: string | null
          slug?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          brand_name?: string | null
          cover_url?: string | null
          description?: string | null
          fssai_number?: string | null
          gallery_urls?: string[] | null
          id?: string | null
          is_open?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          opening_hours?: string | null
          phone?: string | null
          slug?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_past_months_orders: { Args: never; Returns: number }
      bulk_accept_item_orders: {
        Args: { p_capacity: number; p_expected?: Json; p_product_id: string }
        Returns: Json
      }
      caller_owns_product: { Args: { _product_id: string }; Returns: boolean }
      current_storefront_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      mark_item_prepared: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: number
      }
      start_item_preparation: {
        Args: { p_product_id: string; p_quantity: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "owner" | "manager" | "staff" | "platform_admin"
      inventory_action: "add" | "reduce" | "adjust" | "waste" | "transfer"
      inventory_status: "active" | "inactive" | "discontinued"
      order_status:
        | "pending"
        | "preparing"
        | "ready"
        | "completed"
        | "cancelled"
      order_type: "dine_in" | "takeaway" | "delivery"
      payment_method: "cash" | "upi" | "card"
      payment_status: "pending" | "paid" | "cancelled"
      purchase_order_status: "draft" | "ordered" | "received" | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "manager", "staff", "platform_admin"],
      inventory_action: ["add", "reduce", "adjust", "waste", "transfer"],
      inventory_status: ["active", "inactive", "discontinued"],
      order_status: ["pending", "preparing", "ready", "completed", "cancelled"],
      order_type: ["dine_in", "takeaway", "delivery"],
      payment_method: ["cash", "upi", "card"],
      payment_status: ["pending", "paid", "cancelled"],
      purchase_order_status: ["draft", "ordered", "received", "cancelled"],
    },
  },
} as const
