export type ProductStatus = "upcoming" | "live" | "soldout";

export interface Product {
  id: string;
  name: string;
  tagline: string;
  category: string;
  price: number;
  totalStock: number;
  remainingStock: number;
  dropAt: number; // epoch ms
  status: ProductStatus;
}

export type HoldStatus = "active" | "expired" | "confirmed" | "released";

export interface Hold {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  createdAt: number;
  expiresAt: number; // authoritative, set by server
  status: HoldStatus;
}

export interface ApiError {
  code:
    | "OUT_OF_STOCK"
    | "SERVER_ERROR"
    | "HOLD_EXPIRED"
    | "NOT_FOUND"
    | "VALIDATION";
  message: string;
}

export interface Order {
  id: string;
  items: { productId: string; productName: string; qty: number; unitPrice: number }[];
  total: number;
  confirmedAt: number;
}
