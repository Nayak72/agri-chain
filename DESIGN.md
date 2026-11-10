# AgriChain Design Identity & UI Architecture
## Nature Meets Precision

AgriChain is an agricultural supply chain and freight management platform designed to connect farmers, warehouse operators, transporters, drivers, and buyers.

---

### 1. Visual Identity Pillars

The visual language combines three core disciplines into a unified aesthetic:

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

1. **Quiet Luxury Agritech (45%)**:
   - Deep Forest Green (`#244634`), Warm Ivory (`#FAF9F5`), and stone neutrals.
   - Restrained, sophisticated typography pairing `Manrope` (UI), `Newsreader` (Editorial Serif), and `JetBrains Mono` (Data).
   - Generous whitespace, clean card surfaces, and subtle borders.

2. **Warm Organic Commerce (25%)**:
   - Earthy accents: Harvest Gold (`#D4A359`), Restrained Terracotta (`#C85A32`), and Sage (`#8EA893`).
   - Natural presentation for produce listings, harvest batches, and farm profiles.

3. **Industrial Precision Logistics (30%)**:
   - High data density for operational telemetry, fleet management, and cold-chain compliance.
   - Monospace typography for weights, sensor readings, and timestamps.
   - Clear SLA boundary lines and status indicators.

---

### 2. Design Tokens

- **Primary**: Deep Forest Green (`#244634`) / Hover (`#1b3527`)
- **Backgrounds**: Canvas (`#F8F9FA`), Surface (`#FFFFFF`), Ivory (`#FAF9F5`)
- **Borders**: Stone 200 (`#E5E7EB`), Stone 100 (`#F1F5F9`)
- **Text**: Ink Primary (`#111827`), Ink Secondary (`#4B5563`), Ink Muted (`#9CA3AF`)
- **Semantics**: Success (`#15803D`), Warning (`#B45309`), Danger (`#B91C1C`), Info (`#0369A1`)

---

### 3. Application Structure

- **Sidebar**: Collapsible navigation rail (252px to 72px) with Deep Forest Green finish.
- **Topbar**: Dynamic breadcrumb trail with live system health probe (`SYS:ONLINE` / `SYS:OFFLINE`).
- **Reusable Primitives**: Composable compound cards, badges, buttons, and tables in `src/components/ui/` and `src/components/common/`.
- **45 Pages**: Complete application redesign covering public landing, commerce, logistics, warehousing, cold-chain telemetry, and administrative governance.

