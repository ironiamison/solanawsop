import { NextResponse } from "next/server";
import { requireDbUser } from "@/lib/require-user";
import { recordHandPlayedReward } from "@/lib/rewards";

export async function POST(req: Request) {
  const user = await requireDbUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { handNumber, source } = body as {
    handNumber?: number;
    source?: string;
  };

  if (typeof handNumber !== "number" || handNumber < 1) {
    return NextResponse.json({ error: "Invalid handNumber" }, { status: 400 });
  }
  if (source !== "demo" && source !== "onchain") {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  const result = await recordHandPlayedReward(user.id, handNumber, source);
  return NextResponse.json(result);
}
