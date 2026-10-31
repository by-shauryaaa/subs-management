import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Repeat,
  Receipt,
  Users,
  Settings,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../components/layout/page-header';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/status-badge';
export function Preview() {
  return (
    <>
      <PageHeader
        title="A clearer kind of recurring."
        description="Brightloop brings every subscription, invoice, and customer into focus."
        actions={
          <Button asChild>
            <Link to="/login">
              Go to sign in
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />
      <section className="mb-8 rounded-xl border border-border bg-surface p-8">
        <p className="font-editorial text-3xl text-accent">
          Clarity in every cycle.
        </p>
        <h2 className="mt-4 max-w-2xl font-heading text-4xl font-semibold leading-tight">
          Less chasing.
          <br />
          More growing.
        </h2>
        <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
          A connected workspace for the full subscription lifecycle. This is a
          visual preview; sign in to access your team's live records.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {[
            'DRAFT',
            'QUOTATION',
            'CONFIRMED',
            'ACTIVE',
            'PAUSED',
            'CLOSED',
          ].map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          {
            icon: Repeat,
            title: 'Subscriptions',
            description: 'From first quotation to the next renewal.',
          },
          {
            icon: Receipt,
            title: 'Invoices & payments',
            description: 'Know what is paid, due, and overdue.',
          },
          {
            icon: Users,
            title: 'Customers',
            description: 'A complete view of every relationship.',
          },
          {
            icon: BarChart3,
            title: 'Finance overview',
            description: 'Recurring revenue and billing, in focus.',
          },
          {
            icon: Settings,
            title: 'Your configuration',
            description: 'Plans, tax rates, and payment terms.',
          },
          {
            icon: ShieldCheck,
            title: 'Customer portal',
            description: 'A simpler way for customers to self-serve.',
          },
        ].map(({ icon: Icon, title, description }) => (
          <article
            key={title}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <Icon className="size-6 text-accent" strokeWidth={1.5} />
            <h3 className="mt-5 font-heading text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-muted-foreground">{description}</p>
          </article>
        ))}
      </div>
    </>
  );
}
