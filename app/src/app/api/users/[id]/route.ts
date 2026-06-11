import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicUserSelect } from "@/lib/social";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: publicUserSelect(),
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ user });
}
