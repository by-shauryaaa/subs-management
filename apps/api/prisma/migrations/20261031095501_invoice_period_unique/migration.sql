-- Cancelled invoices release their billing period so regeneration is possible.
CREATE UNIQUE INDEX "Invoice_subscription_period_active_key"
  ON "Invoice" ("subscriptionId", "periodStart")
  WHERE "status" <> 'CANCELLED';
