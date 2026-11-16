"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import type {
  ColumnDef,
  PaginationState,
  SortState,
  SubRowStatus,
  TableStatus,
} from "@/components/data-table/types";
import { PageHeader } from "@/components/shell/page-header";
import { formatIsoDate } from "@/lib/format";
import {
  memberStatusRank,
  type Member,
  type Visit,
} from "@/lib/mock/members";
import { ScenarioControls, type Scenario } from "./scenario-controls";
import { StatusBadge } from "./status-badge";
import { useMockList } from "./use-mock-list";

const memberColumns: ColumnDef<Member>[] = [
  {
    id: "name",
    header: "Member",
    accessor: (row) => row.name,
    cell: (row) => <span className="font-medium text-zinc-900">{row.name}</span>,
    sortable: true,
    width: 220,
    pinned: true,
  },
  {
    id: "plan",
    header: "Plan",
    accessor: (row) => row.plan,
    sortable: true,
    width: 160,
  },
  {
    id: "homeStudio",
    header: "Home studio",
    accessor: (row) => row.homeStudio,
    sortable: true,
    width: 170,
  },
  {
    id: "lastVisit",
    header: "Last visit",
    accessor: (row) => new Date(`${row.lastVisit}T00:00:00Z`),
    cell: (row) => formatIsoDate(row.lastVisit),
    sortable: true,
    width: 160,
  },
  {
    id: "status",
    header: "Status",
    accessor: (row) => memberStatusRank[row.status],
    cell: (row) => <StatusBadge value={row.status} />,
    sortable: true,
    width: 140,
  },
];

const visitColumns: ColumnDef<Visit>[] = [
  {
    id: "date",
    header: "Date",
    accessor: (row) => new Date(`${row.date}T00:00:00Z`),
    cell: (row) => formatIsoDate(row.date),
    sortable: true,
    width: 160,
    pinned: true,
  },
  {
    id: "className",
    header: "Class",
    accessor: (row) => row.className,
    sortable: true,
    width: 200,
  },
  {
    id: "instructor",
    header: "Instructor",
    accessor: (row) => row.instructor,
    sortable: true,
    width: 180,
  },
];

function getMemberId(row: Member) {
  return row.id;
}

function getVisitId(row: Visit) {
  return row.id;
}

function childStatus(status: SubRowStatus): TableStatus {
  if (status === "loading") return "loading";
  if (status === "error") return "error";
  return "ready";
}

export function MembersDashboard() {
  const [scenario, setScenario] = useState<Scenario>("ready");
  const [failChild, setFailChild] = useState(false);
  const [sort, setSort] = useState<SortState>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(pagination.pageIndex));
    params.set("pageSize", String(pagination.pageSize));
    if (sort) {
      params.set("sort", sort.columnId);
      params.set("dir", sort.direction);
    }
    if (scenario === "slow") params.set("latency", "1800");
    if (scenario === "error") params.set("fail", "1");
    if (scenario === "empty") params.set("empty", "1");
    return `/api/members?${params.toString()}`;
  }, [pagination.pageIndex, pagination.pageSize, scenario, sort]);

  const list = useMockList<Member>(url);

  const loadVisits = useCallback(async (row: Member) => {
    const params = new URLSearchParams();
    if (failChild) params.set("fail", "1");
    const query = params.toString();
    const response = await fetch(
      `/api/members/${row.id}/visits${query ? `?${query}` : ""}`,
      { cache: "no-store" },
    );
    const body = (await response.json()) as { data?: Visit[]; error?: string };
    if (!response.ok) {
      throw new Error(body.error || "Could not load visits.");
    }
    return body.data ?? [];
  }, [failChild]);

  return (
    <section className="space-y-5">
      <PageHeader
        title="Members"
        description="Same table, different columns. Sort and page size are sent to the API, which returns one page of 500 members. Visits load the first time a row opens."
        actions={
          <ScenarioControls
            scenario={scenario}
            onScenario={setScenario}
            failChild={failChild}
            onFailChild={setFailChild}
            childLabel="Fail visit fetch"
          />
        }
      />

      <DataTable
        columns={memberColumns}
        data={list.rows}
        getRowId={getMemberId}
        getRowLabel={(row) => row.name}
        status={list.status}
        errorMessage={list.error}
        onRetry={list.reload}
        emptyTitle="No members found"
        emptyDescription="The directory is empty for this view. Switch back to Normal to restore it."
        ariaLabel="Members"
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPagination((current) => ({ ...current, pageIndex: 0 }));
        }}
        manualSorting
        pagination={pagination}
        onPaginationChange={setPagination}
        manualPagination
        rowCount={list.total}
        expandable={{
          mode: "onDemand",
          loadSubRows: loadVisits,
          renderSubRows: ({ rows, status, error, retry }) => (
            <div>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-[13px] font-semibold text-zinc-900">Recent visits</h2>
                {status === "ready" || status === "empty" ? (
                  <p className="text-xs text-zinc-500">
                    {rows.length === 1 ? "1 visit" : `${rows.length} visits`}
                  </p>
                ) : null}
              </div>
              <DataTable
                columns={visitColumns}
                data={status === "ready" || status === "empty" ? rows : []}
                getRowId={getVisitId}
                status={childStatus(status)}
                errorMessage={error}
                onRetry={retry}
                emptyTitle="No recent visits"
                emptyDescription="This member has not checked in recently."
                paginate={false}
                maxHeight={null}
                density="compact"
                ariaLabel="Recent visits"
                skeletonRowCount={3}
              />
            </div>
          ),
        }}
      />
    </section>
  );
}
