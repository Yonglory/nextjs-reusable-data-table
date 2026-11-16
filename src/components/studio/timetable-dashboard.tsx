"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import type { ColumnDef, SubRowStatus, TableStatus } from "@/components/data-table/types";
import {
  classStatusRank,
  type Attendee,
  type StudioClass,
} from "@/lib/mock/classes";
import { ScenarioControls, type Scenario } from "./scenario-controls";
import { StatusBadge } from "./status-badge";
import { useMockList } from "./use-mock-list";

type ExpansionMode = "inline" | "onDemand";

const classColumns: ColumnDef<StudioClass>[] = [
  {
    id: "name",
    header: "Class",
    accessor: (row) => row.name,
    cell: (row) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{row.name}</p>
        <p className="truncate text-xs text-stone-500">
          {row.day} · {row.room}
        </p>
      </div>
    ),
    sortable: true,
    width: 230,
    pinned: true,
  },
  {
    id: "instructor",
    header: "Instructor",
    accessor: (row) => row.instructor,
    sortable: true,
    width: 180,
  },
  {
    id: "time",
    header: "Time",
    accessor: (row) => row.startMinutes,
    cell: (row) => row.timeLabel,
    sortable: true,
    width: 210,
  },
  {
    id: "attendance",
    header: "Attendance",
    accessor: (row) => row.booked,
    cell: (row) => `${row.booked} / ${row.capacity}`,
    sortable: true,
    width: 140,
    align: "right",
  },
  {
    id: "status",
    header: "Status",
    accessor: (row) => classStatusRank[row.status],
    cell: (row) => <StatusBadge value={row.status} />,
    sortable: true,
    width: 150,
  },
];

const attendeeColumns: ColumnDef<Attendee>[] = [
  {
    id: "customerName",
    header: "Customer",
    accessor: (row) => row.customerName,
    sortable: true,
    width: 220,
    pinned: true,
  },
  {
    id: "paymentType",
    header: "Payment",
    accessor: (row) => row.paymentType,
    cell: (row) => <StatusBadge value={row.paymentType} />,
    sortable: true,
    width: 160,
  },
  {
    id: "bookingStatus",
    header: "Booking",
    accessor: (row) => row.bookingStatus,
    cell: (row) => <StatusBadge value={row.bookingStatus} />,
    sortable: true,
    width: 160,
  },
];

function getClassId(row: StudioClass) {
  return row.id;
}

function getAttendeeId(row: Attendee) {
  return row.id;
}

function getClassLabel(row: StudioClass) {
  return row.name;
}

function childStatus(status: SubRowStatus): TableStatus {
  if (status === "loading") return "loading";
  if (status === "error") return "error";
  return "ready";
}

export function TimetableDashboard() {
  const [mode, setMode] = useState<ExpansionMode>("inline");
  const [scenario, setScenario] = useState<Scenario>("ready");
  const [failChild, setFailChild] = useState(false);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (mode === "onDemand") params.set("includeAttendees", "0");
    if (scenario === "slow") params.set("latency", "1800");
    if (scenario === "error") params.set("fail", "1");
    if (scenario === "empty") params.set("empty", "1");
    const query = params.toString();
    return query ? `/api/classes?${query}` : "/api/classes";
  }, [mode, scenario]);

  const list = useMockList<StudioClass>(url);

  const loadAttendees = useCallback(async (row: StudioClass) => {
    const params = new URLSearchParams();
    if (failChild) params.set("fail", "1");
    const query = params.toString();
    const response = await fetch(
      `/api/classes/${row.id}/attendees${query ? `?${query}` : ""}`,
      { cache: "no-store" },
    );
    const body = (await response.json()) as { data?: Attendee[]; error?: string };
    if (!response.ok) {
      throw new Error(body.error || "Could not load attendees.");
    }
    return body.data ?? [];
  }, [failChild]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-accent">Weekly schedule</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Class timetable
          </h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Sort and page the full roster in the browser. Expand a class to see who
            is booked — either from the payload, or from a separate request.
          </p>
        </div>
        <ScenarioControls
          scenario={scenario}
          onScenario={setScenario}
          failChild={failChild}
          onFailChild={setFailChild}
          childLabel="Fail next attendee fetch"
        />
      </div>

      <div
        role="radiogroup"
        aria-label="Attendee loading"
        className="flex w-fit flex-wrap gap-1 rounded-full border border-line bg-surface p-1"
      >
        {(
          [
            ["inline", "Inline attendees"],
            ["onDemand", "Load on expand"],
          ] as const
        ).map(([value, label]) => {
          const selected = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(value)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                selected
                  ? "bg-accent font-medium text-white"
                  : "text-stone-600 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <DataTable
        key={mode}
        columns={classColumns}
        data={list.rows}
        getRowId={getClassId}
        getRowLabel={getClassLabel}
        status={list.status}
        errorMessage={list.error}
        onRetry={list.reload}
        emptyTitle="No classes scheduled"
        emptyDescription="The timetable is empty for this view. Switch back to Normal to restore the roster."
        ariaLabel="Class timetable"
        defaultSort={{ columnId: "time", direction: "asc" }}
        expandable={{
          mode,
          getSubRows: (row) => row.attendees ?? [],
          loadSubRows: loadAttendees,
          renderSubRows: ({ rows, status, error, retry }) => (
            <div>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-stone-800">Attendees</h2>
                {status === "ready" || status === "empty" ? (
                  <p className="text-xs text-stone-500">{rows.length} booked</p>
                ) : null}
              </div>
              <DataTable
                columns={attendeeColumns}
                data={status === "ready" || status === "empty" ? rows : []}
                getRowId={getAttendeeId}
                status={childStatus(status)}
                errorMessage={error}
                onRetry={retry}
                emptyTitle="No attendees booked"
                emptyDescription="This class has an empty roster."
                paginate={false}
                maxHeight={null}
                density="compact"
                ariaLabel="Attendees"
                skeletonRowCount={3}
              />
            </div>
          ),
        }}
      />
    </section>
  );
}
