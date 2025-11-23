import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useCountry } from "@/contexts/CountryContext";
import { Globe2 } from "lucide-react";

const Login = ({ onLogin }) => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const {
    setSelectedCountry,
    countryConfig,
    isLoading,
    error,
    refreshCountries
  } = useCountry();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!countryConfig) {
      alert("Unable to load Sierra Leone configuration. Please try again.");
      return;
    }
    setSelectedCountry(countryConfig.id);
    onLogin({ email, password, country: countryConfig.id });
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-card p-8 rounded-lg shadow-lg w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Globe2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">CI-EWS Dashboard</h1>
          <p className="text-muted-foreground">Climate-Informed Multi-Disease Early Warning System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded border border-input bg-background text-foreground"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded border border-input bg-background text-foreground"
              placeholder="Enter your password"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !countryConfig}>
            {isLoading ? "Loading configuration..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Demo credentials:</p>
          <p>Email: admin@example.com</p>
          <p>Password: password</p>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2 flex items-center space-x-2">
            <Globe2 className="h-4 w-4 text-primary" />
            <span>Sierra Leone Deployment</span>
          </h3>
          {error ? (
            <div className="text-sm text-red-500 flex items-center justify-between">
              <span>Unable to load config: {error}</span>
              <button type="button" className="underline" onClick={refreshCountries}>
                Retry
              </button>
            </div>
          ) : (
            countryConfig && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 text-sm"
              >
                <p>{countryConfig.flag} {countryConfig.name}</p>
                <p>Time Zone: {countryConfig.timeZone}</p>
                <p>Languages: {countryConfig.languages.join(", ")}</p>
                <p>Emergency Contact: {countryConfig.emergencyContacts.health}</p>
              </motion.div>
            )
          )}
        </div>

        {countryConfig && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-muted rounded-lg"
          >
            <h3 className="font-medium mb-2">Selected Country Information</h3>
            <div className="space-y-2 text-sm">
              <p>Priority Diseases: {countryConfig.diseases.join(", ")}</p>
              <p>Regions Covered: {countryConfig.regions.join(", ")}</p>
              <p>Health System Levels: {countryConfig.healthSystemLevels.join(" → ")}</p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
