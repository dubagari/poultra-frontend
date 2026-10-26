import type { ReactNode } from "react";

export const formatNaira = (value: number): string =>
  `NGN ${value.toLocaleString("en-NG")}`;

export const formatDate = (value?: string): string =>
  value ? new Date(value).toLocaleDateString("en-NG") : "-";

export function AdminSectionCard(props: {
  title: string;
  description?: string;
  children: ReactNode;
}): ReactNode {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="text-sm font-medium text-muted-foreground">
        {props.title}
      </h3>
      <div className="mt-2">{props.children}</div>
      {props.description ? (
        <p className="mt-1 text-xs text-muted-foreground">{props.description}</p>
      ) : null}
    </div>
  );
}
