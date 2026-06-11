import { NextResponse } from "next/server";

export function demoJsonResponse(result: { status: number } & Record<string, unknown>) {
  const { status, ...body } = result;
  return NextResponse.json(body, { status });
}

export async function withDemoRoute<T extends { status: number } & Record<string, unknown>>(
  fn: () => Promise<T>
): Promise<NextResponse> {
  try {
    return demoJsonResponse(await fn());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    const busy = /busy/i.test(message);
    return NextResponse.json(
      { ok: false, error: busy ? "Table busy — try again in a moment" : message },
      { status: busy ? 503 : 500 }
    );
  }
}
