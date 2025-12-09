import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  CloudRain,
  GraduationCap,
  PlayCircle,
  Languages,
  Clock,
  Phone,
  MapPin,
  TrendingUp,
  Info,
  Globe2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/contexts/CountryContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import NewOverview from "./NewOverview";
import ClimateData from "./ClimateData";
import Training from "./Training";
import Simulation from "./Simulation";
import InfoPage from "./Info";
import DiseaseAnalysis from "./DiseaseAnalysis";
import LocationAnalysis from "./LocationAnalysis";
import ForecastDashboard from "./forecast/ForecastDashboard";

const Dashboard = () => {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [selectedLanguage, setSelectedLanguage] = React.useState("English");
  const { countryConfig, isLoading: countryLoading } = useCountry();
  const {
    overview,
    isLoading: overviewLoading,
    error: overviewError,
    refresh,
    dataSource,
    setDataSource
  } = useDashboardData();

  // Set default data source to DHIS2 Live
  React.useEffect(() => {
    if (dataSource !== "dhis2") {
      setDataSource("dhis2");
    }
  }, []);

  // Update current time every second (Sierra Leone time)
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs = [
    { id: "info", label: "Info", icon: Info },
    { id: "overview", label: "Overview", icon: Activity },
    { id: "forecast", label: "Prediction Risk", icon: TrendingUp },
    { id: "climate", label: "Climate Impact", icon: CloudRain },
    { id: "location-analysis", label: "Location Analysis", icon: MapPin },
    { id: "disease-analysis", label: "Disease Analysis", icon: Activity },
    { id: "simulation", label: "Simulation", icon: PlayCircle },
    { id: "training", label: "Training", icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen py-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mb-4"
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-3">
            <Globe2 className="h-10 w-10 text-primary" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {countryConfig ? `${countryConfig.name} CI-EWS Dashboard` : "Loading..."}
              </h1>
              {countryConfig?.healthSystemLevels && (
                <p className="text-sm text-muted-foreground mt-1">
                  Health System Levels: {countryConfig.healthSystemLevels.join(" → ")}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer"
                >
                  <option value="English">English</option>
                  <option value="Francis" disabled className="text-muted-foreground">Francis</option>
                </select>
                <span className="text-sm text-muted-foreground"></span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {currentTime.toLocaleTimeString('en-US', {
                    timeZone: countryConfig?.timeZone || 'Africa/Freetown',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })} GMT
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Emergency 117</span>
              </div>
              {/* <Button
                variant="outline"
                size="icon"
                onClick={onThemeToggle}
                className="rounded-full"
              >
                {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button> */}
            </div>
            {overview?.lastUpdated && (
              <p className="text-sm text-muted-foreground">
                Updated On: {new Date(overview.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </motion.div>

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
        {activeTab === "info" && <InfoPage />}
        {activeTab === "overview" && <NewOverview />}
        {activeTab === "disease-analysis" && <DiseaseAnalysis />}
        {activeTab === "location-analysis" && <LocationAnalysis />}
        {activeTab === "forecast" && <ForecastDashboard />}
        {activeTab === "climate" && <ClimateData />}
        {activeTab === "training" && <Training />}
        {activeTab === "simulation" && <Simulation />}
      </motion.div>
    </div>
  );
};

export default Dashboard;
