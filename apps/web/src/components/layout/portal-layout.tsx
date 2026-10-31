import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from '../logo';
import { ThemeToggle } from '../theme-provider';
import { cn } from '../../lib/utils';
export function PortalLayout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-portal flex-wrap items-center justify-between gap-4 p-4">
          <Logo />
          <nav
            aria-label="Customer navigation"
            className="flex flex-wrap gap-4"
          >
            {[
              { label: 'Home', path: '/portal' },
              { label: 'Subscriptions', path: '/portal/subscriptions' },
              { label: 'Invoices', path: '/portal/invoices' },
              { label: 'Profile', path: '/portal/profile' },
            ].map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/portal'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center border-b-2 border-transparent py-2',
                    isActive && 'border-primary font-semibold text-primary',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-portal p-4 text-base md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
