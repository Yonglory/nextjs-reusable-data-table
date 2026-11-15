import type { Metadata } from "next";
import { TimetableDashboard } from "@/components/studio/timetable-dashboard";

export const metadata: Metadata = {
  title: "Class timetable",
};

export default function HomePage() {
  return <TimetableDashboard />;
}
