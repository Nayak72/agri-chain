"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Droplets, Play, Pause, Square, RefreshCw, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { motion } from "framer-motion";

interface SensorReading {
  id: string;
  temperature: number;
  humidity: number;
  status: string;
  timestamp: string;
  configured_temp_min?: number;
  configured_temp_max?: number;
  configured_humidity_min?: number;
  configured_humidity_max?: number;
  is_simulated?: boolean;
}

interface SensorAlert {
  alert_id: string;
  alert_type: string;
  severity: string;
  observed_value: number;
  configured_min?: number;
  configured_max?: number;
  status: string;
  created_at: string;
}

interface ShipmentOption {
  id: string;
  shipment_id: string;
  status: string;
  cargo_quantity_kg: number;
}

type SimStatus = "STOPPED" | "RUNNING" | "PAUSED";

const SENSOR_SCENARIOS = [
  { value: "NORMAL", label: "Normal Conditions" },
  { value: "TEMP_EXCURSION", label: "Temperature Excursion" },
  { value: "HUMIDITY_EXCURSION", label: "Humidity Excursion" },
  { value: "BOTH_EXCURSION", label: "Temperature & Humidity Excursion" },
  { value: "FLUCTUATION", label: "Repeated Fluctuations" },
  { value: "RECOVERY", label: "Recovery After Alert" },
];

export default function ColdChainPage() {
  const [shipments, setShipments] = useState<ShipmentOption[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("");
  const [shipmentsLoading, setShipmentsLoading] = useState(true);
  const [shipmentsError, setShipmentsError] = useState<string | null>(null);

  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);
  const [simStatus, setSimStatus] = useState<SimStatus>("STOPPED");
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [currentHumidity, setCurrentHumidity] = useState<number | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState("NORMAL");
  const [config, setConfig] = useState({ tempMin: 7, tempMax: 13, humidityMin: 85, humidityMax: 95 });

  // Load available shipments from API
  useEffect(() => {
    const fetchShipments = async () => {
      setShipmentsLoading(true);
      setShipmentsError(null);
      try {
        const { data } = await apiClient.get("/shipments?page_size=50");
        const items = data.items || (Array.isArray(data) ? data : []);
        const formatted = items.map((s: any) => ({
          id: s.id || s._id,
          shipment_id: s.shipment_id,
          status: s.status,
          cargo_quantity_kg: s.total_cargo_weight_kg || s.cargo_quantity_kg || 0,
        }));
        setShipments(formatted);
        if (formatted.length > 0) {
          setSelectedShipmentId(formatted[0].id);
        }
      } catch (e: any) {
        setShipmentsError("Unable to load shipments. Please verify the backend is running.");
      } finally {
        setShipmentsLoading(false);
      }
    };
    fetchShipments();
  }, []);

  // Fetch readings and alerts for the selected shipment
  const loadSensorData = useCallback(async (shipmentId: string) => {
    if (!shipmentId) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const [rRes, aRes] = await Promise.all([
        apiClient.get(`/sensors/shipments/${shipmentId}/sensor-readings?page_size=50`),
        apiClient.get(`/sensors/shipments/${shipmentId}/sensor-alerts`),
      ]);
      const readingsList: SensorReading[] = rRes.data || [];
      const alertsList: SensorAlert[] = aRes.data || [];
      setReadings(readingsList);
      setAlerts(alertsList);
      if (readingsList.length > 0) {
        const latest = readingsList[0];
        setCurrentTemp(latest.temperature);
        setCurrentHumidity(latest.humidity);
        if (latest.configured_temp_min !== undefined) {
          setConfig({
            tempMin: latest.configured_temp_min,
            tempMax: latest.configured_temp_max || 13,
            humidityMin: latest.configured_humidity_min || 85,
            humidityMax: latest.configured_humidity_max || 95,
          });
        }
      } else {
        setCurrentTemp(null);
        setCurrentHumidity(null);
      }
    } catch (e: any) {
      const msg = e?.response?.status === 403
        ? "Access restricted: you do not have permission to view telemetry for this shipment."
        : "Failed to retrieve sensor readings for this shipment.";
      setDataError(msg);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedShipmentId) {
      loadSensorData(selectedShipmentId);
    }
  }, [selectedShipmentId, loadSensorData]);

  const startSimulation = async () => {
    if (!selectedShipmentId) return;
    setActionLoading("start");
    setActionError(null);
    try {
      await apiClient.post(`/sensors/shipments/${selectedShipmentId}/simulation/start`, {
        scenario: selectedScenario,
        interval_seconds: 15,
      });
      setSimStatus("RUNNING");
      await loadSensorData(selectedShipmentId);
    } catch (e: any) {
      setActionError(e?.response?.data?.detail || "Failed to start simulation session.");
    } finally {
      setActionLoading(null);
    }
  };

  const pauseSimulation = async () => {
    if (!selectedShipmentId) return;
    setActionLoading("pause");
    setActionError(null);
    try {
      await apiClient.post(`/sensors/shipments/${selectedShipmentId}/simulation/pause`);
      setSimStatus("PAUSED");
    } catch (e: any) {
      setActionError(e?.response?.data?.detail || "Failed to pause simulation.");
    } finally {
      setActionLoading(null);
    }
  };

  const resumeSimulation = async () => {
    if (!selectedShipmentId) return;
    setActionLoading("resume");
    setActionError(null);
    try {
      await apiClient.post(`/sensors/shipments/${selectedShipmentId}/simulation/resume`);
      setSimStatus("RUNNING");
    } catch (e: any) {
      setActionError(e?.response?.data?.detail || "Failed to resume simulation.");
    } finally {
      setActionLoading(null);
    }
  };

  const stopSimulation = async () => {
    if (!selectedShipmentId) return;
    setActionLoading("stop");
    setActionError(null);
    try {
      await apiClient.post(`/sensors/shipments/${selectedShipmentId}/simulation/stop`);
      setSimStatus("STOPPED");
    } catch (e: any) {
      setActionError(e?.response?.data?.detail || "Failed to stop simulation.");
    } finally {
      setActionLoading(null);
    }
  };

  const nextReading = async () => {
    if (!selectedShipmentId) return;
    setActionLoading("next");
    setActionError(null);
    try {
      const { data } = await apiClient.post(`/sensors/shipments/${selectedShipmentId}/simulation/next-reading`);
      setCurrentTemp(data.temperature);
      setCurrentHumidity(data.humidity);
      setReadings((prev) => [data as SensorReading, ...prev]);
    } catch (e: any) {
      setActionError(e?.response?.data?.detail || "Could not generate reading. Ensure simulation is active.");
    } finally {
      setActionLoading(null);
    }
  };

  const isTempNormal = currentTemp !== null && currentTemp >= config.tempMin && currentTemp <= config.tempMax;
  const isHumidityNormal = currentHumidity !== null && currentHumidity >= config.humidityMin && currentHumidity <= config.humidityMax;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cold-Chain Telemetry"
        description="Monitor environmental conditions during transit with backend-generated simulated sensor telemetry."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="simulated-label bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
              SIMULATED TELEMETRY
            </Badge>
          </div>
        }
      />

      {/* Shipment Selection */}
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Shipment Target</CardTitle>
          <CardDescription>Select an active or transit shipment to inspect telemetry readings</CardDescription>
        </CardHeader>
        <CardContent>
          {shipmentsError ? (
            <div className="flex items-center gap-3 p-3.5 rounded-lg border border-destructive/20 bg-destructive/5">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{shipmentsError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
            </div>
          ) : (
            <Select
              value={selectedShipmentId}
              onValueChange={setSelectedShipmentId}
              disabled={shipmentsLoading}
            >
              <SelectTrigger className="w-full md:w-[420px] bg-background">
                <SelectValue placeholder={shipmentsLoading ? "Loading shipments..." : "Select shipment"} />
              </SelectTrigger>
              <SelectContent>
                {shipments.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.shipment_id} — {s.status.replace(/_/g, " ")} ({s.cargo_quantity_kg.toLocaleString()} kg)
                  </SelectItem>
                ))}
                {shipments.length === 0 && !shipmentsLoading && (
                  <SelectItem value="none" disabled>No shipments found</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedShipmentId && (
        <>
          {dataError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-destructive/20 bg-destructive/5 p-4"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">Telemetry Service Unavailable</p>
                  <p className="text-sm text-muted-foreground">{dataError}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadSensorData(selectedShipmentId)}>Retry</Button>
              </div>
            </motion.div>
          )}

          {actionError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-amber-800 dark:text-amber-200 text-sm flex-1">{actionError}</p>
                <Button variant="ghost" size="sm" onClick={() => setActionError(null)}>Dismiss</Button>
              </div>
            </motion.div>
          )}

          {/* Metric Telemetry Cards */}
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StaggerItem delay={0}>
              <Card className={isTempNormal ? "border-border/70" : currentTemp !== null ? "border-destructive/60 bg-destructive/5" : "border-border/70"}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Temperature</CardTitle>
                    <div className="text-3xl font-serif font-bold text-foreground mt-1">
                      {dataLoading ? "—" : currentTemp !== null ? `${currentTemp.toFixed(1)}°C` : "No readings"}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Thermometer className="w-5 h-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Threshold: {config.tempMin}°C – {config.tempMax}°C</span>
                    {currentTemp !== null && (
                      <Badge variant={isTempNormal ? "success" : "destructive"} className="ml-auto text-[10px]">
                        {isTempNormal ? "Compliant" : "Excursion"}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem delay={0.05}>
              <Card className={isHumidityNormal ? "border-border/70" : currentHumidity !== null ? "border-destructive/60 bg-destructive/5" : "border-border/70"}>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Humidity</CardTitle>
                    <div className="text-3xl font-serif font-bold text-foreground mt-1">
                      {dataLoading ? "—" : currentHumidity !== null ? `${currentHumidity.toFixed(0)}%` : "No readings"}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-sky-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Threshold: {config.humidityMin}% – {config.humidityMax}%</span>
                    {currentHumidity !== null && (
                      <Badge variant={isHumidityNormal ? "success" : "destructive"} className="ml-auto text-[10px]">
                        {isHumidityNormal ? "Compliant" : "Excursion"}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>

            <StaggerItem delay={0.1}>
              <Card className="border-border/70">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Simulation Status</CardTitle>
                    <div className="text-xl font-bold text-foreground mt-1">{simStatus}</div>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Simulated Session</span>
                    <Badge variant={simStatus === "RUNNING" ? "success" : simStatus === "PAUSED" ? "warning" : "secondary"} className="ml-auto text-[10px]">
                      {simStatus}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          </StaggerContainer>

          {/* Simulation Controls Panel */}
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Simulator Controls</CardTitle>
              <CardDescription>Adjust simulation scenarios to evaluate temperature excursion handling</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-72">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Scenario</label>
                  <Select value={selectedScenario} onValueChange={setSelectedScenario} disabled={simStatus === "RUNNING"}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SENSOR_SCENARIOS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <Button
                    onClick={startSimulation}
                    disabled={simStatus === "RUNNING" || actionLoading !== null}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {actionLoading === "start" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
                    Start
                  </Button>
                  <Button
                    onClick={pauseSimulation}
                    disabled={simStatus !== "RUNNING" || actionLoading !== null}
                    variant="outline"
                  >
                    {actionLoading === "pause" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Pause className="w-4 h-4 mr-1.5" />}
                    Pause
                  </Button>
                  <Button
                    onClick={resumeSimulation}
                    disabled={simStatus !== "PAUSED" || actionLoading !== null}
                    variant="outline"
                  >
                    {actionLoading === "resume" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
                    Resume
                  </Button>
                  <Button
                    onClick={stopSimulation}
                    disabled={simStatus === "STOPPED" || actionLoading !== null}
                    variant="outline"
                  >
                    {actionLoading === "stop" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Square className="w-4 h-4 mr-1.5" />}
                    Stop
                  </Button>
                  <Button
                    onClick={nextReading}
                    disabled={simStatus === "STOPPED" || actionLoading !== null}
                    variant="secondary"
                  >
                    {actionLoading === "next" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
                    Next Reading
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Environmental Trend Charts */}
          {readings.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Temperature Profile</CardTitle>
                  <CardDescription>Target range: {config.tempMin}°C – {config.tempMax}°C</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={readings.slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="timestamp" tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} interval="preserveStartEnd" />
                      <YAxis domain={["auto", "auto"]} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(1)}°C`, "Temperature"]} />
                      <ReferenceLine y={config.tempMin} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Min", fill: "#ef4444", fontSize: 10 }} />
                      <ReferenceLine y={config.tempMax} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Max", fill: "#ef4444", fontSize: 10 }} />
                      <Line type="monotone" dataKey="temperature" stroke="#173B2F" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Humidity Profile</CardTitle>
                  <CardDescription>Target range: {config.humidityMin}% – {config.humidityMax}%</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={readings.slice().reverse()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="timestamp" tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} interval="preserveStartEnd" />
                      <YAxis domain={["auto", "auto"]} />
                      <Tooltip formatter={(value: number) => [`${value.toFixed(0)}%`, "Humidity"]} />
                      <ReferenceLine y={config.humidityMin} stroke="#0284c7" strokeDasharray="4 4" label={{ value: "Min", fill: "#0284c7", fontSize: 10 }} />
                      <ReferenceLine y={config.humidityMax} stroke="#0284c7" strokeDasharray="4 4" label={{ value: "Max", fill: "#0284c7", fontSize: 10 }} />
                      <Line type="monotone" dataKey="humidity" stroke="#0284c7" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {readings.length === 0 && !dataLoading && !dataError && (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <Thermometer className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="font-semibold text-foreground">No Telemetry Recorded</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                No simulated sensor readings have been produced for this shipment yet. Click &quot;Start&quot; above to initiate simulation.
              </p>
            </div>
          )}

          {/* Readings History Table */}
          {readings.length > 0 && (
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Telemetry Log</CardTitle>
                <CardDescription>Persisted sensor records for the selected shipment</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Temperature</TableHead>
                      <TableHead>Humidity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Origin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readings.slice(0, 15).map((reading, index) => (
                      <TableRow key={reading.id || index}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {new Date(reading.timestamp).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="font-medium">{reading.temperature.toFixed(1)}°C</TableCell>
                        <TableCell className="font-medium">{reading.humidity.toFixed(0)}%</TableCell>
                        <TableCell>
                          <Badge variant={reading.status === "NORMAL" ? "success" : reading.status === "WARNING" ? "warning" : "destructive"}>
                            {reading.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">SIMULATOR</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Active Alerts Table */}
          {alerts.length > 0 && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Active Environmental Excursions
                </CardTitle>
                <CardDescription>Alerts generated from non-compliant sensor thresholds</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Condition</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Observed</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Logged At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.alert_id}>
                        <TableCell className="font-medium capitalize">{alert.alert_type.toLowerCase()}</TableCell>
                        <TableCell>
                          <Badge variant={alert.severity === "CRITICAL" ? "destructive" : "warning"}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{alert.observed_value}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {alert.configured_min !== undefined && alert.configured_max !== undefined
                            ? `${alert.configured_min} – ${alert.configured_max}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={alert.status === "ACTIVE" ? "destructive" : "secondary"}>
                            {alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {new Date(alert.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
