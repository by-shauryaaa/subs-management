import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/theme-provider';
import { AuthLayout } from './components/layout/auth-layout';
import { AppLayout } from './components/layout/app-layout';
import { PortalLayout } from './components/layout/portal-layout';
import { PageHeader } from './components/layout/page-header';
import { EmptyState } from './components/empty-state';
import { Button } from './components/ui/button';
import { AuthProvider, RequireRole } from './auth/auth-provider';
import { AuthPage } from './auth/auth-pages';
import { ResourcePage } from './features/resource-page';
import { resources } from './features/resources';
import { Preview } from './features/preview';
import { Dashboard } from './features/dashboard';
import {
  SubscriptionList,
  SubscriptionForm,
  SubscriptionDetail,
} from './features/subscriptions';
import { InvoiceList, InvoiceDetail } from './features/invoices';
import { SettingsPage } from './features/settings';
import { CustomerDetail } from './features/customer-detail';
import { BillingRuns } from './features/billing-runs';
import { PortalHome, PortalProfile } from './features/portal';
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});
function WorkspacePlaceholder() {
  return (
    <>
      <PageHeader
        title="Workspace"
        description="Your subscription operations, together."
      />
      <div className="rounded-lg border border-border bg-surface">
        <EmptyState
          title="Your workspace is taking shape"
          description="Account services and feature pages will be connected as the build progresses."
          action={
            <Button asChild>
              <Link to="/login">Back to welcome</Link>
            </Button>
          }
        />
      </div>
    </>
  );
}
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/preview" element={<AppLayout />}>
                <Route index element={<Preview />} />
              </Route>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route element={<AuthLayout />}>
                {[
                  'login',
                  'signup',
                  'forgot-password',
                  'reset-password',
                  'accept-invite',
                ].map((path) => (
                  <Route key={path} path={`/${path}`} element={<AuthPage />} />
                ))}
              </Route>
              <Route element={<RequireRole roles={['ADMIN', 'STAFF']} />}>
                <Route path="/app" element={<AppLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  {Object.entries({
                    'config/taxes': 'taxes',
                    'config/payment-terms': 'terms',
                    'catalog/plans': 'plans',
                    customers: 'customers',
                  }).map(([path, key]) => (
                    <Route
                      key={path}
                      path={path}
                      element={<ResourcePage config={resources[key]!} />}
                    />
                  ))}
                  <Route element={<RequireRole roles={['ADMIN']} />}>
                    <Route
                      path="admin/users"
                      element={<ResourcePage config={resources.users!} />}
                    />
                    <Route path="admin/settings" element={<SettingsPage />} />
                    <Route
                      path="admin/billing-runs"
                      element={<BillingRuns />}
                    />
                  </Route>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="subscriptions" element={<SubscriptionList />} />
                  <Route
                    path="subscriptions/new"
                    element={<SubscriptionForm />}
                  />
                  <Route
                    path="subscriptions/:id"
                    element={<SubscriptionDetail />}
                  />
                  <Route path="invoices" element={<InvoiceList />} />
                  <Route path="invoices/:id" element={<InvoiceDetail />} />
                  <Route path="customers/:id" element={<CustomerDetail />} />
                  <Route path="*" element={<WorkspacePlaceholder />} />
                </Route>
              </Route>
              <Route element={<RequireRole roles={['CUSTOMER']} />}>
                <Route path="/portal" element={<PortalLayout />}>
                  <Route index element={<PortalHome />} />
                  <Route
                    path="subscriptions"
                    element={<SubscriptionList portal />}
                  />
                  <Route
                    path="subscriptions/:id"
                    element={<SubscriptionDetail portal />}
                  />
                  <Route path="invoices" element={<InvoiceList portal />} />
                  <Route
                    path="invoices/:id"
                    element={<InvoiceDetail portal />}
                  />
                  <Route path="profile" element={<PortalProfile />} />
                  <Route path="*" element={<WorkspacePlaceholder />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
