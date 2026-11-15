import { connection } from "next/server";
import type { NextRequest } from "next/server";
import type { SortState } from "@/components/data-table/types";
import { delay, readLatency } from "@/lib/mock/delay";
import { queryMembers } from "@/lib/mock/members";

export async function GET(request: NextRequest) {
  await connection();
  const params = request.nextUrl.searchParams;
  await delay(readLatency(params.get("latency")));

  if (params.get("fail") === "1") {
    return Response.json(
      { error: "Could not load members. The directory service did not respond." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (params.get("empty") === "1") {
    return Response.json(
      { data: [], total: 0, pageIndex: 0, pageSize: 10 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const direction = params.get("dir") === "desc" ? "desc" : "asc";
  const sortId = params.get("sort");
  const sort: SortState = sortId ? { columnId: sortId, direction } : null;
  const page = queryMembers({
    pageIndex: Number(params.get("page") ?? 0),
    pageSize: Number(params.get("pageSize") ?? 10),
    sort,
  });

  return Response.json(page, { headers: { "Cache-Control": "no-store" } });
}
