export const metadata = {
  title: "AgriChain - Agricultural Supply Chain & Freight Management",
  description: "Blockchain-inspired agricultural supply chain and freight transportation management system for fruits and vegetables.",
};

import { Card } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-soft text-charcoal">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest-800 flex items-center justify-center">
              <span className="text-white font-serif text-lg font-bold">A</span>
            </div>
            <span className="font-serif font-bold text-xl tracking-tighter">AgriChain</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-muted-foreground hover:text-forest-800">Features</a>
            <a href="#workflow" className="text-muted-foreground hover:text-forest-800">Supply Chain</a>
            <a href="#cold-chain" className="text-muted-foreground hover:text-forest-800">Cold Chain</a>
            <a href="#ledger" className="text-muted-foreground hover:text-forest-800">Traceability</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm font-medium text-forest-800 hover:underline">Sign In</a>
            <a href="/register" className="Button bg-forest-800 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-forest-700 transition-colors">
              Get Started
            </a>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626084229597-55adb1227317?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-20 pointer-events-none"></div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-800/10 text-forest-800 text-xs font-medium border border-forest-800/20 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-500"></span>
              Agricultural Logistics Platform
            </span>
            <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight mb-6 leading-tight">
              Smarter Supply Chain,<br />
              Fresher Produce
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Connect farmers, warehouses, transporters, and buyers through a single integrated
              platform with simulated cold-chain monitoring and hash-chained audit trail.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/register" className="Button w-full sm:w-auto bg-forest-800 text-white px-8 py-4 rounded-xl text-lg font-medium hover:bg-forest-700 shadow-soft hover:shadow-premium transition-all">
                Start Managing Your Supply Chain
              </a>
              <a href="#features" className="w-full sm:w-auto bg-white/80 text-charcoal border border-border px-8 py-4 rounded-xl text-lg font-medium hover:bg-white transition-all backdrop-blur-sm">
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold text-charcoal mb-4">Platform Capabilities</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Everything you need to manage agricultural produce from farm to table.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Truck className="w-6 h-6" />}
              title="Freight Management"
              description="Book transportation, get quotes, assign vehicles and drivers, and track shipments through manual checkpoints."
            />
            <FeatureCard
              icon={<Warehouse className="w-6 h-6" />}
              title="Warehouse Operations"
              description="Receive produce, perform quality inspection, grade products, and manage inventory with FEFO allocation."
            />
            <FeatureCard
              icon={<Thermometer className="w-6 h-6" />}
              title="Cold Chain Monitoring"
              description="Monitor simulated temperature and humidity conditions with alerts for excursions during transit."
            />
          </div>
        </div>
      </section>

      <section id="workflow" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold text-charcoal mb-4">Supply Chain Workflow</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">From harvest batch to delivery confirmation.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-8">
            <WorkflowStep number="1" title="Register Farm & Produce" description="Farmers register their farms and list fruits and vegetables they grow." />
            <WorkflowStep number="2" title="Create Harvest Batch" description="Create harvest batches with quality grades and handling requirements." />
            <WorkflowStep number="3" title="Warehouse Receiving" description="Warehouses receive, inspect, grade, and store produce." />
            <WorkflowStep number="4" title="Purchase Order" description="Buyers create purchase orders, sellers accept or reject them." />
            <WorkflowStep number="5" title="Freight & Shipment" description="Book freight, get transporter quotes, assign vehicles and drivers." />
            <WorkflowStep number="6" title="Delivery & Traceability" description="Track shipments through checkpoints and verify delivery with audit trail." />
          </div>
        </div>
      </section>

      <section id="cold-chain" className="py-20 px-6 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-serif font-bold text-charcoal mb-6">Simulated Cold-Chain Monitoring</h2>
              <p className="text-muted-foreground mb-6">
                Monitor temperature and humidity conditions during transit without physical IoT devices.
                Our backend simulation engine generates realistic sensor data for demonstration purposes.
              </p>
              <div className="flex gap-3 mt-8">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-700 text-xs border border-green-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> SIMULATED DATA
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-700 text-xs border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> ALERTS & EXCURSIONS
                </span>
              </div>
            </div>
            <div className="glass-panel p-6 rounded-2xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium text-charcoal">Current Temperature</span>
                <span className="simulated-label">SIMULATED</span>
              </div>
              <div className="text-4xl font-serif font-bold text-charcoal">7.2°C</div>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>Range: 7°C - 13°C</span>
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Normal</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="ledger" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold text-charcoal mb-4">Tamper-Evident Audit Trail</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Every critical supply chain event is recorded in a SHA-256 hash-chained ledger,
              providing an auditable history of all operations.
            </p>
          </div>
          <div className="glass-panel p-8 rounded-2xl border border-border">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-8 h-8 rounded-full bg-forest-800 flex items-center justify-center text-white text-xs font-bold">1</div>
              <div className="h-4 w-0.5 bg-border mx-2"></div>
              <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-xs font-bold text-charcoal">2</div>
              <div className="h-4 w-0.5 bg-border mx-2"></div>
              <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center text-xs font-bold text-charcoal">3</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div>
                <div className="text-charcoal font-mono text-sm">a81f...d3e2</div>
                <div>PRODUCE_BATCH_CREATED</div>
              </div>
              <div>
                <div className="text-charcoal font-mono text-sm">b42c...f1a9</div>
                <div>WAREHOUSE_RECEIVED</div>
              </div>
              <div>
                <div className="text-charcoal font-mono text-sm">c93d...e7b4</div>
                <div>SHIPMENT_DISPATCHED</div>
              </div>
            </div>
            <div className="mt-8 p-4 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-sm">
              <strong>Important:</strong> This is a simulated blockchain-style hash-chained audit ledger,
              not a decentralized blockchain. Hash chaining makes historical changes detectable when
              verified, but does not provide decentralized consensus.
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/30 bg-white/50 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-forest-800 flex items-center justify-center">
              <span className="text-white font-serif text-sm font-bold">A</span>
            </div>
            <span className="font-serif font-bold text-lg tracking-tighter text-charcoal">AgriChain</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Simulated agricultural supply chain platform. All cold-chain data is simulated for demonstration purposes.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="p-6 hover:shadow-medium transition-shadow border border-border/50">
      <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center text-forest-600 mb-4">
        {icon}
      </div>
      <h3 className="font-serif font-bold text-charcoal mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}

function WorkflowStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-3 p-6 rounded-xl border border-border bg-white/80">
      <div className="w-8 h-8 rounded-full bg-forest-800 flex items-center justify-center text-white text-sm font-bold">
        {number}
      </div>
      <h3 className="font-serif font-bold text-charcoal">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

import { Warehouse, Thermometer, Truck } from "lucide-react";