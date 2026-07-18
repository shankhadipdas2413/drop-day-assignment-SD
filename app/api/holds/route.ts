import { NextRequest, NextResponse } from "next/server";
import { createHold, listHolds } from "@/lib/server-store";

export async function GET() {
  const holds = await listHolds();
  return NextResponse.json({ holds, serverNow: Date.now() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, qty } = body as { productId: string; qty: number };
    if (!productId || !qty || qty < 1) {
      return NextResponse.json(
        { code: "VALIDATION", message: "productId and a positive qty are required" },
        { status: 400 }
      );
    }
    const hold = await createHold(productId, qty);
    return NextResponse.json({ hold, serverNow: Date.now() });
  } catch (e: any) {
    const status = e.code === "OUT_OF_STOCK" || e.code === "VALIDATION" ? 409 : e.code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json(
      { code: e.code ?? "SERVER_ERROR", message: e.message ?? "Unexpected error" },
      { status }
    );
  }
}
