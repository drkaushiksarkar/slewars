import React from "react";
import { motion } from "framer-motion";
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Calendar,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ClimateData = () => {
  const [selectedScenario, setSelectedScenario] = React.useState("rcp45");
  const [timeHorizon, setTimeHorizon] = React.useState("2050");
  const [showScenarioInfo, setShowScenarioInfo] = React.useState(false);

  const scenarios = [
    { id: "rcp26", label: "RCP 2.6 (Low Emission)" },
    { id: "rcp45", label: "RCP 4.5 (Intermediate)" },
    { id: "rcp85", label: "RCP 8.5 (High Emission)" }
  ];

  const timeHorizons = [
    { id: "2030", label: "2030" },
    { id: "2050", label: "2050" },
    { id: "2070", label: "2070" },
    { id: "2100", label: "2100" }
  ];

  const climateProjections = {
    rcp45: {
      "2050": {
        temperature: {
          value: "+2.1°C",
          range: "1.5°C to 2.7°C",
          confidence: "85%"
        },
        rainfall: {
          value: "+12%",
          range: "8% to 15%",
          confidence: "75%"
        },
        extremes: {
          heatwaves: "Likely increase",
          floods: "More frequent",
          droughts: "Moderate increase"
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Scenario Selection */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Climate Projections</h2>
          <p className="text-sm text-muted-foreground">
            Long-term climate scenarios based on RCP pathways
          </p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              className="w-full min-w-[200px] p-2 rounded-md border border-input bg-background text-sm"
            >
              {scenarios.map(scenario => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.label}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>
          <div className="relative">
            <select
              value={timeHorizon}
              onChange={(e) => setTimeHorizon(e.target.value)}
              className="w-full min-w-[100px] p-2 rounded-md border border-input bg-background text-sm"
            >
              {timeHorizons.map(horizon => (
                <option key={horizon.id} value={horizon.id}>
                  {horizon.label}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-muted-foreground" />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowScenarioInfo(true)}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Current Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-orange-100 dark:bg-orange-900/20 p-6 rounded-lg"
        >
          <div className="flex items-center space-x-2 mb-4">
            <Thermometer className="h-6 w-6 text-orange-500" />
            <h3 className="text-lg font-semibold">Temperature</h3>
          </div>
          <p className="text-3xl font-bold">32°C</p>
          <p className="text-sm text-muted-foreground">Current average</p>
          <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Projected Change</span>
              <span className="text-sm text-orange-600">
                {climateProjections[selectedScenario][timeHorizon].temperature.value}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Range: {climateProjections[selectedScenario][timeHorizon].temperature.range}
            </p>
            <p className="text-xs text-muted-foreground">
              Confidence: {climateProjections[selectedScenario][timeHorizon].temperature.confidence}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-blue-100 dark:bg-blue-900/20 p-6 rounded-lg"
        >
          <div className="flex items-center space-x-2 mb-4">
            <Droplets className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-semibold">Rainfall</h3>
          </div>
          <p className="text-3xl font-bold">75%</p>
          <p className="text-sm text-muted-foreground">Current level</p>
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Projected Change</span>
              <span className="text-sm text-blue-600">
                {climateProjections[selectedScenario][timeHorizon].rainfall.value}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Range: {climateProjections[selectedScenario][timeHorizon].rainfall.range}
            </p>
            <p className="text-xs text-muted-foreground">
              Confidence: {climateProjections[selectedScenario][timeHorizon].rainfall.confidence}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-green-100 dark:bg-green-900/20 p-6 rounded-lg"
        >
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="h-6 w-6 text-green-500" />
            <h3 className="text-lg font-semibold">Extreme Events</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Heatwaves</span>
              <span className="text-sm font-medium">
                {climateProjections[selectedScenario][timeHorizon].extremes.heatwaves}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Floods</span>
              <span className="text-sm font-medium">
                {climateProjections[selectedScenario][timeHorizon].extremes.floods}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Droughts</span>
              <span className="text-sm font-medium">
                {climateProjections[selectedScenario][timeHorizon].extremes.droughts}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Projection Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Temperature Projections</h3>
          <div className="h-[300px] bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Temperature projection chart</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Rainfall Projections</h3>
          <div className="h-[300px] bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Rainfall projection chart</p>
          </div>
        </div>
      </div>

      {/* Scenario Information Modal */}
      {showScenarioInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4"
          >
            <h3 className="text-xl font-semibold mb-4">Climate Scenario Information</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">RCP 2.6 (Low Emission)</h4>
                <p className="text-sm text-muted-foreground">
                  Stringent mitigation scenario with peak radiative forcing at ~3 W/m² before 2100
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">RCP 4.5 (Intermediate)</h4>
                <p className="text-sm text-muted-foreground">
                  Stabilization scenario with total radiative forcing stabilized at ~4.5 W/m² after 2100
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">RCP 8.5 (High Emission)</h4>
                <p className="text-sm text-muted-foreground">
                  High emission scenario with rising radiative forcing leading to ~8.5 W/m² in 2100
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowScenarioInfo(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ClimateData;