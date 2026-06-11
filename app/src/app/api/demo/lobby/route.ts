import { handleDemoLobby } from "@/lib/demo/http-handlers";
import { withDemoRoute } from "@/lib/demo/route-response";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  return withDemoRoute(async () => {
    const lobby = await handleDemoLobby();
    return { ...lobby, status: 200 };
  });
}
