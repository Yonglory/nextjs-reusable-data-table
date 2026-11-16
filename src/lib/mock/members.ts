import { sortRows } from "@/components/data-table/sort";
import type { ColumnDef, SortState } from "@/components/data-table/types";

export type MemberPlan = "Drop-in" | "8-class pack" | "Monthly" | "Annual";
export type MemberStatus = "Active" | "Paused" | "Expired";

export type Member = {
  id: string;
  name: string;
  plan: MemberPlan;
  homeStudio: string;
  lastVisit: string;
  status: MemberStatus;
};

export type Visit = {
  id: string;
  date: string;
  className: string;
  instructor: string;
};

export const memberStatusRank: Record<MemberStatus, number> = {
  Active: 0,
  Paused: 1,
  Expired: 2,
};

const firstNames = [
  "Amina",
  "Ben",
  "Chloe",
  "Diego",
  "Elena",
  "Farah",
  "George",
  "Hannah",
  "Ivan",
  "Jules",
  "Kai",
  "Leila",
  "Marco",
  "Nina",
  "Omar",
  "Paige",
  "Quinn",
  "Rosa",
  "Samir",
];
const lastNames = [
  "Adler",
  "Bennett",
  "Cho",
  "Diaz",
  "Ellis",
  "Foster",
  "Garcia",
  "Hughes",
  "Ibrahim",
  "Jensen",
  "Khan",
  "Lopez",
  "Murphy",
  "Nguyen",
  "Owens",
  "Park",
  "Reed",
  "Santos",
  "Turner",
  "Walsh",
];
const plans: MemberPlan[] = ["Drop-in", "8-class pack", "Monthly", "Annual"];
const studios = ["Downtown", "Riverside", "North Hall"];
const classNames = ["Yoga Flow", "Spin", "Strength", "Barre", "Mobility", "Boxing"];
const instructors = ["John Doe", "Maya Chen", "Luis Ortega", "Ava Patel", "Noah Kim", "Sofia Rossi"];
const statuses: MemberStatus[] = ["Active", "Paused", "Expired"];

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function isoDaysBefore(days: number) {
  const date = new Date(Date.UTC(2026, 10, 15));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const sortColumns: ColumnDef<Member>[] = [
  { id: "name", header: "Member", accessor: (row) => row.name, sortable: true },
  { id: "plan", header: "Plan", accessor: (row) => row.plan, sortable: true },
  {
    id: "homeStudio",
    header: "Home studio",
    accessor: (row) => row.homeStudio,
    sortable: true,
  },
  {
    id: "lastVisit",
    header: "Last visit",
    accessor: (row) => new Date(`${row.lastVisit}T00:00:00Z`),
    sortable: true,
  },
  {
    id: "status",
    header: "Status",
    accessor: (row) => memberStatusRank[row.status],
    sortable: true,
  },
];

function buildMembers() {
  const random = createRng(42);
  const members: Member[] = [];
  const visits = new Map<string, Visit[]>();

  for (let index = 0; index < 500; index += 1) {
    const id = `mem-${(index + 1).toString().padStart(3, "0")}`;
    const first = firstNames[index % firstNames.length] ?? "Alex";
    const last = lastNames[Math.floor(random() * lastNames.length)] ?? "Stone";
    const status = statuses[index % 7 === 0 ? 2 : index % 5 === 0 ? 1 : 0] ?? "Active";
    const daysAgo =
      status === "Expired"
        ? 40 + Math.floor(random() * 80)
        : Math.floor(random() * 21);
    members.push({
      id,
      name: `${first} ${last}`,
      plan: plans[index % plans.length] ?? "Monthly",
      homeStudio: studios[index % studios.length] ?? "Downtown",
      lastVisit: isoDaysBefore(daysAgo),
      status,
    });

    const visitCount = index % 11 === 0 ? 0 : 1 + Math.floor(random() * 5);
    const memberVisits: Visit[] = [];
    for (let visitIndex = 0; visitIndex < visitCount; visitIndex += 1) {
      memberVisits.push({
        id: `${id}-v${visitIndex + 1}`,
        date: isoDaysBefore(daysAgo + visitIndex * 3),
        className: classNames[(index + visitIndex) % classNames.length] ?? "Yoga Flow",
        instructor: instructors[(index + visitIndex) % instructors.length] ?? "John Doe",
      });
    }
    visits.set(id, memberVisits);
  }

  return { members, visits };
}

const directory = buildMembers();

export function queryMembers(options: {
  pageIndex: number;
  pageSize: number;
  sort: SortState;
}) {
  const pageSize = [10, 25, 50].includes(options.pageSize) ? options.pageSize : 10;
  const sorted = sortRows(directory.members, sortColumns, options.sort);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageIndex = Math.min(
    Math.max(Number.isFinite(options.pageIndex) ? Math.trunc(options.pageIndex) : 0, 0),
    pageCount - 1,
  );
  const start = pageIndex * pageSize;
  return {
    data: sorted.slice(start, start + pageSize),
    total: sorted.length,
    pageIndex,
    pageSize,
  };
}

export function getVisits(memberId: string): Visit[] | null {
  return directory.visits.get(memberId) ?? null;
}
