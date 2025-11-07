import React from "react";
import { motion } from "framer-motion";
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  BarChart2,
  AlertCircle,
  Info,
  Brain,
  MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Response = () => {
  const [activeTab, setActiveTab] = React.useState("risk");
  const [showAIExplanation, setShowAIExplanation] = React.useState(false);

  // Previous Overview component content moved here
  // ... (rest of the previous Overview component code)

  return (
    <div className="space-y-6">
      {/* Previous Overview component JSX moved here */}
      {/* ... (rest of the previous Overview component JSX) */}
    </div>
  );
};

export default Response;