import type { Database } from "@/integrations/supabase/types";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];

export type OrderType = Database["public"]["Enums"]["order_type"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentMethod = Database["public"]["Enums"]["payment_method"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  customers: Pick<Customer, "id" | "name" | "phone"> | null;
}
