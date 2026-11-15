import type { Metadata } from "next";
import { MembersDashboard } from "@/components/studio/members-dashboard";

export const metadata: Metadata = {
  title: "Members",
};

export default function MembersPage() {
  return <MembersDashboard />;
}
