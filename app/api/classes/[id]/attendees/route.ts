import { connection } from "next/server";
import type { NextRequest } from "next/server";
import { getAttendees } from "@/lib/mock/classes";
import { delay, readLatency } from "@/lib/mock/delay";

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
      { error: "Could not load attendees for this class." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const attendees = getAttendees(id);
  if (!attendees) {
    return Response.json(
      { error: "Class not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(
    { data: attendees },
    { headers: { "Cache-Control": "no-store" } },
  );
}
