import { NextResponse } from "next/server";
import { listProducts } from "@/lib/server-store";

export async function GET() {
  try {
    const products = await listProducts();
    return NextResponse.json({ products, serverNow: Date.now() });
  } catch (e: any) {
    return NextResponse.json(
      { code: e.code ?? "SERVER_ERROR", message: e.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
