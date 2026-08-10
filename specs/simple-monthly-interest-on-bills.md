# Simple Monthly Interest on Bills

**Status:** Draft  
**Owners:** Product and Engineering  
**Last updated:** 2026-08-09  
**Target:** Kino bill management  
**Related preview:** `app/app/wallets/[walletId]/statement/page.tsx`

## 1. Summary

Kino will support optional simple monthly interest on unpaid bills. A bill is considered on time when its original principal is fully paid within the same calendar month as its due date. If principal remains unpaid on the first day of the following month, Kino assesses one month of interest. The same assessment repeats on the first day of each later month while principal remains unpaid.

Interest is calculated only on unpaid principal. Accrued interest is never added to the principal used by later calculations, so interest does not compound.

The feature must work for one-off and recurrent bills, partial payments, late payments, historical recalculation, printed statements, reports, and wallet totals. Every assessed charge must be persisted as an immutable ledger entry so that balances are explainable and reproducible.

This specification replaces on-the-fly preview calculations as the source of truth once the production feature is enabled. The existing statement preview remains useful until persisted interest is implemented and may later be retained as a separate forecasting tool.

## 2. Goals

1. Allow an owner or editor to enable simple monthly interest on a bill.
2. Accept an annual nominal interest rate, displayed as a percentage and stored precisely.
3. Default the annual rate field to 9% when interest is first enabled.
4. Give the entire due-date calendar month as a grace period.
5. Assess interest once per overdue calendar month on unpaid principal.
6. Never charge interest on previously accrued interest.
7. Correctly account for partial payments and payments made on month boundaries.
8. Persist each assessment with enough information to audit the calculation.
9. Include interest in bill balances, wallet amounts owed, statements, exports, and reports.
10. Make automated assessment idempotent and safe to retry.
11. Preserve historical results when a recurrent bill's settings change.
12. Maintain current wallet-based authorization and row-level security behavior.

## 3. Non-goals

The first production release will not support:

- Daily interest or daily accrual.
- Compound interest.
- Flat late fees.
- A fixed fee plus interest.
- Tiered or escalating rates.
- Variable benchmark rates.
- Per-day grace periods.
- Waiving only part of a monthly assessment through the standard UI.
- Automatically determining a legally permitted rate.
- Automatically collecting money or initiating payment transactions.
- Changing the principal of an existing bill when interest is assessed.
- Interest across currencies or currency conversion within a bill.

The schema should not over-generalize for these cases. It should leave a reasonable migration path, but the implemented behavior must remain simple and explicit.

## 4. Terminology

### 4.1 Principal

The bill's original `amount_cents`. Interest charges never change this value.

### 4.2 Payment

The absolute amount of a transaction linked through `bill_payments`. The transaction's `date` determines whether it reduces principal before a monthly assessment.

### 4.3 Due month

The calendar month containing `bills.due_date`. For a due date of January 3 or January 31, the due month is January in both cases.

### 4.4 Assessment date

The first calendar day of an overdue month. The first possible assessment date is the first day of the month immediately after the due month.

### 4.5 Unpaid principal

The portion of the original principal not covered by linked payments dated before a given assessment date.

### 4.6 Accrued interest

The sum of persisted, active interest assessments for a bill.

### 4.7 Simple monthly interest

Interest calculated independently each month using unpaid principal only. Prior interest is excluded from the base.

### 4.8 Annual nominal rate

The user-entered annual percentage divided by 12 to obtain the monthly rate. This is not an effective annual yield.

## 5. Product rules

### 5.1 Enabling interest

- Interest is disabled by default for existing and newly created bills.
- When a user enables it, the rate input defaults to 9% unless a rate was already entered.
- A rate of 0% is valid but produces no charges. The UI should normally encourage disabling interest instead of saving an enabled 0% policy.
- The supported range is 0% through 100%, inclusive. This is a technical validation range, not a statement of legal permissibility.
- The UI must state that users are responsible for choosing an appropriate rate.

### 5.2 Calendar-month grace rule

- No interest is assessed during the bill's due month.
- A payment dated on or before the last day of the due month counts as on time.
- If principal remains at the start of the next month, the first assessment is due.
- A payment dated on the first day of an overdue month does not prevent that month's assessment. Because transactions currently use dates rather than timestamps, the assessment is logically evaluated before payments dated on the same day.
- This ordering must be displayed in helper text and covered by tests.

### 5.3 Monthly rate

Given an annual rate in basis points:

```text
annual rate decimal = annual_rate_bps / 10,000
monthly rate decimal = annual_rate_bps / 120,000
```

Examples:

| Annual rate | Stored basis points | Monthly rate |
|---:|---:|---:|
| 0% | 0 | 0% |
| 9% | 900 | 0.75% |
| 12% | 1,200 | 1% |
| 24% | 2,400 | 2% |

### 5.4 Assessment formula

For each assessment month:

```text
payments_before_assessment = sum(abs(linked payment amounts))
                              where payment date < assessment date

unpaid_principal = max(0, original principal - payments_before_assessment)

interest_charge = round(unpaid_principal * annual_rate_bps / 120,000)
```

All calculations are performed in cents. Positive half-cent results round to the nearest cent using half-up behavior. Application code and database code must produce identical results for positive monetary values.

### 5.5 No compounding

The following values must never be included in `unpaid_principal`:

- Earlier monthly interest assessments.
- Manual interest adjustments.
- Other late fees added in a future release.

If a $1,000 principal remains entirely unpaid at 12% annually, every monthly assessment is $10. The second assessment is not calculated on $1,010.

### 5.6 Payment allocation

For compatibility with the current bill model, payments use principal-first allocation:

1. Linked payments reduce principal until principal reaches zero.
2. Any excess linked payment amount reduces accrued interest.
3. Any amount beyond principal plus interest is an overpayment.

Derived amounts are:

```text
total_paid = sum(abs(linked payment amounts))
principal_paid = min(principal, total_paid)
interest_paid = min(accrued_interest, max(0, total_paid - principal))
principal_remaining = max(0, principal - principal_paid)
interest_remaining = max(0, accrued_interest - interest_paid)
total_remaining = principal_remaining + interest_remaining
overpayment = max(0, total_paid - principal - accrued_interest)
```

This policy means a partial payment reduces the base of future assessments immediately, which is simple and favorable to the payer. If the product later adopts interest-first allocation, that is a breaking accounting change and requires a separate specification and migration.

### 5.7 Bill status

Bill status must consider both principal and persisted interest:

| Condition | Status |
|---|---|
| `total_remaining = 0` and no overpayment | Paid |
| `total_paid > 0` and `total_remaining > 0` | Partial |
| `total_paid = 0` and `total_remaining > 0` | Unpaid |
| `principal_remaining > 0` and current date is after due month | Overdue |
| `principal_remaining = 0` but `interest_remaining > 0` | Interest due |
| `overpayment > 0` | Overpaid |

The visual design may combine Partial and Overdue, but the underlying derived flags must remain available.

### 5.8 Disabling or changing a policy

- Disabling interest stops future assessments.
- Disabling does not delete or waive existing assessments.
- Changing the annual rate affects future assessments only.
- Each charge stores the rate used when it was assessed.
- Previously assessed charges are immutable. Corrections use an adjustment or void workflow.
- Editing a recurrent bill affects only bill instances generated afterward unless the user explicitly chooses to update open instances in a future bulk-edit feature.

## 6. Worked examples

### 6.1 Paid within the due month

```text
Principal: $1,000
Due date: 2026-01-10
Annual rate: 12%
Payment: $1,000 on 2026-01-31
```

At the February 1 boundary, unpaid principal is $0. No interest is assessed.

### 6.2 Paid on the first day of the following month

```text
Principal: $1,000
Due date: 2026-01-10
Annual rate: 12%
Payment: $1,000 on 2026-02-01
```

At the February 1 boundary, the payment is not yet counted because its date is not earlier than the boundary. Interest is `$1,000 × 1% = $10`. The payment covers the $1,000 principal, leaving $10 interest due. No March interest is assessed because principal is zero before March 1.

### 6.3 Partial payments

```text
Principal: $1,000
Due date: 2026-01-10
Annual rate: 12%
Payment: $400 on 2026-01-31
Payment: $100 on 2026-02-15
As of: 2026-03-01
```

| Assessment | Unpaid principal | Rate | Interest |
|---|---:|---:|---:|
| 2026-02-01 | $600 | 1% | $6 |
| 2026-03-01 | $500 | 1% | $5 |
| Total | | | $11 |

Total payments are $500. Under principal-first allocation, principal remaining is $500 and interest remaining is $11. Total remaining is $511.

### 6.4 No payments for three overdue months

```text
Principal: $1,000
Due date: 2026-01-31
Annual rate: 9%
As of: 2026-04-01
Monthly rate: 0.75%
```

Assessments occur February 1, March 1, and April 1. Each is `$7.50`, for total interest of `$22.50`. The April calculation still uses $1,000, not $1,015.

### 6.5 Rounding

```text
Principal: $1.00
Annual rate: 9%
Monthly raw interest: $0.0075
Rounded monthly assessment: $0.01
```

Rounding occurs per assessment, not once after summing unrounded monthly values.

## 7. Data model

### 7.1 Changes to `recurrent_bills`

Add:

```sql
interest_enabled boolean not null default false,
annual_interest_rate_bps integer null,
interest_method text not null default 'simple_monthly',
interest_grace_rule text not null default 'end_of_due_month'
```

Constraints:

```sql
check (annual_interest_rate_bps is null or annual_interest_rate_bps between 0 and 10000)
check (interest_method = 'simple_monthly')
check (interest_grace_rule = 'end_of_due_month')
check (
  (interest_enabled = false)
  or (annual_interest_rate_bps is not null)
)
```

`annual_interest_rate_bps` may remain populated when interest is disabled so toggling it back on can restore the previous value. Application forms default a missing value to 900.

### 7.2 Changes to `bills`

Add the same four policy snapshot fields:

```sql
interest_enabled boolean not null default false,
annual_interest_rate_bps integer null,
interest_method text not null default 'simple_monthly',
interest_grace_rule text not null default 'end_of_due_month'
```

These fields are a snapshot of the policy for the individual bill. Generated bill instances copy them from `recurrent_bills`. They must not be joined dynamically from the recurrent parent because parent edits must not rewrite history.

### 7.3 New table: `bill_interest_charges`

```sql
create table public.bill_interest_charges (
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  assessment_month date null,
  charge_type text not null default 'monthly_interest',
  base_principal_cents integer not null,
  annual_interest_rate_bps integer not null,
  amount_cents integer not null,
  currency text not null,
  reason text null,
  voided_at timestamptz null,
  voided_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id),
  constraint bill_interest_charge_type_check
    check (charge_type in ('monthly_interest', 'adjustment')),
  constraint bill_interest_charge_base_check
    check (base_principal_cents >= 0),
  constraint bill_interest_charge_rate_check
    check (annual_interest_rate_bps between 0 and 10000),
  constraint bill_interest_charge_month_check
    check (
      (charge_type = 'monthly_interest' and assessment_month is not null)
      or charge_type = 'adjustment'
    )
);
```

Indexes:

```sql
create unique index bill_interest_charges_monthly_unique
  on public.bill_interest_charges (bill_id, assessment_month)
  where charge_type = 'monthly_interest';

create index bill_interest_charges_bill_id_idx
  on public.bill_interest_charges (bill_id);

create index bill_interest_charges_assessment_month_idx
  on public.bill_interest_charges (assessment_month);
```

The unique monthly index is the primary idempotency guarantee. A voided monthly assessment still occupies its bill/month pair; corrections are represented as adjustments rather than silently recreating the assessment.

### 7.4 Charge immutability

- Standard application roles may insert monthly charges only through a controlled database function or trusted server path.
- Standard users must not update `base_principal_cents`, rate, amount, currency, bill, or assessment month after insertion.
- Voiding is an explicit operation that records actor and timestamp.
- A compensating adjustment records any correction amount and reason.
- Hard deletion is reserved for cascading deletion of the parent bill or administrative repair.

### 7.5 Generated Supabase types

After the migration:

```bash
npm run supabase:types
```

Update all affected insert and update objects. In particular, the recurring-bill generator must copy policy fields to `bills`.

## 8. Authorization and row-level security

`bill_interest_charges` follows the parent bill's wallet permissions:

- Owners and editors may read charges for accessible wallets.
- Owners and editors may invoke approved assessment, void, and adjustment operations.
- View-only members may read charges but may not modify them.
- Service-role cron execution bypasses RLS only within the trusted server route.
- No user may attach a charge to a bill in a wallet they cannot access.

Policies should use the same `bills → wallets → user_wallets` relationship as `bill_payments`. Role checks must match the current owner/editor convention rather than older editor-only migrations.

Security tests must cover cross-wallet reads and writes, not only UI visibility.

## 9. Interest assessment service

### 9.1 Pure calculation function

Maintain a pure, deterministic TypeScript function for previewing and testing interest. It must accept:

```ts
interface SimpleMonthlyInterestInput {
  annualRateBps: number;
  asOfDate: string;
  dueDate: string;
  payments: Array<{ amountCents: number; date: string }>;
  principalCents: number;
}
```

It should return both totals and per-month details:

```ts
interface MonthlyInterestAssessment {
  assessmentMonth: string;
  basePrincipalCents: number;
  annualRateBps: number;
  interestCents: number;
}
```

The current preview helper returns only a total. Production implementation should extend it or add a detail-producing function, with the total derived by reducing the details.

### 9.2 Authoritative database function

Create a transaction-safe function such as:

```text
assess_bill_interest(p_bill_id uuid, p_as_of_date date)
```

Responsibilities:

1. Lock the bill row or otherwise serialize assessments for the same bill.
2. Confirm interest is enabled and the policy is valid.
3. Determine every eligible assessment month from the first month after the due month through `p_as_of_date`.
4. Skip months already represented by a monthly charge.
5. Calculate unpaid principal at each boundary using payments with `transaction.date < assessment_month`.
6. Stop after principal reaches zero.
7. Insert one immutable charge per missing eligible month.
8. Rely on the unique index as final protection against duplicates.
9. Return inserted charges and derived totals.

The function must support catch-up. If the job did not run for three months, the next run creates all three missing assessments with the correct historical principal bases.

### 9.3 Daily scheduled job

Extend the existing daily task infrastructure or add a dedicated protected route. The job runs daily rather than only on the first day so missed executions can self-heal.

Candidate bills must satisfy all of the following:

- `interest_enabled = true`.
- `annual_interest_rate_bps > 0`.
- Due month ends before the job's `as_of_date` month.
- Principal may remain unpaid at one or more missing assessment boundaries.

The job should process candidates in bounded batches and report:

- Bills examined.
- Bills assessed.
- Charges inserted.
- Total interest inserted by currency.
- Bills skipped because principal was paid.
- Invalid policies.
- Errors by bill ID, without exposing private descriptions in logs.

One bill failure must not prevent other bills from being assessed. Retrying must be safe.

### 9.4 Date and timezone semantics

All core inputs are SQL `date` values. Month boundaries are calendar dates, not elapsed 30-day periods.

- The scheduled job derives `as_of_date` using the configured business/workspace timezone if one exists.
- Until workspace timezones exist, use one documented application timezone consistently.
- TypeScript calculations should construct dates in UTC or operate on year/month integers to avoid browser or server timezone shifts.
- Never parse `YYYY-MM-DD` into a local JavaScript `Date` and compare it without controlling timezone behavior.

## 10. Query and derived-type changes

Extend `BillWithPayments` with:

```ts
interest_charges: BillInterestCharge[];
accrued_interest_cents: number;
interest_paid_cents: number;
interest_remaining_cents: number;
principal_paid_cents: number;
principal_remaining_cents: number;
total_remaining_cents: number;
overpayment_cents: number;
```

All consumers must use the shared derivation rather than recomputing different variants locally.

Update at least:

- `listBillsWithPayments`.
- Single-bill queries.
- `getWalletOwed`.
- Wallet monthly owed triggers or cached fields.
- Bill burden and cash-flow queries.
- Bill payment rate and history charts.
- Workspace financial reports.
- AI finance-copilot bill summaries.
- Printed bill pages and wallet statements.
- CSV or other exports containing bill balances.
- Transaction-to-bill linking and split confirmation logic.

`getWalletOwed` must sum `total_remaining_cents`, clamped at zero per bill, rather than principal remaining alone.

## 11. User experience

### 11.1 One-off bill form

Add an **Apply interest when overdue** switch. When enabled, show:

- **Annual interest rate** numeric input with `%` suffix.
- Default value of `9.00`.
- Monthly equivalent helper, such as `0.75% per overdue month`.
- Grace helper: `No interest during the due month. Interest starts on the first day of the next month.`
- Boundary warning: `A payment dated on the first day of the next month is late.`
- Non-legal-advice copy: `Confirm that this rate is appropriate for your agreement and location.`

Validation errors must be inline and must prevent submission.

### 11.2 Recurrent bill form

Use the same fields. Explain that changes apply to future generated bills. The form must not imply that updating the recurrent bill changes prior instances or existing charges.

### 11.3 Bill list and detail

For each bill, display:

- Original principal.
- Principal paid.
- Principal remaining.
- Accrued interest.
- Interest paid.
- Interest remaining.
- Total remaining.
- Current annual rate.
- Next assessment date and estimated next charge, when principal remains.

The detail view should include an interest history table:

| Assessment month | Base principal | Annual rate | Charge | State |
|---|---:|---:|---:|---|

Voided charges and adjustments must remain visible with clear labels.

### 11.4 Statement

The production statement must distinguish authoritative charges from previews.

Persisted mode:

- Show accrued interest per bill.
- Show principal remaining and interest remaining separately.
- Show total interest in the summary.
- Include interest in total remaining.
- Print the applied rate and statement `as of` date.
- Label any unassessed future value as an estimate.

Preview mode:

- Continue accepting an annual rate without saving it.
- Clearly label all values `Preview`.
- Do not mix preview interest with persisted interest in the same total.
- If a bill already has persisted charges, either disable preview for that bill or show persisted and additional projected interest in separate columns.

### 11.5 Accessibility and formatting

- Inputs require visible labels and accessible descriptions.
- Do not communicate status by color alone.
- Currency values use the bill's currency.
- Rates display with up to two decimal places by default while preserving basis-point precision.
- Tables must remain legible in A4 portrait printing; if necessary, use abbreviated headers or a bill detail continuation rather than shrinking below readable text.

## 12. Notifications

Notification work may be delivered separately, but the data model should support:

- Reminder before the due month ends.
- Notice when an interest charge is assessed.
- Notice before the next monthly assessment.

Notifications must use deduplication keys containing bill ID, assessment month, recipient, and notification type.

## 13. Reporting and analytics

Interest must remain separate from principal in analytical data.

Required metrics:

- Interest assessed by month and currency.
- Interest paid by month and currency.
- Interest remaining.
- Count of bills incurring interest.
- Average effective interest burden per overdue bill.

Do not count an interest assessment as a transaction expense unless a corresponding financial transaction exists. It is an amount owed, not necessarily cash movement.

Historical reports must use persisted charges, not recalculate them using the bill's current rate.

## 14. API and server-action behavior

Create and update inputs should use an explicit policy shape:

```ts
interface SimpleMonthlyInterestPolicyInput {
  enabled: boolean;
  annualRatePercent: number | null;
}
```

Server boundaries must:

1. Validate authorization.
2. Convert percent to basis points without floating-point drift.
3. Reject non-finite numbers.
4. Enforce the supported range.
5. Store `null` or the last valid rate according to the form behavior.
6. Never trust client-computed interest amounts.

Suggested conversion:

```text
annual_rate_bps = round(annualRatePercent × 100)
```

Assessment creation accepts policy identifiers and source data, never a client-provided final charge amount.

## 15. Error handling and observability

### 15.1 User-facing errors

- Invalid rate: `Enter an annual rate from 0% to 100%.`
- Missing rate: `Enter an annual interest rate.`
- Failed assessment: `Interest could not be assessed. No duplicate charge was created.`
- Stale bill update: refresh the bill and ask the user to retry.

### 15.2 Logging

Structured logs should include:

- Operation name.
- Bill ID.
- Wallet ID.
- Assessment month.
- Base principal cents.
- Rate basis points.
- Charge cents.
- Whether the insert was new, skipped, or conflicted.
- Request or cron run ID.

Do not log user-entered bill descriptions or transaction descriptions.

### 15.3 Monitoring

Track:

- Cron success rate and duration.
- Candidate and assessed bill counts.
- Unique-constraint conflicts.
- Invalid policy counts.
- Assessment failures.
- Differences detected between preview and authoritative calculations in non-production validation tooling.

## 16. Edge cases

The implementation must define and test all of the following:

1. Due date on the first day of a month.
2. Due date on the last day of a month.
3. February and leap years.
4. Year boundaries, such as December to January.
5. Payment on the last day of the due month.
6. Payment on the first day of an overdue month.
7. Multiple payments on the same day.
8. Partial payments across several months.
9. Payment larger than principal.
10. Payment larger than principal plus interest.
11. Zero principal, if legacy data contains it.
12. Zero-percent enabled policy.
13. Policy disabled after charges exist.
14. Rate changed between assessment months.
15. Recurrent policy changed after an instance is generated.
16. Missing cron runs followed by catch-up.
17. Concurrent cron and manual assessment attempts.
18. Voided charge followed by an adjustment.
19. Bill deletion cascading to charges.
20. Payment transaction date edited backward or forward.
21. Payment unlinked after one or more assessments.
22. Payment amount edited after assessment.
23. Currency mismatch between a bill and a linked payment.
24. Statement end date before the bill's due date.
25. Statement end date in the future.

For items 20–22, persisted historical charges do not silently change. The UI should flag that the payment edit may require an interest adjustment. Automatic retroactive rewriting is out of scope for the first release.

## 17. Testing strategy

### 17.1 Unit tests

Test the pure calculator for:

- No charge during the due month.
- First charge on the first day of the next month.
- No charge one day before that boundary.
- Payment on the last day of the due month.
- Payment on the assessment date.
- Partial payments before different boundaries.
- Multiple missing months.
- No compounding.
- Per-month cent rounding.
- Leap year and year rollover.
- Zero principal and zero rate.
- Overpayment.
- Input order independence for payments.
- UTC-safe behavior under different process timezones.

### 17.2 Database tests

Test:

- Schema constraints.
- One monthly charge per bill/month.
- Concurrent assessment attempts.
- Catch-up inserts.
- Correct bases using historical payment dates.
- RLS for owner, editor, viewer, unrelated user, and service role.
- Cascade deletion.
- Immutable charge fields.
- Adjustment and void audit data.

### 17.3 Query integration tests

Test derived principal, interest, totals, overpayment, wallet owed amount, and status for representative bills.

### 17.4 UI tests

Test:

- Interest switch behavior.
- 9% default.
- Monthly equivalent helper.
- Validation and accessible labeling.
- One-off and recurrent submission payloads.
- Bill table interest columns.
- Statement totals and printed output.
- Clear separation of preview and persisted values.

### 17.5 Scheduled-job tests

Test idempotent retry, partial failures, pagination, catch-up, and logging summaries. Run the job twice with identical inputs and assert that the second run inserts zero charges.

## 18. Migration and rollout plan

### Phase 0: Preview — completed

- Statement accepts an annual rate, defaulting to 9%.
- Interest is calculated in memory and not saved.
- Statement displays interest per bill and total preview interest.

### Phase 1: Schema and calculation foundation

- Add policy snapshot fields.
- Add `bill_interest_charges` and RLS.
- Generate Supabase types.
- Expand the pure calculator to return monthly details.
- Add database and unit tests.
- Keep interest disabled for all existing bills.

### Phase 2: Forms and manual assessment

- Add policy controls to one-off and recurrent forms.
- Copy recurrent policy to generated bills.
- Add a protected manual assessment action.
- Display charge history and derived balances.
- Update payment linking and split logic.

### Phase 3: Automated assessment

- Deploy the idempotent daily assessment job.
- Add structured logs and monitoring.
- Initially run in dry-run mode and compare expected charges.
- Enable writes for internal/test wallets.
- Expand gradually after reconciliation.

### Phase 4: Reporting and statement migration

- Update wallet owed totals, charts, reports, AI summaries, print pages, and exports.
- Make persisted charges authoritative in statements.
- Retain preview only as a clearly separate forecast option.

### Phase 5: Operational tooling

- Add void and adjustment workflows.
- Add reconciliation reports.
- Document support procedures for edited or unlinked historical payments.

## 19. Backfill strategy

No interest is backfilled automatically for existing bills when the feature ships.

For an existing open bill, enabling interest establishes a policy effective for future assessment dates. The first release should not infer that the user intended historical charges.

If historical backfill is later requested, it must be an explicit preview-and-confirm operation showing:

- Every proposed assessment month.
- The base principal used.
- The rate.
- The proposed amount.
- The total by bill and currency.

Confirmation must create immutable charges through the same authoritative assessment path, and the operation must be idempotent.

## 20. Reconciliation

Provide an internal reconciliation query or script that compares persisted monthly charges with independently calculated expected assessments using the charge's stored rate and historical payment dates.

It should report:

- Missing assessment.
- Unexpected assessment.
- Incorrect base principal.
- Incorrect rate snapshot.
- Incorrect amount.
- Duplicate logical month.
- Currency mismatch.
- Charge after principal reached zero.

The script must be read-only by default. Any repair requires an explicit adjustment or void action.

## 21. Performance considerations

- Avoid one query per bill when listing bills with charges.
- Fetch charges in batches using bill IDs, as current payment queries do.
- Index bill ID and assessment month.
- Process cron candidates in bounded pages.
- Reuse payment groupings and avoid rescanning every payment for every month when calculating multiple assessments.
- Cache or materialize wallet owed totals only after charge changes are included in invalidation and trigger behavior.
- Keep server-to-client payloads focused; send derived totals and only load full charge history in the bill detail view.

## 22. Privacy, compliance, and user communication

Kino must not present 9% as legally approved or universally appropriate. The default is a product convenience only.

Before enabling automated charges for user-to-user obligations, Product should determine whether region-specific disclosures, caps, consent, or agreement records are required. If Kino is only tracking charges imposed by an external creditor, the UI should describe the rate as a record of that creditor's terms rather than a rate selected by Kino.

The feature should retain who enabled or changed a policy if audit requirements expand. The initial schema may rely on application audit logs, but immutable charge actor fields are required.

## 23. Acceptance criteria

The production feature is complete when all of the following are true:

1. An authorized user can enable simple monthly interest on one-off and recurrent bills.
2. The rate defaults to 9%, validates correctly, and is stored in basis points.
3. Generated bills retain a policy snapshot independent of later recurrent edits.
4. No charge is created during the due month.
5. A charge is created on or after the first day of each eligible overdue month.
6. Each charge uses unpaid principal immediately before that month boundary.
7. Prior interest is never included in a future interest base.
8. A payment on the last day of the due month avoids interest.
9. A payment on the first day of the next month does not avoid that month's interest.
10. Repeated and concurrent assessments cannot create duplicates.
11. Missed job runs are caught up correctly.
12. Every assessment records bill, month, base, rate, amount, currency, and creation metadata.
13. Bill and wallet totals include remaining interest.
14. Statements show per-bill and total interest clearly.
15. Preview and persisted charges cannot be mistaken for one another.
16. Existing bills remain interest-free until explicitly enabled.
17. Existing charges survive policy disablement and rate changes.
18. Owners/editors can manage the feature, viewers are read-only, and unrelated users have no access.
19. Unit, database, integration, UI, and scheduled-job tests pass.
20. Reconciliation reports no unexplained difference for rollout wallets.

## 24. Open product decisions

The following must be resolved before production implementation begins:

1. Is Kino tracking creditor-defined charges, or defining user-to-user obligations?
2. What workspace or business timezone controls the assessment date?
3. Should an enabled 0% policy be allowed in the UI or normalized to disabled?
4. Should users be able to assess interest manually before automation is enabled?
5. Who may void or adjust a charge: owners only, or owners and editors?
6. Should changing a bill's payment history display a warning only, or create a reconciliation task?
7. Should future-dated statements project unassessed interest, and if so, how is it visually separated?
8. Is principal-first allocation the desired long-term contractual behavior?
9. Are interest notifications part of the initial release or a follow-up?
10. Does the current wallet model guarantee that all bills use the wallet currency, including legacy data?

Until these are answered, engineering may implement the pure calculation and schema foundation, but automated production assessment should remain disabled.

