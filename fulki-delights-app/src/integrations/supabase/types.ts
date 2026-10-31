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
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
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
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
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
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number
          id: string
          notes: string | null
          order_number: number
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          source: string
          status: Database["public"]["Enums"]["order_status"]
          storefront_id: string | null
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          notes?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          source?: string
          status?: Database["public"]["Enums"]["order_status"]
          storefront_id?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          id?: string
          notes?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
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
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
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
          brand_name: string
          created_at: string
          id: string
          is_open: boolean
          owner_id: string | null
          slug: string
          tagline: string | null
          updated_at: string
          upi_id: string | null
          upi_payee_name: string | null
        }
        Insert: {
          brand_name: string
          created_at?: string
          id?: string
          is_open?: boolean
          owner_id?: string | null
          slug: string
          tagline?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
        }
        Update: {
          brand_name?: string
          created_at?: string
          id?: string
          is_open?: boolean
          owner_id?: string | null
          slug?: string
          tagline?: string | null
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "manager" | "staff"
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
      app_role: ["owner", "manager", "staff"],
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
