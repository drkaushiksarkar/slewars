import React from "react";
import { apiClient } from "@/lib/api";
import { useCountry } from "./CountryContext";

const DashboardDataContext = React.createContext();

export const DashboardDataProvider = ({ children }) => {
  const { selectedCountry } = useCountry();
  const [overview, setOverview] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [dataSource, setDataSource] = React.useState(
    import.meta.env.VITE_DEFAULT_DATA_SOURCE || "synthetic"
  );

  const fetchOverview = React.useCallback(async () => {
    if (!selectedCountry) return;
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ country: selectedCountry });
      if (dataSource) {
        params.append("source", dataSource);
      }
      const data = await apiClient.get(`/data/overview?${params.toString()}`);
      setOverview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCountry, dataSource]);

  React.useEffect(() => {
    setOverview(null);
  }, [selectedCountry, dataSource]);

  React.useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const contextValue = React.useMemo(
    () => ({
      overview,
      isLoading,
      error,
      dataSource,
      setDataSource,
      refresh: fetchOverview
    }),
    [overview, isLoading, error, dataSource, fetchOverview]
  );

  return (
    <DashboardDataContext.Provider value={contextValue}>
      {children}
    </DashboardDataContext.Provider>
  );
};

export const useDashboardData = () => {
  const context = React.useContext(DashboardDataContext);
  if (!context) {
    throw new Error("useDashboardData must be used within a DashboardDataProvider");
  }
  return context;
};
