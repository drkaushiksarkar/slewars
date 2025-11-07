import React from "react";
import { apiClient } from "@/lib/api";

export const CountryContext = React.createContext();

export const CountryProvider = ({ children }) => {
  const [countryConfigs, setCountryConfigs] = React.useState({});
  const [selectedCountry, setSelectedCountry] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const fetchConfigs = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.get("/config/countries");
      setCountryConfigs(data);
      const firstCountry = Object.keys(data)[0] || "";
      setSelectedCountry((prev) => prev || firstCountry);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const countryConfig = React.useMemo(() => {
    if (!selectedCountry) return null;
    return countryConfigs[selectedCountry];
  }, [countryConfigs, selectedCountry]);

  const contextValue = {
    selectedCountry,
    setSelectedCountry,
    countryConfig,
    countryConfigs,
    refreshCountries: fetchConfigs,
    isLoading,
    error
  };

  return (
    <CountryContext.Provider value={contextValue}>
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => {
  const context = React.useContext(CountryContext);
  if (!context) {
    throw new Error("useCountry must be used within a CountryProvider");
  }
  return context;
};
