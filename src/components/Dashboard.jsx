import React from "react";
import { motion } from "framer-motion";
import { 
  Sun, 
  Moon, 
  Map, 
  Activity, 
  CloudRain, 
  GraduationCap, 
  PlayCircle,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/contexts/CountryContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import CountryHeader from "./CountryHeader";
import Overview from "./Overview";
import DiseaseMap from "./DiseaseMap";
import ClimateData from "./ClimateData";
import Training from "./Training";
import Simulation from "./Simulation";
import DataGenerator from "./DataGenerator";
import Response from "./Response";

const Dashboard = ({ theme, onThemeToggle }) => {
  const [activeTab, setActiveTab] = React.useState("overview");
  const { countryConfig, isLoading: countryLoading } = useCountry();
  const {
    overview,
    isLoading: overviewLoading,
    error: overviewError,
    refresh,
    dataSource,
    setDataSource
  } = useDashboardData();

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "response", label: "Response", icon: Activity },
    { id: "map", label: "Disease Map", icon: Map },
    { id: "climate", label: "Climate Data", icon: CloudRain },
    { id: "training", label: "Training", icon: GraduationCap },
    { id: "simulation", label: "Simulation", icon: PlayCircle },
    { id: "data", label: "Data Generator", icon: Database },
  ];

  return (
    <div className="min-h-screen py-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-8 flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {countryConfig ? `${countryConfig.name} EWARS Dashboard` : "Loading..."}
          </h1>
          {overview?.lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Updated {new Date(overview.lastUpdated).toLocaleString()} · Source:{" "}
              {overview.dataSource?.toUpperCase()}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onThemeToggle}
          className="rounded-full"
        >
          {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </Button>
      </motion.div>

      <CountryHeader />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card/40 p-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Data Source</p>
          <select
            value={dataSource}
            onChange={(e) => setDataSource(e.target.value)}
            className="mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={overviewLoading}
          >
            <option value="synthetic">Synthetic (Demo)</option>
            <option value="dhis2">DHIS2 Live</option>
            <option value="hybrid">Hybrid Blend</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {overview?.timeSeries?.length
              ? `${overview.timeSeries.length} data points loaded`
              : "No data yet"}
          </span>
          <Button variant="outline" size="sm" onClick={refresh} disabled={overviewLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {(countryLoading || overviewLoading) && (
        <div className="mb-4 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Syncing live data and model outputs...
        </div>
      )}
      {overviewError && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {overviewError}
          <Button variant="link" size="sm" className="ml-2 p-0" onClick={refresh}>
            Retry
          </Button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "outline"}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center space-x-2"
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Button>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-card rounded-lg p-6 shadow-lg"
      >
        {activeTab === "overview" && <Overview />}
        {activeTab === "response" && <Response />}
        {activeTab === "map" && <DiseaseMap />}
        {activeTab === "climate" && <ClimateData />}
        {activeTab === "training" && <Training />}
        {activeTab === "simulation" && <Simulation />}
        {activeTab === "data" && <DataGenerator />}
      </motion.div>
    </div>
  );
};

export default Dashboard;
