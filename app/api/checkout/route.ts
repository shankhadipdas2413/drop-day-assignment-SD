import { NextRequest, NextResponse } from "next/server";
import { confirmCheckout } from "@/lib/server-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { holdIds } = body as { holdIds: string[] };
    if (!Array.isArray(holdIds) || holdIds.length === 0) {
      return NextResponse.json(
        { code: "VALIDATION", message: "holdIds must be a non-empty array" },
        { status: 400 }
      );
    }
    const order = await confirmCheckout(holdIds);
    return NextResponse.json({ order, serverNow: Date.now() });
  } catch (e: any) {
    const status = e.code === "HOLD_EXPIRED" ? 409 : e.code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json(
      {
        code: e.code ?? "SERVER_ERROR",
        message: e.message ?? "Unexpected error",
        expiredIds: e.expiredIds,
      },
      { status }
    );
  }
}
