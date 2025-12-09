import React from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Play,
  Award,
  CheckCircle,
  Clock,
  Star,
  Users,
  Video,
  FileText,
  MessageSquare,
  Sparkles,
  Info as InfoIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Training = () => {
  const [selectedCourse, setSelectedCourse] = React.useState(null);
  const [showCertificate, setShowCertificate] = React.useState(false);

  const courses = [
    {
      id: 1,
      title: "EWARS Fundamentals",
      description: "Learn the basics of early warning and response systems",
      duration: "2 hours",
      modules: 5,
      completed: 3,
      topics: [
        "Introduction to EWARS",
        "Disease Surveillance Basics",
        "Data Collection Methods",
        "Risk Assessment",
        "Response Protocols"
      ]
    },
    {
      id: 2,
      title: "Advanced Disease Modeling",
      description: "Master statistical and AI-based disease prediction models",
      duration: "4 hours",
      modules: 8,
      completed: 0,
      topics: [
        "Statistical Modeling Basics",
        "Machine Learning in Epidemiology",
        "Spatial Analysis",
        "Time Series Forecasting",
        "Model Validation"
      ]
    },
    {
      id: 3,
      title: "Climate-Health Integration",
      description: "Understanding climate impacts on disease patterns",
      duration: "3 hours",
      modules: 6,
      completed: 0,
      topics: [
        "Climate-Disease Relationships",
        "Weather Data Analysis",
        "Environmental Factors",
        "Climate Change Impacts",
        "Adaptation Strategies"
      ]
    }
  ];

  const interactiveModules = [
    {
      id: 1,
      title: "Disease Outbreak Simulation",
      type: "Interactive",
      duration: "30 mins",
      icon: Play
    },
    {
      id: 2,
      title: "Case Study Analysis",
      type: "Document",
      duration: "45 mins",
      icon: FileText
    },
    {
      id: 3,
      title: "Expert Webinar",
      type: "Video",
      duration: "1 hour",
      icon: Video
    },
    {
      id: 4,
      title: "Community Discussion",
      type: "Forum",
      duration: "Ongoing",
      icon: MessageSquare
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h2 className="text-2xl font-bold">Training & Capacity Building</h2>
            <span className="inline-flex items-center space-x-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              <Sparkles className="h-3 w-3" />
              <span>BETA</span>
            </span>
          </div>
          <p className="text-muted-foreground">Enhance your EWARS expertise</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium">Your Progress</p>
            <p className="text-2xl font-bold text-primary">60%</p>
          </div>
          <Button
            variant="outline"
            className="flex items-center space-x-2"
            onClick={() => setShowCertificate(true)}
          >
            <Award className="h-4 w-4" />
            <span>Certificates</span>
          </Button>
        </div>
      </div>

      {/* IMACS Foundation Model Notice */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4"
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <InfoIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1 flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>Coming Soon: IMACS Foundation Model</span>
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This training module is currently in beta. Content will be updated with the upcoming{" "}
              <span className="font-semibold">IMACS (Institute of Health Modelling and Climate Solutions) Foundation Model</span>,
              featuring advanced AI-powered learning experiences, personalized training paths, and real-time case simulations.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map((course) => (
          <motion.div
            key={course.id}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-card border rounded-lg p-6 cursor-pointer"
            onClick={() => setSelectedCourse(course)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <h3 className="font-semibold">{course.title}</h3>
                <p className="text-sm text-muted-foreground">{course.description}</p>
              </div>
              <div className="flex items-center space-x-1 text-primary">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4" fill="currentColor" />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span>{course.modules} modules</span>
                </div>
              </div>

              <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-primary"
                  style={{ width: `${(course.completed / course.modules) * 100}%` }}
                />
              </div>

              <p className="text-sm text-muted-foreground">
                {course.completed} of {course.modules} modules completed
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Interactive Learning Modules */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Interactive Learning</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {interactiveModules.map((module) => {
            const Icon = module.icon;
            return (
              <motion.div
                key={module.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-background p-4 rounded-lg border"
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium bg-secondary px-2 py-1 rounded-full">
                    {module.type}
                  </span>
                </div>
                <h4 className="font-medium mb-2">{module.title}</h4>
                <p className="text-sm text-muted-foreground">{module.duration}</p>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  Start
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Course Details Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold">{selectedCourse.title}</h3>
                <p className="text-muted-foreground">{selectedCourse.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCourse(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{selectedCourse.duration}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>1,234 enrolled</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Course Content</h4>
                {selectedCourse.topics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-2 bg-muted rounded"
                  >
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span>{topic}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedCourse(null)}>
                  Close
                </Button>
                <Button>Start Learning</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background p-6 rounded-lg shadow-lg max-w-2xl w-full mx-4"
          >
            <div className="text-center mb-6">
              <Award className="h-12 w-12 text-primary mx-auto mb-2" />
              <h3 className="text-xl font-semibold">Your Achievements</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">EWARS Fundamentals</h4>
                    <p className="text-sm text-muted-foreground">Completed on Sept 15, 2023</p>
                  </div>
                  <Button variant="outline" size="sm">Download</Button>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setShowCertificate(false)}>
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Training;