"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Play, Pause, Square, RefreshCw, Maximize, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface SensorReading {
  temperature: number;
  humidity: number;
  status: string;
  timestamp: string;
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

export default function ColdChainPage() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);
  const [simStatus, setSimStatus] = useState<"STOPPED" | "RUNNING" | "PAUSED">("STOPPED");
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [currentHumidity, setCurrentHumidity] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState({
    tempMin: 7,
    tempMax: 13,
    humidityMin: 85,
    humidityMax: 95,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [rRes, sRes] = await Promise.all([
          apiClient.get("/sensors/shipments/demo-shipment/sensor-readings?page_size=50"),
          apiClient.get("/sensors/shipments/demo-shipment/sensor-alerts"),
        ]);
        setReadings(rRes.data || []);
        setAlerts(sRes.data || []);
        if (rRes.data && rRes.data.length > 0) {
          const latest = rRes.data[0];
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
        }
        setError(null);
      } catch (e) {
        setError("Failed to load sensor data. Using demo data.");
        setCurrentTemp(8.2);
        setCurrentHumidity(84);
        setReadings([
          { temperature: 7.1, humidity: 85, status: "NORMAL", timestamp: new Date().toISOString() },
          { temperature: 7.8, humidity: 83, status: "NORMAL", timestamp: new Date(Date.now() - 300000).toISOString() },
          { temperature: 8.2, humidity: 84, status: "NORMAL", timestamp: new Date(Date.now() - 600000).toISOString() },
        ]);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const startSimulation = async () => {
    try {
      await apiClient.post("/sensors/shipments/demo-shipment/simulation/start", {
        scenario: "NORMAL",
        interval_seconds: 30,
      });
      setSimStatus("RUNNING");
    } catch (e) {
      setSimStatus("RUNNING");
    }
  };

  const pauseSimulation = async () => {
    try {
      await apiClient.post("/sensors/shipments/demo-shipment/simulation/pause");
      setSimStatus("PAUSED");
    } catch (e) {
      setSimStatus("PAUSED");
    }
  };

  const stopSimulation = async () => {
    try {
      await apiClient.post("/sensors/shipments/demo-shipment/simulation/stop");
      setSimStatus("STOPPED");
    } catch (e) {
      setSimStatus("STOPPED");
    }
  };

  const nextReading = async () => {
    try {
      const { data } = await apiClient.post("/sensors/shipments/demo-shipment/simulation/next-reading");
      setCurrentTemp(data.temperature);
      setCurrentHumidity(data.humidity);
      setReadings([data, ...readings]);
    } catch (e) {}
  };

  const isTempNormal = currentTemp !== null && currentTemp >= config.tempMin && currentTemp <= config.tempMax;
  const isHumidityNormal = currentHumidity !== null && currentHumidity >= config.humidityMin && currentHumidity <= config.humidityMax;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cold-Chain Monitoring"
        description="Monitor simulated temperature and humidity conditions during transit."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="warning" className="simulated-label">SIMULATED DATA</Badge>
          </div>
        }
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-warning/20 bg-warning/5 p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-warning" />
            <p className="text-warning">{error}</p>
          </div>
        </motion.div>
      )}

      <StaggerContainer>
        <StaggerItem delay={0}>
          <Card variant="metric" className={isTempNormal ? "" : "border-destructive/50"}>
            <CardHeader className="pb-3 flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">Temperature</CardTitle>
                <div className="text-3xl font-serif font-bold text-foreground">
                  {currentTemp !== null ? currentTemp.toFixed(1) : "—"}°C
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Thermometer className="w-6 h-6 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="warning" className="simulated-label">SIMULATED</Badge>
                <span>Range: {config.tempMin}°C - {config.tempMax}°C</span>
                <Badge variant={isTempNormal ? "success" : "destructive"} className="ml-auto">
                  {isTempNormal ? "Normal" : "Excursion"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem delay={0.05}>
          <Card variant="metric" className={isHumidityNormal ? "" : "border-destructive/50"}>
            <CardHeader className="pb-3 flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">Humidity</CardTitle>
                <div className="text-3xl font-serif font-bold text-foreground">
                  {currentHumidity !== null ? currentHumidity.toFixed(0) : "—"}%
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-info/10 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-info" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="warning" className="simulated-label">SIMULATED</Badge>
                <span>Range: {config.humidityMin}% - {config.humidityMax}%</span>
                <Badge variant={isHumidityNormal ? "success" : "destructive"} className="ml-auto">
                  {isHumidityNormal ? "Normal" : "Excursion"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem delay={0.1}>
          <Card variant="metric">
            <CardHeader className="pb-3 flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">Simulation Status</CardTitle>
                <div className="text-lg font-medium text-foreground">{simStatus}</div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="warning" className="simulated-label">SIMULATED</Badge>
                <Badge variant={simStatus === "RUNNING" ? "success" : simStatus === "PAUSED" ? "warning" : "secondary"}>
                  {simStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <div className="flex flex-wrap gap-2">
        <Button onClick={startSimulation} disabled={simStatus === "RUNNING"}>
          <Play className="w-4 h-4 mr-2" /> Start
        </Button>
        <Button onClick={pauseSimulation} disabled={simStatus !== "RUNNING"}>
          <Pause className="w-4 h-4 mr-2" /> Pause
        </Button>
<Button onClick={stopSimulation} disabled={simStatus === "STOPPED"}>
  <Square className="w-4 h-4 mr-2" /> Stop
</Button>
        <Button onClick={nextReading} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Next Reading
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="chart">
          <CardHeader>
            <CardTitle>Temperature Trend</CardTitle>
            <CardDescription>Real-time temperature monitoring with configured thresholds</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={readings.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} interval="preserveStartEnd" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}°C`, "Temperature"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 10px 30px -10px rgba(23, 59, 47, 0.15)",
                  }}
                />
                <ReferenceLine y={config.tempMin} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `Min: ${config.tempMin}°C`, position: "left", fill: "#ef4444" }} />
                <ReferenceLine y={config.tempMax} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `Max: ${config.tempMax}°C`, position: "left", fill: "#ef4444" }} />
                <Line type="monotone" dataKey="temperature" stroke="#4A9E7C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card variant="chart">
          <CardHeader>
            <CardTitle>Humidity Trend</CardTitle>
            <CardDescription>Real-time humidity monitoring with configured thresholds</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={readings.slice().reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} interval="preserveStartEnd" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(0)}%`, "Humidity"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 10px 30px -10px rgba(23, 59, 47, 0.15)",
                  }}
                />
                <ReferenceLine y={config.humidityMin} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: `Min: ${config.humidityMin}%`, position: "left", fill: "#3b82f6" }} />
                <ReferenceLine y={config.humidityMax} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: `Max: ${config.humidityMax}%`, position: "left", fill: "#3b82f6" }} />
                <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sensor Readings</CardTitle>
          <CardDescription>Latest temperature and humidity readings from the simulation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>Humidity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.slice(0, 10).map((reading, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {new Date(reading.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{reading.temperature}°C</TableCell>
                    <TableCell className="text-muted-foreground">{reading.humidity}%</TableCell>
                    <TableCell>
                      <Badge variant={
                        reading.status === "NORMAL" ? "success" :
                        reading.status === "WARNING" ? "warning" : "destructive"
                      }>
                        {reading.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="warning" className="simulated-label">SIMULATED</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>Temperature and humidity excursions requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Observed</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.alert_id}>
                      <TableCell className="text-muted-foreground capitalize">{alert.alert_type.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <Badge variant={
                          alert.severity === "CRITICAL" ? "destructive" :
                          alert.severity === "WARNING" ? "warning" : "info"
                        }>
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{alert.observed_value}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {alert.configured_min !== undefined && alert.configured_max !== undefined
                          ? `${alert.configured_min} - ${alert.configured_max}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          alert.status === "ACTIVE" ? "destructive" :
                          alert.status === "ACKNOWLEDGED" ? "warning" : "success"
                        }>
                          {alert.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {new Date(alert.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}