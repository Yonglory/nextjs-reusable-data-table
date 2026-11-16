import type { ReactNode } from "react";

/** Title block shared by every screen: heading and description on the left, controls on the right. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="max-w-xl">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        <p className="mt-1 text-[13px] leading-5 text-zinc-500">{description}</p>
      </div>
      {actions}
    </div>
  );
}
