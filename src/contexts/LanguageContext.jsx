import React from "react";
import { useCountry } from "./CountryContext";

export const LanguageContext = React.createContext();

const translations = {
  bangladesh: {
    en: {
      overview: "Overview",
      diseaseMap: "Disease Map",
      climateData: "Climate Data",
      training: "Training",
      simulation: "Simulation",
      dataGenerator: "Data Generator",
      alerts: "Active Alerts",
      trends: "Trend Analysis",
      lastUpdated: "Last Updated",
      filter: "Filter",
      legend: "Legend",
      highRisk: "High Risk",
      mediumRisk: "Medium Risk",
      lowRisk: "Low Risk"
    },
    bn: {
      overview: "সারসংক্ষেপ",
      diseaseMap: "রোগের মানচিত্র",
      climateData: "জলবায়ু তথ্য",
      training: "প্রশিক্ষণ",
      simulation: "সিমুলেশন",
      dataGenerator: "ডেটা জেনারেটর",
      alerts: "সক্রিয় সতর্কতা",
      trends: "প্রবণতা বিশ্লেষণ",
      lastUpdated: "সর্বশেষ আপডেট",
      filter: "ফিল্টার",
      legend: "সূচী",
      highRisk: "উচ্চ ঝুঁকি",
      mediumRisk: "মাঝারি ঝুঁকি",
      lowRisk: "কম ঝুঁকি"
    }
  },
  "sierra-leone": {  // Changed from sierraLeone to sierra-leone
    en: {
      overview: "Overview",
      diseaseMap: "Disease Map",
      climateData: "Climate Data",
      training: "Training",
      simulation: "Simulation",
      dataGenerator: "Data Generator",
      alerts: "Active Alerts",
      trends: "Trend Analysis",
      lastUpdated: "Last Updated",
      filter: "Filter",
      legend: "Legend",
      highRisk: "High Risk",
      mediumRisk: "Medium Risk",
      lowRisk: "Low Risk"
    },
    fr: {
      overview: "Aperçu",
      diseaseMap: "Carte des Maladies",
      climateData: "Données Climatiques",
      training: "Formation",
      simulation: "Simulation",
      dataGenerator: "Générateur de Données",
      alerts: "Alertes Actives",
      trends: "Analyse des Tendances",
      lastUpdated: "Dernière Mise à Jour",
      filter: "Filtrer",
      legend: "Légende",
      highRisk: "Risque Élevé",
      mediumRisk: "Risque Moyen",
      lowRisk: "Risque Faible"
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const { selectedCountry } = useCountry();
  const [language, setLanguage] = React.useState("en");

  const getAvailableLanguages = () => {
    if (!selectedCountry) return ["en"];
    return Object.keys(translations[selectedCountry.toLowerCase()]);
  };

  const translate = (key) => {
    if (!selectedCountry) return key;
    const countryTranslations = translations[selectedCountry.toLowerCase()];
    return countryTranslations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate, getAvailableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};