import * as Dialog from '@radix-ui/react-dialog';
import {
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Repeat,
  FileStack,
  Users,
  Receipt,
  Wallet,
  Package,
  CalendarClock,
  Tags,
  Percent,
  Clock,
  BadgePercent,
  UserCog,
  PlayCircle,
  Settings,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Logo } from '../logo';
import { ThemeToggle } from '../theme-provider';
import { Button } from '../ui/button';
import { useAuth } from '../../auth/auth-provider';
import { cn } from '../../lib/utils';

const icons = {
  Dashboard: LayoutDashboard,
  Subscriptions: Repeat,
  'Quotation templates': FileStack,
  Customers: Users,
  Invoices: Receipt,
  Payments: Wallet,
  Products: Package,
  Plans: CalendarClock,
  Attributes: Tags,
  Taxes: Percent,
  'Payment terms': Clock,
  Discounts: BadgePercent,
  Users: UserCog,
  'Billing runs': PlayCircle,
  Settings,
};
function NavIcon({ label }: { label: string }) {
  const Icon = icons[label as keyof typeof icons] ?? Repeat;
  return (
    <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
  );
}
const groups = [
  { label: 'Overview', items: [['Dashboard', 'dashboard']] },
  {
    label: 'Sales',
    items: [
      ['Subscriptions', 'subscriptions'],
      ['Quotation templates', 'quotation-templates'],
      ['Customers', 'customers'],
    ],
  },
  {
    label: 'Billing',
    items: [
      ['Invoices', 'invoices'],
      ['Payments', 'payments'],
    ],
  },
  {
    label: 'Catalog',
    items: [
      ['Products', 'catalog/products'],
      ['Plans', 'catalog/plans'],
      ['Attributes', 'catalog/attributes'],
    ],
  },
  {
    label: 'Configuration',
    items: [
      ['Taxes', 'config/taxes'],
      ['Payment terms', 'config/payment-terms'],
      ['Discounts', 'config/discounts'],
    ],
  },
  {
    label: 'Admin',
    items: [
      ['Users', 'admin/users'],
      ['Billing runs', 'admin/billing-runs'],
      ['Settings', 'admin/settings'],
    ],
  },
];
function Navigation({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  return (
    <nav aria-label="Main navigation" className="space-y-6 p-3">
      {groups
        .filter((group) => group.label !== 'Admin' || user?.role === 'ADMIN')
        .map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <h2 className="mb-2 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group.label}
              </h2>
            )}
            <div className="space-y-1">
              {group.items.map(([label, path]) => (
                <NavLink
                  key={path}
                  to={`/app/${path}`}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-9 items-center gap-3 rounded-md border-l-3 border-transparent px-3 py-2 hover:bg-primary-soft',
                      isActive &&
                        'border-primary bg-primary-soft font-semibold text-primary',
                    )
                  }
                >
                  <NavIcon label={label ?? ''} />
                  {!collapsed && label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
    </nav>
  );
}
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const current = groups
    .flatMap((group) => group.items)
    .find(([, path]) => location.pathname === `/app/${path}`)?.[0];
  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-surface focus:p-4"
      >
        Skip to content
      </a>
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-muted lg:flex',
          collapsed ? 'w-16' : 'w-sidebar',
        )}
      >
        <div className="flex h-14 items-center justify-center border-b border-border px-4">
          {collapsed ? (
            <span aria-label="Brightloop" className="font-bold text-primary">
              b.
            </span>
          ) : (
            <Logo />
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <Navigation collapsed={collapsed} />
        </div>
        <Button
          variant="ghost"
          className="m-3"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </Button>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="size-5" />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/30" />
                <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-sidebar overflow-y-auto border-r border-border bg-surface">
                  <div className="flex items-center justify-between p-4">
                    <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                    <Logo />
                    <Dialog.Close asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Close navigation"
                      >
                        <X className="size-5" />
                      </Button>
                    </Dialog.Close>
                  </div>
                  <Dialog.Description className="sr-only">
                    Browse workspace pages.
                  </Dialog.Description>
                  <Navigation onNavigate={() => setMobileOpen(false)} />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <span className="text-muted-foreground">Workspace /</span>
            <span className="truncate font-medium">
              {current ?? 'Overview'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:block">
              {user?.name} · {user?.role}
            </span>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void logout();
              }}
            >
              Sign out
            </Button>
          </div>
        </header>
        <main id="main-content" className="mx-auto max-w-content p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
