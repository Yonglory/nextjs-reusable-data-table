import { connection } from "next/server";
import type { NextRequest } from "next/server";
import { delay, readLatency } from "@/lib/mock/delay";
import { getVisits } from "@/lib/mock/members";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  const { id } = await params;
  const search = request.nextUrl.searchParams;
  await delay(readLatency(search.get("latency"), 800));

  if (search.get("fail") === "1") {
    return Response.json(
      { error: "Could not load recent visits for this member." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const visits = getVisits(id);
  if (!visits) {
    return Response.json(
      { error: "Member not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { data: visits },
    { headers: { "Cache-Control": "no-store" } },
  );
}
