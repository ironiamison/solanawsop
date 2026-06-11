import { NextResponse } from "next/server";
import { searchUsersByTwitter } from "@/lib/social";
import { requireDbUser } from "@/lib/require-user";

export async function GET(req: Request) {
  const me = await requireDbUser(req.headers.get("authorization"));
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await searchUsersByTwitter(q, 8, me.id);
  return NextResponse.json({ users });
}
