"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Warehouse, Thermometer, ShieldCheck, Package, MapPin, ArrowRight, Leaf, Users, Ship, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="AgriChain Home">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-serif text-lg font-bold">A</span>
            </div>
            <span className="font-serif font-bold text-xl tracking-tighter text-foreground">AgriChain</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Platform</a>
            <a href="#workflow" className="text-muted-foreground hover:text-primary transition-colors">Supply Chain</a>
            <a href="#cold-chain" className="text-muted-foreground hover:text-primary transition-colors">Cold Chain</a>
            <a href="#ledger" className="text-muted-foreground hover:text-primary transition-colors">Traceability</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-primary hover:underline hidden sm:inline">Sign In</Link>
            <Link href="/register" className="Button bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium">Get Started</Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-[1600px] mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Agricultural Logistics Platform
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold tracking-tight mb-8 leading-tight text-foreground"
            >
              Smarter Supply Chain,<br />
              <span className="text-primary">Fresher Produce</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Connect farmers, warehouses, transporters, and buyers through a single integrated
              platform with simulated cold-chain monitoring and SHA-256 hash-chained audit trail.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/register" className="Button w-full sm:w-auto bg-primary text-primary-foreground px-10 py-4 rounded-xl text-lg font-medium shadow-soft hover:shadow-premium transition-all">
                Start Managing Your Supply Chain
                <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
              </Link>
              <Link href="#features" className="w-full sm:w-auto bg-white/80 text-foreground border border-border px-10 py-4 rounded-xl text-lg font-medium hover:bg-white transition-all backdrop-blur-sm">
                Learn More
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-white/50">
        <div className="max-w-[1600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">Platform Capabilities</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Everything you need to manage agricultural produce from farm to table.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Truck,
                title: "Freight Management",
                description: "Book transportation, get quotes, assign vehicles and drivers, and track shipments through manual checkpoints.",
              },
              {
                icon: Warehouse,
                title: "Warehouse Operations",
                description: "Receive produce, perform quality inspection, grade products, and manage inventory with FEFO allocation.",
              },
              {
                icon: Thermometer,
                title: "Cold Chain Monitoring",
                description: "Monitor simulated temperature and humidity conditions with alerts for excursions during transit.",
              },
              {
                icon: ShieldCheck,
                title: "Traceability Ledger",
                description: "SHA-256 hash-chained audit trail provides tamper-evident records of all supply chain events.",
              },
              {
                icon: Package,
                title: "Produce & Batches",
                description: "Register harvest batches with quality grades, handling requirements, and estimated shelf life.",
              },
              {
                icon: Users,
                title: "Multi-Role Access",
                description: "Role-based dashboards for farmers, warehouse managers, transporters, drivers, and buyers.",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <FeatureCard icon={feature.icon} title={feature.title} description={feature.description} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="py-24 px-6">
        <div className="max-w-[1600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">Supply Chain Workflow</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">From harvest batch to delivery confirmation.</p>
          </motion.div>
          <div className="flex flex-col md:flex-row gap-6">
            {[
              { number: 1, title: "Register Farm & Produce", description: "Farmers register their farms and list fruits and vegetables they grow.", icon: Leaf },
              { number: 2, title: "Create Harvest Batch", description: "Create harvest batches with quality grades and handling requirements.", icon: Package },
              { number: 3, title: "Warehouse Receiving", description: "Warehouses receive, inspect, grade, and store produce.", icon: Warehouse },
              { number: 4, title: "Purchase Order", description: "Buyers create purchase orders, sellers accept or reject them.", icon: ClipboardList },
              { number: 5, title: "Freight & Shipment", description: "Book freight, get transporter quotes, assign vehicles and drivers.", icon: Truck },
              { number: 6, title: "Delivery & Traceability", description: "Track shipments through checkpoints and verify delivery with audit trail.", icon: ShieldCheck },
            ].map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <WorkflowStep number={step.number} title={step.title} description={step.description} icon={step.icon} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="cold-chain" className="py-24 px-6 bg-white/50">
        <div className="max-w-[1600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-6">Simulated Cold-Chain Monitoring</h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Monitor temperature and humidity conditions during transit without physical IoT devices.
                Our backend simulation engine generates realistic sensor data for demonstration purposes.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-success/10 text-success text-sm border border-success/20 font-medium">
                  <span className="w-2 h-2 rounded-full bg-success" /> SIMULATED DATA
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-warning/10 text-warning text-sm border border-warning/20 font-medium">
                  <span className="w-2 h-2 rounded-full bg-warning" /> ALERTS & EXCURSIONS
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-info/10 text-info text-sm border border-info/20 font-medium">
                  <span className="w-2 h-2 rounded-full bg-info" /> COMPLIANCE TRACKING
                </span>
              </div>
            </div>
            <div className="glass-panel p-8 rounded-2xl border border-border">
              <div className="flex items-center justify-between mb-6">
                <span className="font-medium text-foreground">Current Temperature</span>
                <span className="simulated-label">SIMULATED</span>
              </div>
              <div className="text-5xl font-serif font-bold text-foreground mb-2">7.2°C</div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>Range: 7°C - 13°C</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-success/10 text-success border border-success/20">Normal</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">84% Humidity</span>
              </div>
              <div className="mt-6 h-32 bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground">
                Temperature Trend Chart
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="ledger" className="py-24 px-6">
        <div className="max-w-[1600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">Tamper-Evident Audit Trail</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Every critical supply chain event is recorded in a SHA-256 hash-chained ledger,
              providing an auditable history of all operations.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-panel p-8 rounded-2xl border border-border"
          >
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">1</div>
              <div className="h-6 w-16 bg-gradient-to-r from-primary/20 to-transparent" />
              <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-xs font-bold text-foreground">2</div>
              <div className="h-6 w-16 bg-gradient-to-r from-primary/20 to-transparent" />
              <div className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center text-xs font-bold text-foreground">3</div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground mb-8">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-foreground font-mono text-sm mb-1">a81f...d3e2</div>
                <div className="text-xs">PRODUCE_BATCH_CREATED</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-foreground font-mono text-sm mb-1">b42c...f1a9</div>
                <div className="text-xs">WAREHOUSE_RECEIVED</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-foreground font-mono text-sm mb-1">c93d...e7b4</div>
                <div className="text-xs">SHIPMENT_DISPATCHED</div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 text-warning text-sm">
              <strong>Important:</strong> This is a simulated blockchain-style hash-chained audit ledger,
              not a decentralized blockchain. Hash chaining makes historical changes detectable when
              verified, but does not provide decentralized consensus.
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border/30 bg-white/50 py-12 px-6">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-serif text-sm font-bold">A</span>
            </div>
            <span className="font-serif font-bold text-lg tracking-tighter text-foreground">AgriChain</span>
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-left">
            Simulated agricultural supply chain platform. All cold-chain data is simulated for demonstration purposes.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <Card className="p-6 hover:shadow-medium transition-shadow border border-border/50 h-full">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="font-serif font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
}

function WorkflowStep({ number, title, description, icon: Icon }: { number: number; title: string; description: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-xl border border-border bg-white/80 flex-1">
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
        {number}
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <h3 className="font-serif font-bold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground ml-12">{description}</p>
    </div>
  );
}