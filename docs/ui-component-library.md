# AgriChain UI Component Library Reference
## Nature Meets Precision Catalog & API Documentation

---

### 1. Overview & Architectural Principles

The AgriChain component library delivers a collection of zero-dependency, accessible, React 18 compatible UI primitives and domain components. Built with Tailwind CSS and Radix-inspired composable patterns, each component adheres strictly to the **"Nature Meets Precision"** visual identity.

- **Zero External Network Dependencies**: All primitives are implemented purely in JSX without unvetted third-party runtime bundles.
- **Strict Accessibility**: Native semantic elements (`button`, `dialog`, `table`, `input`), keyboard focus rings, and ARIA roles.
- **Type Compatibility**: Dual named and default exports throughout for friction-free imports.

---

### 2. Base UI Primitives (`src/components/ui/`)

#### A. Button (`button.jsx`)
Standard interactive button with variant and sizing support.

```jsx
import { Button } from '@/components/ui/button'
// or default export
import Button from '@/components/ui/button'

<Button variant="default" size="default">Initialize Consignment</Button>
<Button variant="outline" size="sm">Cancel</Button>
<Button variant="destructive" size="default">Suspend Account</Button>
```

| Prop | Type | Options | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | string | `default` (forest green), `secondary`, `outline`, `destructive`, `ghost`, `link` | `default` | Visual presentation style |
| `size` | string | `default`, `sm`, `lg`, `icon` | `default` | Button dimensions and padding |
| `disabled` | boolean | `true`, `false` | `false` | Disables interaction and reduces opacity |

---

#### B. Card (`card.jsx`)
Modular container for grouping related content and operational data.

```jsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Storage Bay Utilization</CardTitle>
    <CardDescription>Cold-storage capacity breakdown across facilities</CardDescription>
  </CardHeader>
  <CardContent>
    <p>940 / 1,200 kg active cargo</p>
  </CardContent>
  <CardFooter>
    <Button variant="outline" size="sm">Inspect Bay</Button>
  </CardFooter>
</Card>
```

---

#### C. Badge (`badge.jsx`)
Compact status indicator supporting semantic and operational variants.

```jsx
import { Badge } from '@/components/ui/badge'

<Badge variant="success">Dispatched</Badge>
<Badge variant="warning">Loading</Badge>
<Badge variant="destructive">Critical Excursion</Badge>
<Badge variant="info">In Transit</Badge>
```

| Variant | Styling / Semantic | Typical Use Case |
| :--- | :--- | :--- |
| `default` | Forest green background, white text | Active primary status |
| `success` | Emerald wash, emerald border & text | Delivered, Approved, Intact |
| `warning` | Amber wash, amber border & text | In Progress, Pending KYC, Warning |
| `destructive` | Rose wash, rose border & text | Cancelled, Rejected, SLA Breach |
| `info` | Sky wash, sky border & text | Dispatched, In Transit |
| `secondary` | Stone 100, stone border & text | Draft, Neutral |

---

#### D. Input & Textarea (`input.jsx`, `textarea.jsx`)
Form controls with stone borders, focus rings, and font-mono compatibility.

```jsx
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

<Input
  type="text"
  placeholder="Search consignments..."
  value={query}
  onChange={(e) => setQuery(e.target.value)}
/>

<Textarea
  rows={3}
  placeholder="Corrective actions taken..."
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
/>
```

---

#### E. Table (`table.jsx`)
Semantic data table with alternating hover states and dense data support.

```jsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Shipment ID</TableHead>
      <TableHead>Corridor</TableHead>
      <TableHead>Cargo Weight</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className="font-mono font-bold text-[#244634]">SH-98421</TableCell>
      <TableCell>Nashik &rarr; Mumbai</TableCell>
      <TableCell className="font-mono">2,400 kg</TableCell>
      <TableCell><StatusBadge status="IN_TRANSIT" /></TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

### 3. Operational Domain Components (`src/components/common/`)

#### A. PageHeader (`PageHeader.jsx`)
Standard header component utilized across all 45 pages.

```jsx
import PageHeader from '@/components/common/PageHeader'

<PageHeader
  breadcrumbs={[
    { label: 'Logistics', href: '/shipments' },
    { label: 'Consignment SH-90214' }
  ]}
  title="Shipment Consignment SH-90214"
  description="Active corridor dispatch: Nashik Cold Hub to Mumbai Distribution Center."
  badge={<StatusBadge status="IN_TRANSIT" />}
  actions={
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">Export Manifest</Button>
      <Button size="sm">Cold-Chain Telemetry</Button>
    </div>
  }
/>
```

| Prop | Type | Description |
| :--- | :--- | :--- |
| `breadcrumbs` | array | Array of `{ label, href? }` for navigation ancestry |
| `title` | string | Main page headline (bold, tracking-tight) |
| `serif` | boolean | Toggles Newsreader editorial serif font on title |
| `description` | string | Secondary descriptive subtitle |
| `badge` | ReactNode \| string | Badge element or string rendered above title |
| `actions` | ReactNode | Action buttons container placed on right-hand deck |
| `children` | ReactNode | Optional sub-navigation or filter controls |

---

#### B. StatCard (`StatCard.jsx`)
Metric summary card displaying key performance indicators.

```jsx
import StatCard from '@/components/common/StatCard'
import { Thermometer } from 'lucide-react'

<StatCard
  icon={Thermometer}
  label="Reefer Temp"
  value="4.2°C"
  sublabel="Target SLA: 4°C – 8°C"
  accent="forest"
  alert={false}
/>
```

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `icon` | LucideIcon | `null` | Primary metric icon |
| `label` | string | `""` | Metric title (uppercase micro font) |
| `value` | string \| number | `"—"` | Primary metric value (large font-mono) |
| `sublabel` | string | `null` | Contextual subtitle |
| `accent` | string | `'forest'` | Icon color wash: `forest`, `terracotta`, `harvest`, `sage`, `slate`, `red` |
| `alert` | boolean | `false` | When true, renders flashing ping indicator and rose alert border |
| `onClick` | function | `null` | When provided, wraps card in interactive button with hover lift |

---

#### C. StatusBadge (`StatusBadge.jsx`)
Translates backend database status strings into formatted badges.

```jsx
import StatusBadge from '@/components/common/StatusBadge'

<StatusBadge status="BOOKING_CONFIRMED" /> // Rendered as Amber "Booking Confirmed"
<StatusBadge status="DELIVERED" />         // Rendered as Emerald "Delivered"
<StatusBadge status="IN_TRANSIT" />         // Rendered as Sky "In Transit"
```

---

#### D. EmptyState (`EmptyState.jsx`)
Provides empty dataset placeholders with optional call-to-action button.

```jsx
import EmptyState from '@/components/common/EmptyState'
import { Truck } from 'lucide-react'

<EmptyState
  icon={Truck}
  title="No Shipments Found"
  description="No active consignments match your corridor query."
  actionLabel="Initialize First Shipment"
  onAction={() => navigate('/shipments/new')}
/>
```

---

### 4. Layout & Navigation Primitives (`src/components/layout/`)

#### A. Sidebar (`Sidebar.jsx`)
- Deep Forest Green theme (`#244634`).
- Collapsible from 252px to 72px rail.
- Displays navigation groups: Agriculture, Commerce, Logistics, Monitoring, Administration.
- Responsive collapse behavior with persisted layout state.

#### B. Topbar (`Topbar.jsx`)
- Dynamic breadcrumb trails linking to active routes.
- Live API health probe (`SYS:ONLINE` / `SYS:OFFLINE`) communicating with FastAPI `/health/live`.
- User identity pill displaying active user name, RBAC role badge, and session sign-out action.

#### C. AppShell (`AppShell.jsx`)
- Layout wrapper managing responsive grid, sidebar collapse state, and scrollable content area.

