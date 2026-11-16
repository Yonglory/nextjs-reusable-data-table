"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import type {
  ColumnDef,
  SubRowStatus,
  TableStatus,
} from "@/components/data-table/types";
import { PageHeader } from "@/components/shell/page-header";
import {
  LARGE_CLASS_COUNT,
  classStatusRank,
  type Attendee,
  type StudioClass,
} from "@/lib/mock/classes";
import { AttendanceMeter } from "./attendance-meter";
import { ScenarioControls, type Scenario } from "./scenario-controls";
import { SegmentedControl } from "./segmented-control";
import { StatusBadge } from "./status-badge";
import { useMockList } from "./use-mock-list";

type ExpansionMode = "inline" | "onDemand";

// Column definitions are declared once, outside the component, so their identity
// is stable and the table never has to recompute its layout.
const classColumns: ColumnDef<StudioClass>[] = [
  {
    id: "name",
    header: "Class",
    accessor: (row) => row.name,
    cell: (row) => (
      <div className="min-w-0">
        <p className="truncate font-medium text-zinc-900">{row.name}</p>
        <p className="truncate text-xs text-zinc-500">
          {row.day} · {row.room}
        </p>
      </div>
    ),
    sortable: true,
    width: 240,
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
    cell: (row) => <AttendanceMeter booked={row.booked} capacity={row.capacity} />,
    sortable: true,
    width: 170,
    align: "right",
  },
  {
    id: "status",
    header: "Status",
    accessor: (row) => classStatusRank[row.status],
    cell: (row) => <StatusBadge value={row.status} />,
    sortable: true,
    width: 140,
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

// Stable function references, so memoised rows are not invalidated by new closures.
const getClassId = (row: StudioClass) => row.id;
const getAttendeeId = (row: Attendee) => row.id;
const getClassLabel = (row: StudioClass) => row.name;
const getInlineAttendees = (row: StudioClass) => row.attendees ?? [];

/** Maps the child fetch state onto the table's own loading / error / ready states. */
function childTableStatus(status: SubRowStatus): TableStatus {
  if (status === "loading") return "loading";
  if (status === "error") return "error";
  return "ready";
}

export function TimetableDashboard() {
  const [mode, setMode] = useState<ExpansionMode>("inline");
  const [scenario, setScenario] = useState<Scenario>("ready");
  const [failChild, setFailChild] = useState(false);

  // 10k rows would make an inline payload huge, so that scenario always loads on demand.
  const effectiveMode: ExpansionMode = scenario === "large" ? "onDemand" : mode;

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (effectiveMode === "onDemand") params.set("includeAttendees", "0");
    if (scenario === "large") params.set("size", String(LARGE_CLASS_COUNT));
    if (scenario === "slow") params.set("latency", "1800");
    if (scenario === "error") params.set("fail", "1");
    if (scenario === "empty") params.set("empty", "1");
    const query = params.toString();
    return query ? `/api/classes?${query}` : "/api/classes";
  }, [effectiveMode, scenario]);

  const list = useMockList<StudioClass>(url);

  const loadAttendees = useCallback(
    async (row: StudioClass) => {
      const query = failChild ? "?fail=1" : "";
      const response = await fetch(`/api/classes/${row.id}/attendees${query}`, {
        cache: "no-store",
      });
      const body = (await response.json()) as { data?: Attendee[]; error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Could not load attendees.");
      }
      return body.data ?? [];
    },
    [failChild],
  );

  return (
    <section className="space-y-5">
      <PageHeader
        title="Class timetable"
        description="Sort and page the full roster in the browser. Expand a class to see who is booked, either from the payload or from a separate request."
        actions={
          <ScenarioControls
            scenario={scenario}
            onScenario={setScenario}
            includeLarge
            failChild={failChild}
            onFailChild={setFailChild}
            childLabel="Fail attendee fetch"
          />
        }
      />

      <SegmentedControl
        label="Attendee loading"
        value={effectiveMode}
        onChange={setMode}
        options={[
          { value: "inline", label: "Inline attendees", disabled: scenario === "large" },
          { value: "onDemand", label: "Load on expand" },
        ]}
      />

      <DataTable
        key={effectiveMode}
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
          mode: effectiveMode,
          getSubRows: getInlineAttendees,
          loadSubRows: loadAttendees,
          renderSubRows: ({ rows, status, error, retry }) => (
            <div>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-[13px] font-semibold text-zinc-900">Attendees</h2>
                {status === "ready" || status === "empty" ? (
                  <p className="text-xs text-zinc-500">{rows.length} booked</p>
                ) : null}
              </div>
              <DataTable
                columns={attendeeColumns}
                data={status === "ready" || status === "empty" ? rows : []}
                getRowId={getAttendeeId}
                status={childTableStatus(status)}
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
