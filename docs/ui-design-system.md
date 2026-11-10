# AgriChain UI Design System Specification
## Nature Meets Precision

---

### 1. Vision & Visual Identity Ratios

The AgriChain visual identity unifies three distinct product dimensions into a single cohesive design language:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AGRICHAIN DESIGN SYSTEM                         │
│                         Nature Meets Precision                         │
├──────────────────────────┬────────────────────────┬────────────────────┤
│   QUIET LUXURY AGRITECH  │  WARM ORGANIC COMMERCE │ INDUSTRIAL LOGISTICS│
│           (45%)          │          (25%)         │        (30%)       │
│  Foundation, Shell,      │  Produce, Farms,       │ Telemetry, Fleet,  │
│  Typography, Cards       │  Marketplace, Batches  │ Ledgers, Inventory │
└──────────────────────────┴────────────────────────┴────────────────────┘
```

#### A. Quiet Luxury Agritech (45% Design Influence)
- **Primary Function**: The structural foundation across the entire application shell, navigation, page headers, cards, dialogs, and typography.
- **Atmosphere**: Restrained, editorial, bespoke agritech. Replaces harsh high-contrast tech blues with deep botanical greens, subtle warm ivory backdrops, and refined stone borders.

#### B. Warm Organic Commerce (25% Design Influence)
- **Primary Function**: Applied specifically to farm registries, crop catalogs, harvest batches, and market purchase transactions.
- **Atmosphere**: Earthy, organic, and tactile. Warm ivory backgrounds, terracotta accents, sage highlights, and generous card padding.

#### C. Industrial Precision Logistics (30% Design Influence)
- **Primary Function**: Applied to data-dense operational interfaces: warehouse inventory, cold-chain telemetry, freight consignments, fleet dispatches, and cryptographic ledger inspection.
- **Atmosphere**: High information density, monospace data readouts (`JetBrains Mono`), crisp alignment grids, and immediate SLA breach status indicators.

---

### 2. Design Token Architecture

#### Color Tokens
```css
:root {
  /* Quiet Luxury Agritech Foundation */
  --color-forest: #244634;        /* Deep Forest Green (Primary Brand & Sidebar) */
  --color-forest-hover: #1b3527;  /* Deep Forest Hover */
  --color-forest-light: #2d5640;  /* Lighter Forest */
  --color-forest-subtle: #f0f4f1; /* 10% Forest Wash */

  /* Warm Organic Commerce Accents */
  --color-ivory: #FAF9F5;         /* Warm Ivory Surface */
  --color-cream: #F5F4EE;         /* Warm Cream Container */
  --color-terracotta: #C85A32;    /* Restrained Terracotta */
  --color-harvest: #D4A359;       /* Harvest Gold / Amber */
  --color-sage: #8EA893;          /* Muted Sage */

  /* Neutrals & Surfaces */
  --color-canvas: #F8F9FA;        /* Application Canvas */
  --color-surface: #FFFFFF;       /* Primary Card Surface */
  --color-surface-muted: #F3F4F6; /* Muted Container */
  --color-border: #E5E7EB;        /* Primary Border (Stone 200) */
  --color-border-subtle: #F1F5F9; /* Subtle Border */

  /* Typography Colors */
  --color-ink-primary: #111827;   /* Slate 900 / Deep Charcoal */
  --color-ink-secondary: #4B5563; /* Slate 600 / Body Text */
  --color-ink-tertiary: #9CA3AF;  /* Slate 400 / Captions */

  /* Operational & Logistics Status Semantics */
  --color-status-success: #15803D; /* Emerald 700 */
  --color-status-warning: #B45309; /* Amber 700 */
  --color-status-danger: #B91C1C;  /* Rose 700 */
  --color-status-info: #0369A1;    /* Sky 700 */
}
```

---

### 3. Typography Scale & Pairings

The design system incorporates three distinct typography families:

1. **Body & Interface (Manrope)**:
   - Primary UI font used for navigation, controls, table headers, and form inputs.
   - Clean geometric proportions with exceptional legibility across dense data tables.

2. **Editorial Headlines (Newsreader / Serif)**:
   - Utilized selectively on public landing pages, farm titles, produce varieties, and primary page headers.
   - Conveys craftsmanship, natural heritage, and quiet luxury.

3. **Logistics & Telemetry (JetBrains Mono)**:
   - Utilized for all numeric, cryptographic, and operational readouts:
     - Shipment IDs, Tracking Numbers, License Plates
     - Sensor temperatures (`4.2°C`) and humidity levels (`88% RH`)
     - Cargo weights (`2,400 kg`), timestamps, and SHA-256 block digests

#### Type Scale Hierarchy
| Scale Name | Size | Line Height | Weight | Typical Application |
| :--- | :--- | :--- | :--- | :--- |
| **Display 1** | 36px / 2.25rem | 1.15 | Bold (700) | Landing hero headlines, major milestones |
| **Headline 1** | 28px / 1.75rem | 1.25 | Bold (700) | Primary PageHeader titles |
| **Headline 2** | 20px / 1.25rem | 1.35 | SemiBold (600) | Section titles, modal headers |
| **Subhead** | 16px / 1rem | 1.5 | Medium (500) | Card headers, table section titles |
| **Body Default** | 14px / 0.875rem | 1.5 | Normal (400) | Standard paragraphs, form descriptions |
| **Caption / Mono** | 12px / 0.75rem | 1.4 | Mono Medium (500) | Telemetry metrics, status badges, hashes |
| **Micro** | 11px / 0.6875rem | 1.3 | Mono SemiBold (600) | Table column labels, uppercase category pills |

---

### 4. Elevation, Radii & Spacing

#### Border Radii
- **Input & Control Elements**: `rounded-lg` (8px / 0.5rem)
- **Standard Cards & Modals**: `rounded-2xl` (16px / 1rem)
- **Status Pills & Badges**: `rounded-full` (9999px)
- **Sidebar Container**: Crisp straight edge (`rounded-none`) with subtle inner borders.

#### Elevation & Shadows
- **Card Rest**: `shadow-xs` / `shadow-sm` (`0 1px 2px 0 rgba(0, 0, 0, 0.05)`)
- **Card Hover**: `hover:shadow-md hover:-translate-y-0.5`
- **Modal Overlay Backdrop**: `bg-stone-900/60 backdrop-blur-xs`
- **Active Excursion Alerts**: Subtle warm/danger border glow (`border-rose-300 ring-2 ring-rose-500/10`)

---

### 5. Application Shell Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: [Breadcrumbs: Logistics / Shipments]            [SYS:ONLINE] [User] │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ SIDEBAR       │ CONTENT CANVAS                                              │
│ (252px / 72px)│                                                             │
│ Deep Forest   │ PageHeader: Title + Metric Badges + Action Buttons         │
│ Green         ├─────────────────────────────────────────────────────────────┤
│ (#244634)     │ Filter / Search Toolbar (Status Pills, Input)               │
│               ├─────────────────────────────────────────────────────────────┤
│ Navigation    │ Primary Content: Cards / Data Tables / Recharts Graphs       │
│ Items with    │                                                             │
│ Active Pill   │                                                             │
│ Indicators    │                                                             │
└───────────────┴─────────────────────────────────────────────────────────────┘
```

1. **Collapsible Sidebar**:
   - Fixed Deep Forest Green background (`#244634`).
   - Width transitions smoothly between 252px (expanded) and 72px (icon-only rail).
   - Navigation links group by operational domains: Agriculture, Commerce, Warehousing, Freight, Monitoring, Administration.
   - Integrated toggle button with smooth layout animation.

2. **Refined Topbar**:
   - Clean white surface with bottom stone border (`border-stone-200`).
   - Dynamic route breadcrumbs with clickable ancestors.
   - Live system health pill:
     - `SYS:ONLINE` (Emerald dot + green badge) when FastAPI `/health/live` returns 200 OK.
     - `SYS:OFFLINE` (Rose dot + red badge) if health probe fails.
   - User profile badge with role indicator and authenticated sign-out control.

---

### 6. Component Pattern Guidelines

1. **Status Representation**:
   - Never use raw unformatted status strings (`BOOKING_CONFIRMED`).
   - Always route status through `formatStatus()` and render inside `StatusBadge`.
   - Positive/completed states receive muted emerald; active/progress states receive sky/indigo; warning/discrepancy states receive amber; failure/rejection states receive rose.

2. **Form Layouts**:
   - Inputs are paired with uppercase monospace label captions (`text-[10px] font-mono font-semibold text-stone-600 uppercase`).
   - Required indicators use a clear rose asterisk (`<span className="text-rose-500">*</span>`).
   - Input containers utilize warm stone backgrounds (`bg-stone-50`), stone borders (`border-stone-200`), and dark text (`text-stone-900`).
   - Buttons follow the primary hierarchy: Forest Green CTA (`bg-[#244634] text-white hover:bg-[#1b3527]`), secondary outline buttons (`bg-white border-stone-200 text-stone-700`).

3. **Data Density & Tables**:
   - Table rows feature alternating hover wash (`hover:bg-stone-50/80`).
   - Monospace font is strictly maintained for identifiers, weights, currencies, timestamps, and hashes.
   - Column headers are displayed in uppercase micro type (`text-[11px] font-semibold text-stone-500 bg-stone-50/75`).
