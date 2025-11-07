import React from "react";
import { motion } from "framer-motion";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Sliders,
  Calendar,
  MapPin,
  ThermometerSun,
  Users,
  Activity,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Simulation = () => {
  const [isRunning, setIsRunning] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [currentDay, setCurrentDay] = React.useState(1);
  const [speed, setSpeed] = React.useState(1);
  const [scenario, setScenario] = React.useState("dengue");

  const scenarios = [
    { id: "dengue", name: "Dengue Outbreak" },
    { id: "malaria", name: "Malaria Spread" },
    { id: "covid", name: "COVID-19 Wave" },
    { id: "custom", name: "Custom Scenario" }
  ];

  const simulationMetrics = {
    cases: 156,
    reproduction: 1.8,
    risk: "High",
    affected: 3,
    temperature: 32,
    rainfall: 150
  };

  const interventions = [
    { id: 1, name: "Vector Control", effectiveness: 75, cost: 1000 },
    { id: 2, name: "Public Education", effectiveness: 60, cost: 500 },
    { id: 3, name: "Medical Resources", effectiveness: 85, cost: 2000 }
  ];

  const toggleSimulation = () => {
    setIsRunning(!isRunning);
  };

  const resetSimulation = () => {
    setIsRunning(false);
    setCurrentDay(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Disease Outbreak Simulator</h2>
          <p className="text-muted-foreground">Test response strategies in a safe environment</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={resetSimulation}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant={isRunning ? "destructive" : "default"}
            onClick={toggleSimulation}
            className="flex items-center space-x-2"
          >
            {isRunning ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Start</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <label className="text-sm font-medium">Scenario</label>
              <select
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Simulation Speed</label>
              <select
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
              </select>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Current Day</p>
            <p className="text-2xl font-bold">{currentDay}</p>
          </div>
        </div>
      </div>

      {/* Simulation Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-card border rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Cases</span>
          </div>
          <p className="text-2xl font-bold">{simulationMetrics.cases}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">R₀</span>
          </div>
          <p className="text-2xl font-bold">{simulationMetrics.reproduction}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-card border rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Risk Level</span>
          </div>
          <p className="text-2xl font-bold">{simulationMetrics.risk}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-card border rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Regions</span>
          </div>
          <p className="text-2xl font-bold">{simulationMetrics.affected}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-card border rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-2">
            <ThermometerSun className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Temperature</span>
          </div>
          <p className="text-2xl font-bold">{simulationMetrics.temperature}°C</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-card border rounded-lg p-4"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Rainfall</span>
          </div>
          <p className="text-2xl font-bold">{simulationMetrics.rainfall}mm</p>
        </motion.div>
      </div>

      {/* Intervention Controls */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Available Interventions</h3>
        <div className="space-y-4">
          {interventions.map((intervention) => (
            <motion.div
              key={intervention.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-background p-4 rounded-lg border flex items-center justify-between"
            >
              <div>
                <h4 className="font-medium">{intervention.name}</h4>
                <div className="flex items-center space-x-4 mt-1">
                  <p className="text-sm text-muted-foreground">
                    Effectiveness: {intervention.effectiveness}%
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cost: ${intervention.cost}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm">Deploy</Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">Simulation Settings</h3>
                <p className="text-muted-foreground">Configure simulation parameters</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Initial Cases</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                  defaultValue={10}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Population Size</label>
                <input
                  type="number"
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
                  defaultValue={100000}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Climate Conditions</label>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <input
                    type="number"
                    className="block w-full rounded-md border border-input bg-background px-3 py-2"
                    placeholder="Temperature (°C)"
                  />
                  <input
                    type="number"
                    className="block w-full rounded-md border border-input bg-background px-3 py-2"
                    placeholder="Rainfall (mm)"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Intervention Thresholds</label>
                <div className="space-y-2 mt-1">
                  <input
                    type="range"
                    className="w-full"
                    min="0"
                    max="100"
                    defaultValue="50"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setShowSettings(false)}>
                  Save Settings
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Simulation;