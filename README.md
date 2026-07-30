# ৳ TakaBook — Personal Daily Income & Expense Tracker for Bangladesh

A modern, offline-first personal finance application tailored for Bangladesh. Seamlessly track daily income, expenses, and internal money transfers across **Cash**, **Bank Accounts**, and Mobile Financial Services (**bKash**, **Nagad**, **Rocket**) with real-time balance calculations, rich interactive charts, and local storage data persistence.

---

## 🌟 Comprehensive Features

### 1. 📊 Simplified Home Dashboard (`/`)
- **Key Financial Metrics**: Displays **Monthly Income**, **Monthly Expense**, and **Final Balance** prominently at a glance.
- **Quick Add Transaction**: Instant dialog launcher to record income or expenses on the fly.
- **Recent Activity Feed**: Real-time list of your last 6 transactions with category badges and account icons.

### 2. 💳 Wallets & Accounts Management (`/wallets`)
- **Supported Payment Accounts**:
  - 💵 **Cash** (with custom Cash branding)
  - 🏦 **Bank Account** (with Bank emblem branding)
  - 💖 **bKash** (official MFS logo)
  - 🟧 **Nagad** (official MFS logo)
  - 🚀 **Rocket** (official MFS logo)
- **Account Actions**:
  - Add custom wallets with opening balances, custom colors, and icons.
  - Edit account details or delete custom accounts.
  - Live total balance calculation across all accounts.

### 3. 📈 Interactive Charts & Analytics (`/chart`)
- **Time Range Filters**: Instantly switch analytics between **This Month**, **3 Months**, **6 Months**, and **This Year**.
- **Visual Analytics Suite**:
  - **Income vs Expense Overview**: Area chart with smooth curves and color gradients (`#16A34A` for Income, `#DC2626` for Expense).
  - **Expense Category Breakdown**: Interactive Donut chart displaying proportion of spending per category.
  - **Recent 14-Day Trend**: Dual bar chart showing daily cash flow over the last two weeks.
  - **Account Balance Distribution**: Horizontal bar chart comparing balances across all active accounts.
- **KPI Metrics Cards**:
  - Total Income
  - Total Expense
  - Net Savings (`Income - Expense`)
  - Savings Rate (%) with target benchmark indicator (`> 20%`).

### 4. 💸 Internal Money Transfers (`/transfer`)
- Record transfers between any two accounts (e.g. `Cash → bKash`, `bKash → Bank`, `Bank → Nagad`, `Rocket → Cash`).
- Automatically decrements the source account balance and increments the destination account balance.
- Detailed transfer log with date, notes, and visual direction indicators.

### 5. 📝 Advanced Transaction Management (`/transactions`)
- **Table View**: Date, Title, Account, Category, Type, and Amount.
- **Multi-Filter & Search**:
  - Full-text search by title or note.
  - Time range filter (**Today**, **Yesterday**, **This Week**, **This Month**, **This Year**).
  - Type filter (**Income**, **Expense**).
  - Account filter (Cash, bKash, Nagad, Rocket, Bank).
  - Category filter.
- **Actions**: Sort by date, edit transaction, or delete with confirmation dialog.

### 6. 📅 Monthly Calendar (`/calendar`)
- Visual monthly calendar grid showing daily income and expense totals.
- Select any date to view all transactions recorded on that specific day.

### 7. 💾 Export, Backup & Settings (`/settings`)
- **Data Export**: Export your entire transaction history as **CSV** or **JSON**.
- **Backup & Restore**: Download local storage backup files and restore them anytime.
- **Regional Number Formatting**:
  - International (`1,234,567.89`)
  - South Asian (`12,34,567.89`)
  - Bangla Digits (`১২,৩৪,৫৬৭.৮৯`)
- **Data Privacy**: 100% offline local storage engine (`localStorage`). No user tracking or external servers.

---

## 🗂️ Income & Expense Categories

| Income Categories | Expense Categories |
| :--- | :--- |
| 💼 Salary | 🍲 Food |
| 💻 Freelancing | 🛍️ Shopping |
| 🏬 Business | 🚌 Transport |
| 📈 Investment | 📱 Mobile Recharge |
| 🎁 Gift | 🌐 Internet |
| 🪙 Bonus | ⚡ Electricity |
| 🏷️ Others | 🛢️ Gas |
| | 🏠 Rent |
| | 🎓 Education |
| | 💊 Medicine |
| | 🍿 Entertainment |
| | ✈️ Travel |
| | 🏷️ Others |

---

## 🚀 Tech Stack & Architecture

- **Core**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Routing**: [TanStack Router](https://tanstack.com/router) (File-based routing)
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/) + Radix UI primitives
- **Data Visualization**: [Recharts](https://recharts.org/)
- **State & Storage**: React Context + `localStorage` API
- **Form & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Date Utilities**: [Day.js](https://day.js.org/)

---

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/With-ALIF/bdlakh-tracker.git

# 2. Navigate to project directory
cd bdlakh-tracker

# 3. Install dependencies
npm install

# 4. Start local development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 📦 Build & Deployment

To generate a static production build:

```bash
npm run build
```

The optimized static build files will be located in the `dist/` directory.

### Deploying to Vercel / Netlify
Because **TakaBook** is a purely client-side SPA (Single Page Application) with Local Storage data persistence:
1. Connect your GitHub repository (`With-ALIF/bdlakh-tracker`).
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`
4. Deploy! No environment variables or server configuration needed.

---

## 📁 Directory Structure

```
bdlakh-tracker/
├── public/                 # Static assets & favicon
├── src/
│   ├── components/         # Reusable UI components & AccountIcon
│   │   ├── ui/             # Radix & Shadcn UI primitives (Button, Dialog, etc.)
│   │   ├── AccountIcon.tsx # Brand logo renderer for Cash, Bank, MFS
│   │   ├── TransactionDialog.tsx # Add / Edit transaction modal
│   │   └── ui-kit.tsx      # StatCard, Panel, EmptyState, PageHeader
│   ├── constants/          # Account definitions, logos, categories
│   ├── context/            # FinanceContext (Central state management)
│   ├── hooks/              # Custom hooks (useBalances calculations)
│   ├── layouts/            # AppLayout (Sidebar & Mobile Nav)
│   ├── lib/                # Utility helper functions
│   ├── routes/             # TanStack File-Based Routes
│   │   ├── __root.tsx      # App Root Shell & Toast provider
│   │   ├── index.tsx       # Home Dashboard (Monthly Income, Expense, Final Balance)
│   │   ├── chart.tsx       # Charts & Analytics Page
│   │   ├── transactions.tsx# Transactions Table & Filters
│   │   ├── wallets.tsx     # Wallets & Accounts Management
│   │   ├── transfer.tsx    # Internal Money Transfers
│   │   ├── calendar.tsx    # Monthly Calendar View
│   │   └── settings.tsx    # Data Export, Backup & Preferences
│   ├── services/           # Local Storage persistence engine
│   ├── types/              # TypeScript interface definitions
│   └── utils/              # Finance calculations & CSV generator
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🔒 Privacy & Data Security

TakaBook operates **100% client-side**. No telemetry, tracking cookies, or server calls are made. Your financial records never leave your browser device.

---

## 📄 License

This project is open-source and free to use under the [MIT License](LICENSE).
