# FinPulse - Modern Personal Finance Management Platform

[![Tech Stack](https://img.shields.io/badge/Tech%20Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue)](https://github.com/ParagAsija/webproject)
[![Storage](https://img.shields.io/badge/Storage-LocalStorage%20%7C%20Cookies%20%7C%20IndexedDB-success)](#data-storage-architecture)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

FinPulse is a modern, responsive personal finance platform engineered entirely with semantic **HTML5**, **Vanilla CSS3**, and **Vanilla JavaScript (ES6+)**. It adheres strictly to the rule of **zero external JavaScript dependencies**, featuring custom-built HTML5 Canvas visualizations, robust client-side state management, and an exhaustive multi-tier persistence layer across **Web Storage (LocalStorage & SessionStorage)**, **Document Cookies**, and **IndexedDB**.

---

## 📑 Table of Contents
1. [Project Proposal](#1-project-proposal)
   - [Project Description & Problem Statement](#project-description--problem-statement)
   - [Project Goals & Objectives](#project-goals--objectives)
   - [Specifications & Feature Scope](#specifications--feature-scope)
   - [UI/UX & Design System](#uiux--design-system)
2. [Technical Architecture](#2-technical-architecture)
   - [Core Tech Stack](#core-tech-stack)
   - [Data Storage Layer (Web Storage, Cookies, IndexedDB)](#data-storage-architecture)
   - [Custom Canvas Charting Engine](#custom-canvas-charting-engine)
3. [CRUD Operations Mapping](#3-crud-operations-mapping)
4. [Multi-Page Application Structure](#4-multi-page-application-structure)
5. [Responsive Design & Mobile Optimization](#5-responsive-design--mobile-optimization)
6. [How to Run the Application](#6-how-to-run-the-application)
7. [Git Commit History & Milestone Timeline](#7-git-commit-history--milestone-timeline)

---

## 1. Project Proposal

### Project Description & Problem Statement
Modern personal financial management often forces users to rely on complex, cloud-tethered applications that collect personal banking data and suffer from bloated interfaces. 

**FinPulse** solves this by providing a lightweight, privacy-focused, client-side personal finance workstation. It operates entirely within the user's browser without requiring backend servers or third-party analytical trackers. It empowers users to track income and expenses, enforce category spending limits, track savings goals, and understand cash flow patterns through clear, intuitive visualizations.

### Project Goals & Objectives
- **Frontend-Only Execution**: Build a production-grade application using standard browser APIs without external JavaScript frameworks (no React, Vue, Tailwind, or Chart.js).
- **Full CRUD Capabilities**: Provide comprehensive Create, Read, Update, and Delete operations for financial transactions, budget limits, and savings goals.
- **Multi-Tier Persistence**: Demonstrate practical usage of Web Storage (`localStorage` and `sessionStorage`), HTTP `document.cookie`, and `IndexedDB`.
- **Aesthetic Excellence**: Deliver a sleek, fin-tech visual aesthetic with dark and light themes, glassmorphism, micro-animations, and responsive layouts across desktop, tablet, and mobile devices.

### Specifications & Feature Scope
- **Interactive Dashboard (`index.html`)**:
  - Live Net Balance, Monthly Inflow, Monthly Expenses, and Savings Rate % metrics.
  - Custom Canvas Cash Flow Bar Chart (Income vs Expense comparison) and Trend Line Chart.
  - Expense Category Donut Chart with dynamic percentage breakdown and legend.
  - Recent activity feed and monthly category budget health indicators.
- **Transactions Management (`transactions.html`)**:
  - Full CRUD operations with modals for Adding and Editing entries.
  - Non-destructive Deletion with an interactive **Undo Toast** action.
  - Live full-text search across titles, categories, payment methods, and notes.
  - Multi-filtering: Filter by Type (All / Income / Expense), Category, and Date Period (All / This Month / Last Month / Last 7 Days).
  - Multi-field sorting (Date Asc/Desc, Amount Asc/Desc, Title A-Z).
  - Client-side pagination with dynamic page size and total transaction summary indicators.
  - Two-way Data Portability: Export ledger to CSV and JSON, and import CSV/JSON files.
- **Budgets & Savings Goals (`budgets.html`)**:
  - Overall monthly budget utilization hero banner with real-time progress meter.
  - Category budget cards featuring dynamic color-coded thresholds (Safe: Green `<70%`, Warning: Amber `70%-90%`, Danger: Rose `>90%`).
  - Savings Goals milestones with target dates, visual progress indicators, and an interactive "Contribute Funds" modal.
- **Analytics & Storage Inspector (`analytics.html`)**:
  - Financial KPIs: Daily Average Burn Rate, Inflow/Outflow Ratio, Monthly Savings Ratio, and Net Cashflow.
  - Spending Category Breakdown ranking with proportional progress bars.
  - **Live Storage Architecture Diagnostics**: Real-time inspection of LocalStorage keys, active Cookies, and IndexedDB stores (`FinPulseDB`), accompanied by one-click IndexedDB state backup and restore actions.

### UI/UX & Design System
- **Curated Color Tokens**: Space slate background (`#0a0e17`), Card elevations (`#161f33`), Vibrant accents for Emerald Inflow (`#10b981`), Coral Expenses (`#f43f5e`), Indigo Branding (`#6366f1`), and Amber Warnings (`#f59e0b`).
- **Typography**: Responsive typography utilizing `Plus Jakarta Sans` and monospace tabular numbers for aligned financial columns.
- **Accessibility & Feedback**: Distinct ARIA roles, live regions for toasts, keyboard `Esc` closing modals, and clear interactive focus rings.

---

## 2. Technical Architecture

### Core Tech Stack
| Layer | Technology | Description |
|---|---|---|
| **Structure** | HTML5 Semantic Elements | `<header>`, `<nav>`, `<aside>`, `<main>`, `<section>`, `<table>`, `<dialog>` |
| **Styling** | Vanilla CSS3 | Custom Properties (CSS variables), Grid, Flexbox, Glassmorphism, Dual Themes |
| **Logic** | Vanilla JavaScript (ES6+) | Native ES6 modules, Canvas 2D API, Web Storage, IndexedDB |
| **External JS** | **None (0% external JS)** | Strictly complies with course guidelines prohibiting external JS libraries |

---

### Data Storage Architecture
FinPulse integrates all three client-side browser storage technologies:

```
                                 ┌──────────────────────────────────────────┐
                                 │               User Action                │
                                 └────────────────────┬─────────────────────┘
                                                      │
                       ┌──────────────────────────────┼──────────────────────────────┐
                       │                              │                              │
                       ▼                              ▼                              ▼
          ┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐
          │   Web Storage (Sync)     │   │     Document Cookies     │   │   IndexedDB (Async)      │
          ├──────────────────────────┤   ├──────────────────────────┤   ├──────────────────────────┤
          │ • LocalStorage:          │   │ • fp_theme:              │   │ • Database: FinPulseDB   │
          │   - Transactions Ledger  │   │   "dark" | "light"       │   │ • Object Stores:         │
          │   - Category Budgets     │   │ • fp_currency:           │   │   - transactions_archive │
          │   - Savings Goals        │   │   "USD" | "EUR" | ...    │   │   - audit_logs (CRUD log)│
          │ • SessionStorage:        │   │ • fp_user_name:          │   │   - system_backups       │
          │   - Active Filter State  │   │   Display name           │   │                          │
          │   - Active Page Views    │   │ • fp_last_login: ISO     │   │                          │
          └──────────────────────────┘   └──────────────────────────┘   └──────────────────────────┘
```

1. **Web Storage (`LocalStorage` & `SessionStorage`)**:
   - `localStorage` stores the core application arrays (`finpulse_transactions`, `finpulse_budgets`, `finpulse_goals`, `finpulse_settings`).
   - `sessionStorage` tracks transient session data such as active table filters (`finpulse_active_filters`) and page view counts.
2. **Cookies (`document.cookie`)**:
   - Manages user workspace configuration across browser sessions with expiration timestamps:
     - `fp_theme`: Active visual mode (`dark` or `light`).
     - `fp_currency`: Preferred currency token (`USD`, `EUR`, `GBP`, `INR`, `JPY`).
     - `fp_user_name`: Profile workspace name.
     - `fp_last_login`: ISO timestamp recording the user's latest session access.
3. **IndexedDB (`FinPulseDB`)**:
   - Database: `FinPulseDB` (Version 1).
   - `transactions_archive`: Indexed store with indexes on `date`, `type`, and `category` for historical record keeping.
   - `audit_logs`: Auto-incrementing log store documenting every CRUD operation with timestamps and payload snapshots.
   - `system_backups`: Full snapshot store enabling manual backup and one-click data restoration.

---

### Custom Canvas Charting Engine
Instead of pulling in third-party libraries like Chart.js or D3, FinPulse features a native HTML5 Canvas engine located in [`js/charts.js`](js/charts.js):
- **Donut Chart**: Computes slice angles dynamically, renders inner cutouts, draws crisp borders, and generates an accessible HTML legend.
- **Cash Flow Bar Chart**: Renders dual rounded-top bars per month for Income and Expenses, calculates dynamic Y-axis scales, and draws background gridlines.
- **Balance Trend Area Chart**: Renders smooth cubic Bézier curves connecting running balance points, shaded with a vertical gradient fill.
- **Retina/HiDPI Optimization**: Scales canvas contexts by `window.devicePixelRatio` to ensure sharpness on high-resolution displays.

---

## 3. CRUD Operations Mapping

| Entity | Create (C) | Read (R) | Update (U) | Delete (D) |
|---|---|---|---|---|
| **Transactions** | Quick Add Modal in header & FAB; form validation | Filtered table, search bar, sort dropdown, pagination, KPI summaries | Edit Modal pre-populates item fields and updates state | Table row action button with temporary **Undo Toast** |
| **Category Budgets** | "+ Add Category Budget" modal with limit validation | Budget cards with live spent vs limit calculation and health badges | "Adjust Limit" inline prompt action | Individual delete action with prompt confirmation |
| **Savings Goals** | "+ Add Savings Goal" modal with target amount and date | Milestone cards with percentage meters and deadline countdown | "+ Add Funds" contribution modal incrementing saved capital | Individual delete action with prompt confirmation |

---

## 4. Multi-Page Application Structure

FinPulse consists of 4 interconnected HTML pages that share a persistent storage engine:

- [`index.html`](index.html): **Executive Dashboard** — Metric KPI cards, monthly cashflow chart, category donut breakdown, recent transaction feed, and budget overview.
- [`transactions.html`](transactions.html): **Transaction Management Hub** — Comprehensive data table with live search, multi-filters, sorting, pagination, and CSV/JSON export/import.
- [`budgets.html`](budgets.html): **Budgets & Goals Planner** — Category spending limits, status badges, savings milestone jars, and contribution actions.
- [`analytics.html`](analytics.html): **Financial Intelligence & Storage Inspector** — Burn rate calculations, category rankings, and live diagnostics for LocalStorage, Cookies, and IndexedDB.

---

## 5. Responsive Design & Mobile Optimization

The interface adapts across three primary screen viewports:
- **Desktop (`> 1024px`)**: Fixed 260px sidebar navigation, 4-column KPI metric grid, side-by-side charts, and multi-column tables.
- **Tablet (`768px - 1024px`)**: Condensed 2-column KPI metric grid, stacked chart canvases, and flexible filter controls.
- **Mobile (`< 768px`)**:
  - Sidebar transitions to an off-canvas drawer with backdrop overlay toggled via a hamburger menu button.
  - Fixed bottom navigation bar (`Home`, `Transactions`, `Budgets`, `Analytics`) for one-thumb reachability.
  - Floating Action Button (FAB `+`) for instant transaction entry.
  - Modals convert into bottom sheets for touch ergonomics.

---

## 6. How to Run the Application

Because FinPulse is built with pure web fundamentals (HTML, CSS, Vanilla JS), it requires **no build step, no npm install, and no compilers**.

### Option A: Using Python (Recommended)
From the project root directory:
```bash
python3 -m http.server 8080
```
Open your browser and navigate to:
```
http://localhost:8080/index.html
```

### Option B: Using VS Code Live Server
1. Open the project folder in VS Code.
2. Right click on `index.html` and select **"Open with Live Server"**.

### Option C: Direct Browser Opening
Simply double-click `index.html` to open it directly in any modern browser (Chrome, Firefox, Safari, Edge).

---

## 7. Git Commit History & Milestone Timeline

Per course guidelines, the project repository includes a documented sequence of commits across distinct days to illustrate development progress from kickoff to completion:

| Commit | Date | Milestone Description |
|---|---|---|
| `1` | **Oct 01, 2026** | Initialize repository structure, project proposal, and README specification |
| `2` | **Oct 02, 2026** | Build core CSS design tokens, typography, and responsive sidebar layout |
| `3` | **Oct 03, 2026** | Implement unified storage module (`storage.js`) with Web Storage and Cookies |
| `4` | **Oct 04, 2026** | Add native HTML5 Canvas charting engine (`charts.js`) with zero external libraries |
| `5` | **Oct 05, 2026** | Add global UI utilities, modal controller, and toast alerts (`app.js`) |
| `6` | **Oct 06, 2026** | Build Executive Dashboard (`index.html`) with KPI summary metrics and cashflow visualizer |
| `7` | **Oct 07, 2026** | Develop Transactions management page (`transactions.html`) with full CRUD |
| `8` | **Oct 08, 2026** | Build Budgets & Savings Goals planner (`budgets.html`) with threshold meters |
| `9` | **Oct 09, 2026** | Add Financial Analytics & Live Storage Diagnostics inspector (`analytics.html`) |
| `10` | **Oct 10, 2026** | Implement tablet and mobile optimization with off-canvas drawer and bottom navigation |
| `11` | **Oct 10, 2026** | Final UI polish, documentation review, and verification checks |

---

## 📝 License
This project is submitted as part of the **Web Fundamentals Project (2026)** and is released under the MIT License.
