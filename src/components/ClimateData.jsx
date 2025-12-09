import React from "react";
import ClimateDashboard from "./climate/ClimateDashboard";

const ClimateData = () => {
  const [selectedLocation, setSelectedLocation] = React.useState({
    uid: "O6uvpzGd5pu",
    name: "Bo"
  });
  const [period, setPeriod] = React.useState("365");
  const [aggregation, setAggregation] = React.useState("week");

  // Available locations in Sierra Leone
  const locations = [
    { uid: "O6uvpzGd5pu", name: "Bo" },
    { uid: "fdc6uOvgoji", name: "Bombali" },
    { uid: "jmIPBj66vD6", name: "Bonthe" },
    { uid: "lc3eMKXaEfw", name: "Kailahun" },
    { uid: "jUb8gELQApl", name: "Kambia" },
    { uid: "PMa2VCrupOd", name: "Kenema" },
    { uid: "kJq2mPyFEHo", name: "Koinadugu" },
    { uid: "qhqAxPSTUXp", name: "Kono" },
    { uid: "Vth0fbpFcsO", name: "Moyamba" },
    { uid: "TEQlaapDQoK", name: "Port Loko" },
    { uid: "bL4ooGhyHRQ", name: "Pujehun" },
    { uid: "at6UHUQatSo", name: "Tonkolili" },
    { uid: "tIHvHYKFEfZ", name: "Western Area Urban" },
    { uid: "jNb63DIHuwU", name: "Western Area Rural" }
  ];

  return (
    <div className="space-y-6">
      {/* All Filters in Single Row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Location:
          </label>
          <select
            value={selectedLocation.uid}
            onChange={(e) => {
              const location = locations.find(loc => loc.uid === e.target.value);
              setSelectedLocation(location);
            }}
            className="flex-1 rounded-md border border-input bg-background px-4 py-2"
          >
            {locations.map(location => (
              <option key={location.uid} value={location.uid}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Time:
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-4 py-2"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Aggregation:
          </label>
          <select
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-4 py-2"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      {/* Current Climate Data View */}
      <ClimateDashboard
        locationUid={selectedLocation.uid}
        locationName={selectedLocation.name}
        period={period}
        aggregation={aggregation}
      />
    </div>
  );
};

export default ClimateData;