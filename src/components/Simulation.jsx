import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Activity,
  AlertTriangle,
  Users,
  TrendingUp,
  TrendingDown,
  Shield,
  Syringe,
  HeartPulse,
  Droplet,
  Heart,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import axios from "axios";
import SimulationMap from "./simulation/SimulationMap";

// IDSR Diseases with epidemiological parameters
const IDSR_DISEASES = {
  cholera: {
    name: "Cholera",
    icon: Droplet,
    color: "#3b82f6",
    r0: 2.5,
    incubationPeriod: 2,
    infectiousPeriod: 7,
    mortalityRate: 0.02,
    hospitalizationRate: 0.15,
    description: "Waterborne bacterial infection causing severe diarrhea"
  },
  measles: {
    name: "Measles",
    icon: Activity,
    color: "#ef4444",
    r0: 15,
    incubationPeriod: 10,
    infectiousPeriod: 8,
    mortalityRate: 0.002,
    hospitalizationRate: 0.10,
    description: "Highly contagious viral respiratory infection"
  },
  dengue: {
    name: "Dengue Fever",
    icon: Activity,
    color: "#f59e0b",
    r0: 3.5,
    incubationPeriod: 5,
    infectiousPeriod: 5,
    mortalityRate: 0.01,
    hospitalizationRate: 0.05,
    description: "Mosquito-borne viral infection"
  },
  malaria: {
    name: "Malaria",
    icon: Activity,
    color: "#10b981",
    r0: 2.0,
    incubationPeriod: 10,
    infectiousPeriod: 14,
    mortalityRate: 0.003,
    hospitalizationRate: 0.08,
    description: "Parasitic infection transmitted by mosquitoes"
  },
  yellowFever: {
    name: "Yellow Fever",
    icon: Zap,
    color: "#eab308",
    r0: 4.0,
    incubationPeriod: 6,
    infectiousPeriod: 5,
    mortalityRate: 0.05,
    hospitalizationRate: 0.20,
    description: "Mosquito-borne viral hemorrhagic disease"
  },
  meningitis: {
    name: "Meningitis",
    icon: AlertTriangle,
    color: "#8b5cf6",
    r0: 3.0,
    incubationPeriod: 4,
    infectiousPeriod: 10,
    mortalityRate: 0.10,
    hospitalizationRate: 0.90,
    description: "Bacterial infection of brain and spinal cord membranes"
  },
  covid19: {
    name: "COVID-19",
    icon: Shield,
    color: "#ec4899",
    r0: 4.5,
    incubationPeriod: 5,
    infectiousPeriod: 10,
    mortalityRate: 0.015,
    hospitalizationRate: 0.12,
    description: "Respiratory illness caused by SARS-CoV-2 virus"
  },
  typhoid: {
    name: "Typhoid Fever",
    icon: Heart,
    color: "#06b6d4",
    r0: 2.2,
    incubationPeriod: 10,
    infectiousPeriod: 14,
    mortalityRate: 0.01,
    hospitalizationRate: 0.25,
    description: "Bacterial infection spread through contaminated food/water"
  }
};

// Intervention types with effectiveness
const INTERVENTIONS = {
  vaccination: {
    name: "Mass Vaccination Campaign",
    icon: Syringe,
    effectiveness: 0.85,
    cost: 50000,
    duration: 30,
    color: "#10b981",
    description: "Reduces susceptibility by 85%"
  },
  socialDistancing: {
    name: "Social Distancing",
    icon: Users,
    effectiveness: 0.50,
    cost: 5000,
    duration: 60,
    color: "#3b82f6",
    description: "Reduces transmission by 50%"
  },
  quarantine: {
    name: "Enhanced Quarantine",
    icon: Shield,
    effectiveness: 0.70,
    cost: 15000,
    duration: 45,
    color: "#f59e0b",
    description: "Isolates infected individuals, reduces transmission by 70%"
  },
  vectorControl: {
    name: "Vector Control",
    icon: Target,
    effectiveness: 0.60,
    cost: 20000,
    duration: 90,
    color: "#8b5cf6",
    description: "Mosquito control for vector-borne diseases"
  },
  treatmentProgram: {
    name: "Enhanced Treatment",
    icon: HeartPulse,
    effectiveness: 0.40,
    cost: 30000,
    duration: 90,
    color: "#ec4899",
    description: "Reduces mortality by 40% and infectious period"
  },
  hygiene: {
    name: "Water & Hygiene",
    icon: Droplet,
    effectiveness: 0.55,
    cost: 10000,
    duration: 120,
    color: "#06b6d4",
    description: "Improves sanitation, reduces waterborne transmission"
  }
};

// SEIR Model implementation
class SEIRModel {
  constructor(config) {
    this.population = config.population;
    this.initialInfected = config.initialInfected;
    this.r0 = config.r0;
    this.incubationPeriod = config.incubationPeriod;
    this.infectiousPeriod = config.infectiousPeriod;
    this.mortalityRate = config.mortalityRate;

    // State variables
    this.S = this.population - this.initialInfected; // Susceptible
    this.E = 0; // Exposed
    this.I = this.initialInfected; // Infected
    this.R = 0; // Recovered
    this.D = 0; // Deaths

    // Calculate rates
    this.beta = this.r0 / this.infectiousPeriod; // Transmission rate
    this.sigma = 1 / this.incubationPeriod; // Incubation rate
    this.gamma = 1 / this.infectiousPeriod; // Recovery rate
    this.mu = this.mortalityRate * this.gamma; // Mortality rate

    this.interventionEffects = [];
    this.day = 0;
  }

  applyIntervention(intervention) {
    this.interventionEffects.push({
      ...intervention,
      startDay: this.day
    });
  }

  getEffectiveBeta() {
    let beta = this.beta;
    this.interventionEffects.forEach(effect => {
      const daysSinceStart = this.day - effect.startDay;
      if (daysSinceStart >= 0 && daysSinceStart < effect.duration) {
        beta *= (1 - effect.effectiveness);
      }
    });
    return beta;
  }

  step(dt = 1) {
    const N = this.S + this.E + this.I + this.R;
    const beta = this.getEffectiveBeta();

    // SEIR differential equations
    const dS = -beta * this.S * this.I / N;
    const dE = beta * this.S * this.I / N - this.sigma * this.E;
    const dI = this.sigma * this.E - this.gamma * this.I;
    const dR = (this.gamma - this.mu) * this.I;
    const dD = this.mu * this.I;

    // Update states
    this.S += dS * dt;
    this.E += dE * dt;
    this.I += dI * dt;
    this.R += dR * dt;
    this.D += dD * dt;

    // Ensure non-negative
    this.S = Math.max(0, this.S);
    this.E = Math.max(0, this.E);
    this.I = Math.max(0, this.I);
    this.R = Math.max(0, this.R);
    this.D = Math.max(0, this.D);

    this.day += dt;

    return {
      day: Math.round(this.day),
      susceptible: Math.round(this.S),
      exposed: Math.round(this.E),
      infected: Math.round(this.I),
      recovered: Math.round(this.R),
      deaths: Math.round(this.D),
      totalCases: Math.round(this.I + this.R + this.D),
      activeInterventions: this.interventionEffects.filter(e =>
        this.day >= e.startDay && this.day < e.startDay + e.duration
      ).length
    };
  }

  getCurrentR0() {
    const effectiveBeta = this.getEffectiveBeta();
    return effectiveBeta * this.infectiousPeriod;
  }
}

const Simulation = () => {
  // Error handling
  const [error, setError] = useState(null);

  // State management
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedDisease, setSelectedDisease] = useState("dengue");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [showInterventions, setShowInterventions] = useState(true);

  // Simulation state
  const [simulationData, setSimulationData] = useState([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [model, setModel] = useState(null);
  const [activeInterventions, setActiveInterventions] = useState([]);

  // Location data
  const [regions, setRegions] = useState([]);

  // Simulation parameters
  const [parameters, setParameters] = useState({
    population: 500000,
    initialInfected: 10,
    temperature: 28,
    rainfall: 120,
    humidity: 75
  });

  const animationRef = useRef(null);

  // Fetch location data
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await axios.get("/api/locations?level=2");
        setRegions(response.data.data || []);
      } catch (error) {
        console.error("Error fetching locations:", error);
        // Fallback to default regions
        setRegions([
          { name: "Eastern", id: "eastern", coordinates: [-11.1, 8.0] },
          { name: "Northern", id: "northern", coordinates: [-12.5, 9.0] },
          { name: "North Western", id: "northwestern", coordinates: [-12.8, 8.8] },
          { name: "Southern", id: "southern", coordinates: [-11.9, 7.5] },
          { name: "Western Area", id: "western", coordinates: [-13.2, 8.5] }
        ]);
      }
    };

    try {
      fetchLocations();
    } catch (err) {
      console.error("Fatal error fetching locations:", err);
      setError("Failed to initialize simulation");
    }
  }, []);

  // Initialize simulation
  useEffect(() => {
    initializeSimulation();
  }, [selectedDisease, parameters, selectedRegion]);

  const initializeSimulation = () => {
    const disease = IDSR_DISEASES[selectedDisease];
    const newModel = new SEIRModel({
      population: parameters.population,
      initialInfected: parameters.initialInfected,
      r0: disease.r0,
      incubationPeriod: disease.incubationPeriod,
      infectiousPeriod: disease.infectiousPeriod,
      mortalityRate: disease.mortalityRate
    });

    setModel(newModel);
    const initialData = newModel.step(0);
    setSimulationData([initialData]);
    setCurrentDay(0);
    setActiveInterventions([]);
  };

  // Animation loop
  useEffect(() => {
    if (isRunning && model) {
      const interval = 1000 / speed; // Adjust speed

      animationRef.current = setInterval(() => {
        const newData = model.step(1);
        setSimulationData(prev => [...prev, newData]);
        setCurrentDay(newData.day);

        // Stop if infection dies out or reaches max days
        if (newData.infected < 1 || newData.day > 365) {
          setIsRunning(false);
        }
      }, interval);

      return () => clearInterval(animationRef.current);
    }
  }, [isRunning, speed, model]);

  const toggleSimulation = () => {
    setIsRunning(!isRunning);
  };

  const resetSimulation = () => {
    setIsRunning(false);
    initializeSimulation();
  };

  const applyIntervention = (interventionKey) => {
    if (model) {
      const intervention = INTERVENTIONS[interventionKey];
      model.applyIntervention(intervention);
      setActiveInterventions(prev => [...prev, {
        ...intervention,
        key: interventionKey,
        appliedDay: currentDay
      }]);
    }
  };

  const disease = IDSR_DISEASES[selectedDisease];
  const DiseaseIcon = disease.icon;
  const currentData = simulationData[simulationData.length - 1] || {
    susceptible: parameters.population,
    exposed: 0,
    infected: parameters.initialInfected,
    recovered: 0,
    deaths: 0,
    totalCases: parameters.initialInfected
  };

  const currentR0 = model ? model.getCurrentR0() : disease.r0;
  const peakInfections = simulationData.length > 0
    ? Math.max(...simulationData.map(d => d.infected))
    : 0;

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">Simulation Error</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-2xl font-bold">Epidemiological Simulation</h2>
            <span className="inline-flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              <Activity className="h-3 w-3" />
              <span>BETA</span>
            </span>
          </div>
          <p className="text-muted-foreground">
            Real-time disease outbreak simulation with epidemiological modeling
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(true)}
            title="Simulation Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={resetSimulation}
            title="Reset Simulation"
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
                <span>Start Simulation</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Control Panel */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card border rounded-lg p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Disease Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Disease</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedDisease}
              onChange={(e) => setSelectedDisease(e.target.value)}
              disabled={isRunning}
            >
              {Object.entries(IDSR_DISEASES).map(([key, disease]) => (
                <option key={key} value={key}>
                  {disease.name}
                </option>
              ))}
            </select>
          </div>

          {/* Region Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Location Filter</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              disabled={isRunning}
            >
              <option value="all">All Regions</option>
              {regions.map((region) => (
                <option key={region.id || region.name} value={region.id || region.name}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          {/* Speed Control */}
          <div>
            <label className="text-sm font-medium mb-2 block">Simulation Speed</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value={0.5}>0.5x (Slow)</option>
              <option value={1}>1x (Normal)</option>
              <option value={2}>2x (Fast)</option>
              <option value={5}>5x (Very Fast)</option>
              <option value={10}>10x (Maximum)</option>
            </select>
          </div>

          {/* Current Day */}
          <div>
            <label className="text-sm font-medium mb-2 block">Current Day</label>
            <div className="flex items-center space-x-2 bg-primary/10 rounded-md px-3 py-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-primary">{currentDay}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Disease Info Banner */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4"
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <DiseaseIcon className="h-6 w-6" style={{ color: disease.color }} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1 flex items-center space-x-2">
              <span>{disease.name}</span>
              <span className="text-xs font-normal text-muted-foreground">
                (R₀: {disease.r0.toFixed(1)})
              </span>
            </h3>
            <p className="text-sm text-muted-foreground mb-2">{disease.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Incubation: </span>
                <span className="font-medium">{disease.incubationPeriod} days</span>
              </div>
              <div>
                <span className="text-muted-foreground">Infectious Period: </span>
                <span className="font-medium">{disease.infectiousPeriod} days</span>
              </div>
              <div>
                <span className="text-muted-foreground">Mortality Rate: </span>
                <span className="font-medium">{(disease.mortalityRate * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Hospitalization: </span>
                <span className="font-medium">{(disease.hospitalizationRate * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 opacity-80" />
            <TrendingDown className="h-4 w-4 opacity-60" />
          </div>
          <p className="text-xs opacity-80 mb-1">Susceptible</p>
          <p className="text-2xl font-bold">{currentData.susceptible.toLocaleString()}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-5 w-5 opacity-80" />
            <TrendingUp className="h-4 w-4 opacity-60" />
          </div>
          <p className="text-xs opacity-80 mb-1">Exposed</p>
          <p className="text-2xl font-bold">{currentData.exposed.toLocaleString()}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="h-5 w-5 opacity-80" />
            <TrendingUp className="h-4 w-4 opacity-60" />
          </div>
          <p className="text-xs opacity-80 mb-1">Infected</p>
          <p className="text-2xl font-bold">{currentData.infected.toLocaleString()}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Heart className="h-5 w-5 opacity-80" />
            <TrendingUp className="h-4 w-4 opacity-60" />
          </div>
          <p className="text-xs opacity-80 mb-1">Recovered</p>
          <p className="text-2xl font-bold">{currentData.recovered.toLocaleString()}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Activity className="h-5 w-5 opacity-80" />
            <Info className="h-4 w-4 opacity-60" />
          </div>
          <p className="text-xs opacity-80 mb-1">Deaths</p>
          <p className="text-2xl font-bold">{currentData.deaths.toLocaleString()}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 opacity-80" />
            <Activity className="h-4 w-4 opacity-60" />
          </div>
          <p className="text-xs opacity-80 mb-1">Effective R₀</p>
          <p className="text-2xl font-bold">{currentR0.toFixed(2)}</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Shield className="h-5 w-5 opacity-80" />
            <Info className="h-4 w-4 opacity-60" />
          </div>
          <p className="text-xs opacity-80 mb-1">Active Interventions</p>
          <p className="text-2xl font-bold">{currentData.activeInterventions || 0}</p>
        </motion.div>
      </div>

      {/* Geographic Map Visualization */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card border rounded-lg p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Activity className="h-5 w-5" style={{ color: disease.color }} />
          <span>Live Geographic Spread</span>
          {isRunning && (
            <span className="text-xs text-muted-foreground">(Real-time)</span>
          )}
        </h3>
        <SimulationMap
          currentDay={currentDay}
          disease={disease}
          regions={regions}
          selectedRegion={selectedRegion}
          isRunning={isRunning}
        />
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disease Progression Chart */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-card border rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Disease Progression (SEIR Model)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={simulationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                label={{ value: 'Population', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="susceptible"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.6}
                name="Susceptible"
              />
              <Area
                type="monotone"
                dataKey="exposed"
                stackId="1"
                stroke="#eab308"
                fill="#eab308"
                fillOpacity={0.6}
                name="Exposed"
              />
              <Area
                type="monotone"
                dataKey="infected"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.8}
                name="Infected"
              />
              <Area
                type="monotone"
                dataKey="recovered"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Recovered"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Active Cases & Deaths */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-card border rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Active Cases & Mortality</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={simulationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="infected"
                stroke="#ef4444"
                strokeWidth={3}
                dot={false}
                name="Active Infections"
              />
              <Line
                type="monotone"
                dataKey="deaths"
                stroke="#6b7280"
                strokeWidth={2}
                dot={false}
                name="Cumulative Deaths"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Interventions Panel */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card border rounded-lg overflow-hidden"
      >
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
          onClick={() => setShowInterventions(!showInterventions)}
        >
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Public Health Interventions</h3>
            <span className="text-xs text-muted-foreground">
              ({Object.keys(INTERVENTIONS).length} available)
            </span>
          </div>
          <Button variant="ghost" size="icon">
            {showInterventions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <AnimatePresence>
          {showInterventions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t"
            >
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(INTERVENTIONS).map(([key, intervention]) => {
                    const InterventionIcon = intervention.icon;
                    const isActive = activeInterventions.some(ai => ai.key === key);

                    return (
                      <motion.div
                        key={key}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`relative bg-background border-2 rounded-lg p-4 transition-all ${
                          isActive
                            ? 'border-green-500 shadow-lg'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute top-2 right-2">
                            <span className="inline-flex items-center space-x-1 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                              <Activity className="h-3 w-3" />
                              <span>ACTIVE</span>
                            </span>
                          </div>
                        )}

                        <div className="flex items-start space-x-3 mb-3">
                          <div
                            className="flex-shrink-0 p-2 rounded-lg"
                            style={{ backgroundColor: `${intervention.color}20` }}
                          >
                            <InterventionIcon
                              className="h-6 w-6"
                              style={{ color: intervention.color }}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">{intervention.name}</h4>
                            <p className="text-xs text-muted-foreground">{intervention.description}</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs mb-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Effectiveness:</span>
                            <span className="font-medium">{(intervention.effectiveness * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium">{intervention.duration} days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cost:</span>
                            <span className="font-medium">${intervention.cost.toLocaleString()}</span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => applyIntervention(key)}
                          disabled={isActive || !isRunning}
                          variant={isActive ? "outline" : "default"}
                        >
                          {isActive ? "Applied" : "Deploy Intervention"}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>

                {activeInterventions.length > 0 && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <h4 className="font-semibold text-sm mb-3 flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      <span>Active Intervention Timeline</span>
                    </h4>
                    <div className="space-y-2">
                      {activeInterventions.map((intervention, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className="font-medium">{intervention.name}</span>
                          <span className="text-muted-foreground">
                            Day {intervention.appliedDay} - {intervention.appliedDay + intervention.duration}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Summary Statistics */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg p-6"
      >
        <h3 className="font-semibold text-lg mb-4 flex items-center space-x-2">
          <Info className="h-5 w-5 text-indigo-600" />
          <span>Simulation Summary</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Total Cases</p>
            <p className="text-2xl font-bold">{currentData.totalCases.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Peak Infections</p>
            <p className="text-2xl font-bold">{peakInfections.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Case Fatality Rate</p>
            <p className="text-2xl font-bold">
              {currentData.totalCases > 0
                ? ((currentData.deaths / currentData.totalCases) * 100).toFixed(2)
                : 0}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Attack Rate</p>
            <p className="text-2xl font-bold">
              {((currentData.totalCases / parameters.population) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </motion.div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-background border-b p-6 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">Simulation Parameters</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure initial conditions for the epidemic model
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Initial Population
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={parameters.population}
                    onChange={(e) => setParameters({
                      ...parameters,
                      population: parseInt(e.target.value) || 0
                    })}
                    disabled={isRunning}
                    min="1000"
                    max="10000000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total population at risk
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Initial Infected Cases
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={parameters.initialInfected}
                    onChange={(e) => setParameters({
                      ...parameters,
                      initialInfected: parseInt(e.target.value) || 1
                    })}
                    disabled={isRunning}
                    min="1"
                    max="10000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of infected individuals at simulation start
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Environmental Factors</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Temperature (°C)</label>
                      <input
                        type="number"
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={parameters.temperature}
                        onChange={(e) => setParameters({
                          ...parameters,
                          temperature: parseFloat(e.target.value) || 0
                        })}
                        disabled={isRunning}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Rainfall (mm)</label>
                      <input
                        type="number"
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={parameters.rainfall}
                        onChange={(e) => setParameters({
                          ...parameters,
                          rainfall: parseFloat(e.target.value) || 0
                        })}
                        disabled={isRunning}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Humidity (%)</label>
                      <input
                        type="number"
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        value={parameters.humidity}
                        onChange={(e) => setParameters({
                          ...parameters,
                          humidity: parseFloat(e.target.value) || 0
                        })}
                        disabled={isRunning}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Climate factors affect vector-borne disease transmission
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-2">About SEIR Model</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This simulation uses the SEIR (Susceptible-Exposed-Infected-Recovered)
                    compartmental model, a fundamental epidemiological framework. The model
                    tracks population movement through disease states and calculates the
                    effective reproduction number (R₀) based on transmission dynamics and interventions.
                  </p>
                </div>
              </div>

              <div className="sticky bottom-0 bg-background border-t p-6 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowSettings(false);
                    resetSimulation();
                  }}
                  disabled={isRunning}
                >
                  Apply & Reset
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Simulation;
