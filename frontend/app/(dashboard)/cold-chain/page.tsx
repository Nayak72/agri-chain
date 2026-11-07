"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, AlertCircle, Play, Pause, Stop, RefreshCw, Maximize } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ColdChainPage() {
  const [readings, setReadings] = useState<any[]>([]);
  const [simStatus, setSimStatus] = useState("STOPPED");
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [currentHumidity, setCurrentHumidity] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [rRes, sRes] = await Promise.all([
        apiClient.get("/sensors/shipments/demo-shipment/sensor-readings?page_size=50"),
        apiClient.get("/sensors/shipments/demo-shipment/sensor-alerts"),
      ]);
      setReadings(rRes.data || []);
      if (rRes.data && rRes.data.length > 0) {
        const latest = rRes.data[0];
        setCurrentTemp(latest.temperature);
        setCurrentHumidity(latest.humidity);
      }
    } catch (e) {
      // Use demo data
      setCurrentTemp(8.2);
      setCurrentHumidity(84);
      setReadings([
        { temperature: 7.1, humidity: 85, status: "NORMAL", timestamp: new Date().toISOString() },
        { temperature: 7.8, humidity: 83, status: "NORMAL", timestamp: new Date(Date.now() - 300000).toISOString() },
        { temperature: 8.2, humidity: 84, status: "NORMAL", timestamp: new Date(Date.now() - 600000).toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function startSimulation() {
    try {
      await apiClient.post("/sensors/shipments/demo-shipment/simulation/start", {
        scenario: "NORMAL",
        interval_seconds: 30,
      });
      setSimStatus("RUNNING");
    } catch (e) {
      setSimStatus("RUNNING");
    }
  }

  async function pauseSimulation() {
    try {
      await apiClient.post("/sensors/shipments/demo-shipment/simulation/pause");
      setSimStatus("PAUSED");
    } catch (e) {
      setSimStatus("PAUSED");
    }
  }

  async function stopSimulation() {
    try {
      await apiClient.post("/sensors/shipments/demo-shipment/simulation/stop");
      setSimStatus("STOPPED");
    } catch (e) {
      setSimStatus("STOPPED");
    }
  }

  async function nextReading() {
    try {
      const { data } = await apiClient.post("/sensors/shipments/demo-shipment/simulation/next-reading");
      setCurrentTemp(data.temperature);
      setCurrentHumidity(data.humidity);
      setReadings([data, ...readings]);
    } catch (e) {}
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-charcoal">Cold-Chain Monitoring</h1>
          <p className="text-muted-foreground">Monitor simulated temperature and humidity conditions during transit.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={startSimulation} disabled={simStatus === "RUNNING"}>
            <Play className="w-4 h-4 mr-2" /> Start
          </Button>
          <Button onClick={pauseSimulation} disabled={simStatus !== "RUNNING"}>
            <Pause className="w-4 h-4 mr-2" /> Pause
          </Button>
          <Button onClick={stopSimulation} disabled={simStatus === "STOPPED"}>
            <Stop className="w-4 h-4 mr-2" /> Stop
          </Button>
          <Button onClick={nextReading} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Next Reading
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-panel p-6">
          <CardHeader className="pb-3 flex items-center justify-between">
            <div>
              <CardTitle className="text-sm text-muted-foreground">Temperature</CardTitle>
              <div className="text-3xl font-serif font-bold text-charcoal">
                {currentTemp !== null ? currentTemp.toFixed(1) : "—"}°C
              </div>
            </div>
            <Thermometer className="w-6 h-6 text-forest-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="simulated-label">SIMULATED DATA</span>
              <span>Range: 7°C - 13°C</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel p-6">
          <CardHeader className="pb-3 flex items-center justify-between">
            <div>
              <CardTitle className="text-sm text-muted-foreground">Humidity</CardTitle>
              <div className="text-3xl font-serif font-bold text-charcoal">
                {currentHumidity !== null ? currentHumidity.toFixed(0) : "—"}%
              </div>
            </div>
            <Droplets className="w-6 h-6 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="simulated-label">SIMULATED DATA</span>
              <span>Range: 85% - 95%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel p-6">
          <CardHeader className="pb-3 flex items-center justify-between">
            <div>
              <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
              <div className="text-lg font-medium text-forest-800">{simStatus}</div>
            </div>
            <Clock className="w-6 h-6 text-forest-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">Normal</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Temperature Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readings.map((r, i) => ({ temp: r.temperature, time: `T${i}` }))}>
                <CartesianGrid strokeDasharray="3 3" strokeBorderColor="#e2e8f0" vertical={false} />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="temp" stroke="#4A9E7C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Humidity Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readings.map((r, i) => ({ hum: r.humidity, time: `T${i}` }))}>
                <CartesianGrid strokeDasharray="3 3" strokeBorderColor="#e2e8f0" vertical={false} />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="hum" stroke="#2A6D51" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Readings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Temperature</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Humidity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Source</th>
                </tr>
              </thead>
              <tbody>
                {readings.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-b border-border/40">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.temperature}°C</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.humidity}%</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${r.status === "NORMAL" ? "bg-green-100 text-green-700" : r.status === "WARNING" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="simulated-label">SIMULATED</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}