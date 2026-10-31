import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '../lib/api-client';
import { Button } from '../components/ui/button';
import { EntitySelect } from './record-tools';
import { type Row, text } from './resource-page';
export function SubscriptionDiscounts({
  subscriptionId,
  discounts,
  editable,
}: {
  subscriptionId: string;
  discounts: Row[];
  editable: boolean;
}) {
  const client = useQueryClient();
  const [pending, setPending] = useState(false);
  async function change(discountId: string, remove = false) {
    setPending(true);
    try {
      await apiClient(
        `/subscriptions/${subscriptionId}/discounts${remove ? `/${discountId}` : ''}`,
        {
          method: remove ? 'DELETE' : 'POST',
          ...(remove ? {} : { body: JSON.stringify({ discountId }) }),
        },
      );
      await client.invalidateQueries();
      toast.success(remove ? 'Discount removed' : 'Discount attached');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to update discount',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h2 className="mb-4 font-heading text-xl">Discounts</h2>
      {discounts.length ? (
        discounts.map((link) => {
          const discount =
            typeof link.discount === 'object' && link.discount
              ? (link.discount as Row)
              : link;
          return (
            <div key={discount.id} className="mb-4 border-b border-border pb-3">
              <p>{text(discount.name)}</p>
              {discount.usageLimit != null && (
                <p className="text-xs text-muted-foreground">
                  {text(discount.usageCount)} / {text(discount.usageLimit)} uses
                  {Number(discount.usageCount) >= Number(discount.usageLimit)
                    ? ' · Used up'
                    : ''}
                </p>
              )}
              {editable && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Remove this discount from future billing?',
                      )
                    )
                      void change(discount.id, true);
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          );
        })
      ) : (
        <p className="text-muted-foreground">No discounts attached.</p>
      )}
      {editable && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void change(String(form.get('discountId')));
          }}
        >
          <EntitySelect
            endpoint="/discounts"
            name="discountId"
            label="Discount"
            required
          />
          <Button disabled={pending} variant="outline">
            Attach discount
          </Button>
        </form>
      )}
    </div>
  );
}
