import { NextRequest, NextResponse } from "next/server";
import { releaseHold } from "@/lib/server-store";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const hold = await releaseHold(params.id);
    return NextResponse.json({ hold, serverNow: Date.now() });
  } catch (e: any) {
    const status = e.code === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json(
      { code: e.code ?? "SERVER_ERROR", message: e.message ?? "Unexpected error" },
      { status }
    );
  }
}
