import { connection } from "next/server";
import type { NextRequest } from "next/server";
import { getClasses, normalizeClassCount } from "@/lib/mock/classes";
import { delay, readLatency } from "@/lib/mock/delay";

export async function GET(request: NextRequest) {
  await connection();
  const params = request.nextUrl.searchParams;
  await delay(readLatency(params.get("latency")));

  if (params.get("fail") === "1") {
    return Response.json(
      { error: "Could not load the timetable. The studio service did not respond." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const includeAttendees = params.get("includeAttendees") !== "0";
  const count = normalizeClassCount(Number(params.get("size")));
  const data = params.get("empty") === "1" ? [] : getClasses(includeAttendees, count);

  return Response.json(
    { data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
