import React from "react";
import { motion } from "framer-motion";
import {
  Activity,
  TrendingUp,
  Cloud,
  MapPin,
  Microscope,
  Layers,
  GraduationCap,
  ArrowRight,
  AlertTriangle,
  Shield,
  Globe,
  ChevronDown,
  LineChart,
  Target,
  Zap,
  Users,
  Clock,
  CheckCircle2,
  Navigation
} from "lucide-react";

const Info = () => {
  const [activeFlow, setActiveFlow] = React.useState(null);

  // Dashboard sections with detailed info
  const dashboardSections = [
    {
      id: "overview",
      title: "Overview",
      icon: Activity,
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      description: "Your command center for real-time disease surveillance",
      details: [
        "8 Key Performance Indicators",
        "Disease breakdown by category",
        "90-day trend analysis",
        "Interactive geographic map"
      ],
      useCase: "Start here to get a quick snapshot of the national health situation",
      flow: 1
    },
    {
      id: "prediction",
      title: "Prediction Risk",
      icon: TrendingUp,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      description: "AI-powered outbreak forecasting and risk prediction",
      details: [
        "Machine learning predictions",
        "Confidence intervals",
        "Anomaly detection",
        "Model performance metrics"
      ],
      useCase: "Use predictive insights to prepare for potential outbreaks",
      flow: 2
    },
    {
      id: "climate",
      title: "Climate Impact",
      icon: Cloud,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      description: "Climate data correlation with disease patterns",
      details: [
        "Temperature trends",
        "Rainfall patterns",
        "Humidity levels",
        "Climate-disease correlation"
      ],
      useCase: "Understand environmental factors driving disease spread",
      flow: 3
    },
    {
      id: "location",
      title: "Location Analysis",
      icon: MapPin,
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      description: "Geographic drill-down and facility-level insights",
      details: [
        "District comparisons",
        "Chiefdom drill-down",
        "Facility-level data",
        "Interactive heatmaps"
      ],
      useCase: "Drill down from national to facility level for targeted interventions",
      flow: 4
    },
    {
      id: "disease",
      title: "Disease Analysis",
      icon: Microscope,
      color: "from-rose-500 to-pink-500",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
      description: "Deep dive into specific disease patterns",
      details: [
        "Disease-specific metrics",
        "Species distribution",
        "Treatment timelines",
        "Facility performance"
      ],
      useCase: "Analyze specific diseases in detail for specialized response",
      flow: 5
    },
    {
      id: "simulation",
      title: "Simulation",
      icon: Layers,
      color: "from-indigo-500 to-blue-500",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
      description: "Model outbreak scenarios and test interventions",
      details: [
        "Outbreak scenarios",
        "Intervention modeling",
        "Real-time metrics",
        "Cost-benefit analysis"
      ],
      useCase: "Test response strategies before implementing them in the field",
      flow: 6
    },
    {
      id: "training",
      title: "Training",
      icon: GraduationCap,
      color: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      description: "Build capacity with educational content",
      details: [
        "EWARS fundamentals",
        "Advanced disease modeling",
        "Interactive lessons",
        "Progress tracking"
      ],
      useCase: "Continuously improve skills and knowledge in disease surveillance",
      flow: 7
    }
  ];

  // User journey flows
  const userJourneys = [
    {
      title: "Daily Monitoring Officer",
      icon: Clock,
      color: "from-blue-500 to-cyan-500",
      steps: [
        { tab: "Overview", action: "Check daily KPIs and trends" },
        { tab: "Location Analysis", action: "Identify hotspots" },
        { tab: "Disease Analysis", action: "Review specific diseases" }
      ]
    },
    {
      title: "Strategic Planner",
      icon: Target,
      color: "from-purple-500 to-pink-500",
      steps: [
        { tab: "Overview", action: "Understand current situation" },
        { tab: "Prediction Risk", action: "Review forecasts" },
        { tab: "Simulation", action: "Model interventions" }
      ]
    },
    {
      title: "Field Response Officer",
      icon: Zap,
      color: "from-orange-500 to-red-500",
      steps: [
        { tab: "Location Analysis", action: "Find affected facilities" },
        { tab: "Disease Analysis", action: "Get disease details" },
        { tab: "Climate Impact", action: "Check environmental factors" }
      ]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 md:p-12 text-white"
      >
        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4"
          >
            <Shield className="h-5 w-5" />
            <span className="font-semibold">SLEWARS</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            Sierra Leone Early Warning,
            <br />
            Alert, and Response System
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-xl text-white/90 max-w-3xl mb-6"
          >
            A comprehensive DHIS2-integrated health surveillance platform empowering
            health officers with real-time data, AI-powered predictions, and actionable
            insights to protect Sierra Leone from disease outbreaks.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <Globe className="h-5 w-5" />
              <span>7 Districts</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <Activity className="h-5 w-5" />
              <span>20+ Diseases Tracked</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <Users className="h-5 w-5" />
              <span>Real-time DHIS2 Integration</span>
            </div>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </motion.div>

      {/* Data Storytelling Section */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h2 className="text-3xl font-bold mb-2 flex items-center">
            <Navigation className="h-8 w-8 mr-3 text-blue-500" />
            Your Journey Through the Dashboard
          </h2>
          <p className="text-muted-foreground text-lg">
            Follow these pathways to make data-driven decisions for disease surveillance and response
          </p>
        </motion.div>

        {/* User Journey Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {userJourneys.map((journey, idx) => {
            const Icon = journey.icon;
            return (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -5 }}
                className="bg-card border rounded-xl p-6 shadow-lg hover:shadow-xl transition-all"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br ${journey.color} mb-4`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">{journey.title}</h3>
                <div className="space-y-3">
                  {journey.steps.map((step, stepIdx) => (
                    <div key={stepIdx} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {stepIdx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{step.tab}</div>
                        <div className="text-xs text-muted-foreground">{step.action}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Dashboard Sections Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h2 className="text-3xl font-bold mb-2 flex items-center">
            <Layers className="h-8 w-8 mr-3 text-purple-500" />
            Explore the Dashboard
          </h2>
          <p className="text-muted-foreground text-lg">
            Each section is designed to provide specific insights for comprehensive disease surveillance
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardSections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                variants={itemVariants}
                whileHover={{ scale: 1.03, y: -8 }}
                onHoverStart={() => setActiveFlow(section.flow)}
                onHoverEnd={() => setActiveFlow(null)}
                className={`relative bg-card border-2 ${section.borderColor} rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden`}
              >
                {/* Flow number indicator */}
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                  {section.flow}
                </div>

                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-5`} />

                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} mb-4 shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>

                  <h3 className="text-xl font-bold mb-2">{section.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {section.description}
                  </p>

                  {/* Features list */}
                  <div className="space-y-2 mb-4">
                    {section.details.map((detail, detailIdx) => (
                      <div key={detailIdx} className="flex items-center space-x-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>

                  {/* Use case */}
                  <div className={`${section.bgColor} rounded-lg p-3 mt-4`}>
                    <div className="flex items-start space-x-2">
                      <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                      <p className="text-sm font-medium">{section.useCase}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Visual Flow Diagram */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <h2 className="text-3xl font-bold mb-2 flex items-center">
            <LineChart className="h-8 w-8 mr-3 text-green-500" />
            Recommended Workflow
          </h2>
          <p className="text-muted-foreground text-lg">
            Follow this optimal path for comprehensive disease surveillance and response
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-xl p-8 overflow-x-auto"
        >
          <div className="flex items-center justify-between min-w-max space-x-4">
            {dashboardSections.map((section, idx) => {
              const Icon = section.icon;
              const isActive = activeFlow === section.flow;

              return (
                <React.Fragment key={section.id}>
                  <motion.div
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      opacity: activeFlow === null || isActive ? 1 : 0.4
                    }}
                    className="flex flex-col items-center"
                  >
                    <div
                      className={`w-16 h-16 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg mb-2`}
                    >
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-sm">{section.title}</div>
                      <div className="text-xs text-muted-foreground">Step {section.flow}</div>
                    </div>
                  </motion.div>

                  {idx < dashboardSections.length - 1 && (
                    <motion.div
                      animate={{
                        opacity: activeFlow === null || isActive || activeFlow === section.flow + 1 ? 1 : 0.3
                      }}
                      className="flex-shrink-0"
                    >
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </motion.div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </motion.div>
      </motion.div>

      {/* Key Features Highlights */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {[
          {
            icon: Activity,
            title: "Real-time Data",
            description: "Live DHIS2 integration",
            color: "from-blue-500 to-cyan-500"
          },
          {
            icon: TrendingUp,
            title: "AI Predictions",
            description: "ML-powered forecasts",
            color: "from-purple-500 to-pink-500"
          },
          {
            icon: MapPin,
            title: "Multi-level Analysis",
            description: "National to facility",
            color: "from-orange-500 to-red-500"
          },
          {
            icon: AlertTriangle,
            title: "Early Warning",
            description: "Anomaly detection",
            color: "from-green-500 to-emerald-500"
          }
        ].map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              className="bg-card border rounded-xl p-6 text-center shadow-lg hover:shadow-xl transition-all"
            >
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} mb-4 shadow-lg`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center"
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          Ready to Start Your Surveillance Journey?
        </h2>
        <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
          Navigate to the Overview tab to begin monitoring disease patterns, or explore any section
          based on your specific needs. The dashboard is designed to adapt to your workflow.
        </p>
        <div className="flex items-center justify-center space-x-2 text-sm">
          <ChevronDown className="h-5 w-5 animate-bounce" />
          <span>Use the tabs above to navigate</span>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </motion.div>
    </div>
  );
};

export default Info;
