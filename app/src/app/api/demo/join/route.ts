import { handleDemoJoin } from "@/lib/demo/http-handlers";
import { withDemoRoute } from "@/lib/demo/route-response";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json();
  return withDemoRoute(() => handleDemoJoin(body));
}
