# Money Mate — Personal Finance Tracker for Bangladesh

A modern personal finance application tailored for Bangladesh. Track daily income, expenses, loans, and internal money transfers across **Cash**, **Bank Accounts**, and Mobile Financial Services (**Bkash**, **Nagad**, **Rocket**) with real-time balance calculations, rich interactive charts, and Supabase cloud storage.

---

## Features

### 1. Home Dashboard (`/`)
- **Key Financial Metrics**: Monthly Income, Monthly Expense, and Final Balance at a glance.
- **Quick Add Transaction**: Instant dialog to record income or expenses.
- **Recent Activity Feed**: Last 6 transactions with category badges and account icons.

### 2. Wallets & Accounts (`/wallets`)
- **Supported Accounts**: Cash, Bank, Bkash, Nagad, Rocket.
- Add custom wallets with opening balances, custom colors, and icons.
- Live total balance calculation across all accounts.
- Balance auto-syncs in DB via PostgreSQL triggers.

### 3. Charts & Analytics (`/chart`)
- **Time Range Filters**: Today, This Week, 15 Days, This Month, 3 Months, 6 Months, This Year, Custom Range.
- **Visual Analytics**:
  - Income vs Expense Area Chart
  - Expense Category Breakdown (Donut)
  - Income Category Breakdown (Donut)
  - Daily Trend Bar Chart
  - Spending Pattern Chart
  - Wallet Balance Distribution
- **Stat Cards**: Total/Income/Expense Transactions, Most Expensive Day, Most Frequent Category, Highest Single Transaction, Average Daily Spending, Top Category, Most Used Account.
- **Savings Rate** with target benchmark (> 20%).

### 4. Internal Money Transfers (`/transfer`)
- Record transfers between any two accounts.
- Auto-decrements source, increments destination.
- Transfer log with date and direction indicators.

### 5. Transaction Management (`/transactions`)
- **Table View**: Date, Title, Account, Category, Type, Amount.
- **Universal Search**: Searches across date, title, account, category, type, and amount.
- **Multi-Filter**: Time range, type, account, category.
- Sort by date, edit, delete with confirmation.
- **PDF Export** for filtered transactions.

### 6. Loan Management (`/loan`)
- Track receivable and payable loans.
- Record payments and loan increases.
- Status tracking: Active, Overdue, Completed.
- Due date reminders and notifications.

### 7. Monthly Calendar (`/calendar`)
- Visual monthly calendar with daily income/expense totals.
- Select any date to view transactions.

### 8. Notifications (`/notifications`)
- **Dynamic Reminder System**:
  - Loan overdue / due today / due soon alerts.
  - Low wallet balance warnings.
  - Low monthly income alerts.
  - Recent transaction and transfer activity.
- Bell icon with unread count in header/sidebar.
- Mark as read / mark all read (persisted in localStorage per user).

### 9. Category Manager (Settings)
- Add, edit, delete custom categories.
- Enable/disable categories (per-user via DB trigger).
- Search and filter by Income/Expense tabs.
- Default categories auto-copied to each user on signup.

### 10. Profile & Settings (`/settings`)
- User profile with avatar.
- **Password Change** (verifies current password, updates via Supabase Auth).
- Appearance toggle (Light/Dark mode).
- Category Manager access.

---

## Default Categories

| Income | Expense |
| :--- | :--- |
| Salary | Food |
| Freelancing | Groceries |
| Business | Shopping |
| Investment | Clothing |
| Gift | Transport |
| Bonus | Mobile Recharge |
| Loan Taken | Internet Bill |
| Loan Repayment | Electricity |
| Others | Gas |
| | Rent |
| | Education |
| | Tuition |
| | Medicine |
| | Loan Given |
| | Loan Payment |
| | EMI |
| | Savings |
| | Entertainment |
| | Travel |
| | Others |

---

## Tech Stack

- **Core**: React 18 + Vite + TypeScript
- **Routing**: TanStack Router (File-based)
- **Backend**: [Supabase](https://supabase.com/) (Auth + PostgreSQL + Row Level Security)
- **Styling**: Tailwind CSS v4 + shadcn/ui + Radix UI primitives
- **Icons**: Lucide Icons
- **Charts**: Recharts
- **State**: React Context
- **Forms**: React Hook Form + Zod
- **Dates**: Day.js
- **Toasts**: Sonner
- **PWA**: Installable on mobile/desktop

---

## Database Schema

### Tables
- **users** — Auth profiles (auto-created on signup)
- **categories** — Income/Expense categories (per-user via trigger)
- **wallets** — User accounts with balances
- **transactions** — Income/Expense records
- **transfers** — Internal wallet-to-wallet transfers
- **loans** — Receivable/Payable loans
- **loan_payments** — Loan payment records
- **loan_increases** — Loan amount increases
- **payment_providers** — Payment provider branding

### Key Triggers
- **`on_user_created_copy_categories`** — Auto-copies default categories for new users.
- **`trg_sync_balance_on_tx`** / **`trg_sync_balance_on_transfer`** — Auto-syncs `current_balance` on wallets.

### RLS Policies
- Users can only read/write their own data.
- Default categories (`user_id = NULL`) are readable by all.

---

## Installation

### Prerequisites
- Node.js v18+
- npm or bun

### Setup

```bash
# Clone
git clone https://github.com/With-ALIF/bdlakh-tracker.git
cd bdlakh-tracker

# Install
npm install

# Dev server
npm run dev
```

Visit `http://localhost:5173`.

### Environment Variables

Create `.env`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run the SQL in `supabase/schema.sql` in the Supabase SQL Editor, then run the migration queries:

```sql
-- 1. Add is_enabled column
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true;

-- 2. Category copy trigger
CREATE OR REPLACE FUNCTION public.copy_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, is_income, is_default, is_enabled)
  SELECT NEW.id, name, is_income, true, true
  FROM public.categories
  WHERE is_default = true AND user_id IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_copy_categories
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.copy_default_categories();

-- 3. Wallet balance sync trigger
CREATE OR REPLACE FUNCTION public.sync_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
  wid uuid;
  bal numeric(12,2);
BEGIN
  wid := COALESCE(NEW.wallet_id, NEW.from_wallet_id, OLD.wallet_id, OLD.from_wallet_id);
  SELECT COALESCE(w.opening_balance, 0)
    + COALESCE((SELECT SUM(t.amount) FROM public.transactions t
                WHERE t.wallet_id = wid AND t.is_income = true), 0)
    - COALESCE((SELECT SUM(t.amount) FROM public.transactions t
                WHERE t.wallet_id = wid AND t.is_income = false), 0)
    - COALESCE((SELECT SUM(tf.amount) FROM public.transfers tf
                WHERE tf.from_wallet_id = wid), 0)
    + COALESCE((SELECT SUM(tf.amount) FROM public.transfers tf
                WHERE tf.to_wallet_id = wid), 0)
  INTO bal;
  UPDATE public.wallets SET current_balance = bal, updated_at = now() WHERE id = wid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_balance_on_tx
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_balance();

CREATE TRIGGER trg_sync_balance_on_transfer
  AFTER INSERT OR UPDATE OR DELETE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_balance();

-- 4. Backfill existing users
INSERT INTO public.categories (user_id, name, is_income, is_default, is_enabled)
SELECT u.id, d.name, d.is_income, true, true
FROM public.users u
CROSS JOIN (
  SELECT name, is_income FROM public.categories
  WHERE is_default = true AND user_id IS NULL GROUP BY name, is_income
) d
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.user_id = u.id AND c.name = d.name AND c.is_income = d.is_income
);
```

---

## Build & Deploy

```bash
npm run build
```

Output in `dist/`. Deploy to Vercel, Netlify, or any static host.

---

## Directory Structure

```
src/
├── components/         # UI components
│   ├── ui/             # shadcn/ui primitives
│   ├── AccountIcon.tsx # Brand logos for Cash, Bank, MFS
│   ├── CategoryManager.tsx # Category CRUD dialog
│   ├── TransactionDialog.tsx # Add/Edit transaction modal
│   └── ui-kit.tsx      # StatCard, Panel, EmptyState, PageHeader
├── context/            # React Context providers
│   ├── AuthContext.tsx  # Supabase Auth (signup, login, password change)
│   ├── FinanceContext.tsx # Central data state + CRUD
│   ├── NotificationContext.tsx # Dynamic notifications
│   └── ThemeContext.tsx # Light/Dark mode
├── hooks/              # Custom hooks (useBalances)
├── layouts/            # AppLayout (sidebar + mobile nav)
├── routes/             # TanStack file-based routes
│   ├── index.tsx       # Home Dashboard
│   ├── chart.tsx       # Charts & Analytics
│   ├── transactions.tsx # Transaction Table
│   ├── wallets.tsx     # Wallet Management
│   ├── transfer.tsx    # Internal Transfers
│   ├── loan.tsx        # Loan List
│   ├── LoanDetail.tsx  # Loan Detail View
│   ├── calendar.tsx    # Monthly Calendar
│   ├── notifications.tsx # Notification Center
│   └── settings.tsx    # Profile & Settings
├── types/              # TypeScript types
│   └── notifications.ts # Notification types
├── utils/              # Finance calculations, PDF export
└── lib/                # Supabase client, utilities
```

---

## Privacy

User data is stored in Supabase PostgreSQL with Row Level Security. Each user can only access their own records. No telemetry or tracking.

---

## License

MIT License.
