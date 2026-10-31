import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <div className="rounded-full bg-primary-soft p-4 text-primary">
        <Icon className="size-10" strokeWidth={1.75} aria-hidden="true" />
      </div>
      <div>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
