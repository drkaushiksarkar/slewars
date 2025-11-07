import React from "react";
import { useCountry } from "@/contexts/CountryContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Phone, Clock, Globe } from "lucide-react";

const CountryHeader = () => {
  const { countryConfig } = useCountry();
  const { language, setLanguage, getAvailableLanguages } = useLanguage();
  const [currentTime, setCurrentTime] = React.useState("");

  React.useEffect(() => {
    if (!countryConfig) return;
    const updateTime = () => {
      const time = new Date().toLocaleTimeString("en-US", {
        timeZone: countryConfig.timeZone,
        hour: "2-digit",
        minute: "2-digit"
      });
      setCurrentTime(time);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [countryConfig?.timeZone]);

  const languageNames = {
    en: "English",
    bn: "বাংলা",
    fr: "Français"
  };

  if (!countryConfig) {
    return null;
  }

  return (
    <div className="bg-muted/50 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-2xl">{countryConfig.flag}</span>
          <div>
            <h2 className="font-semibold">{countryConfig.name} EWARS</h2>
            <p className="text-sm text-muted-foreground">
              Health System Levels: {countryConfig.healthSystemLevels.join(" → ")}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-4">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm"
            >
              {getAvailableLanguages().map((lang) => (
                <option key={lang} value={lang}>
                  {languageNames[lang]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{currentTime}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Emergency: {countryConfig.emergencyContacts.health}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountryHeader;
