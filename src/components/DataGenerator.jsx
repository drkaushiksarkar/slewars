import React from "react";
import { motion } from "framer-motion";
import { 
  Database, 
  Download, 
  RefreshCw,
  Check,
  AlertCircle,
  Copy,
  FileJson,
  Table
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const DataGenerator = () => {
  const { toast } = useToast();
  const [generating, setGenerating] = React.useState(false);
  const [dataType, setDataType] = React.useState("disease");
  const [timeRange, setTimeRange] = React.useState("7");
  const [format, setFormat] = React.useState("json");
  const [showPreview, setShowPreview] = React.useState(false);

  const dataTypes = [
    { id: "disease", name: "Disease Data" },
    { id: "climate", name: "Climate Data" },
    { id: "social", name: "Social Data" },
    { id: "intervention", name: "Intervention Data" }
  ];

  const timeRanges = [
    { id: "7", name: "7 Days" },
    { id: "30", name: "30 Days" },
    { id: "90", name: "90 Days" },
    { id: "365", name: "1 Year" }
  ];

  const formats = [
    { id: "json", name: "JSON", icon: FileJson },
    { id: "csv", name: "CSV", icon: Table }
  ];

  const generateMockData = () => {
    setGenerating(true);
    
    // Simulate API call
    setTimeout(() => {
      setGenerating(false);
      toast({
        title: "Data Generated Successfully",
        description: "Your mock data is ready for download",
      });
    }, 2000);
  };

  const copyToClipboard = () => {
    // Mock data copying
    toast({
      title: "Data Copied",
      description: "Mock data has been copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Data Generator</h2>
          <p className="text-muted-foreground">Generate mock data for testing and development</p>
        </div>
        <Button
          onClick={generateMockData}
          disabled={generating}
          className="flex items-center space-x-2"
        >
          {generating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Database className="h-4 w-4" />
              <span>Generate Data</span>
            </>
          )}
        </Button>
      </div>

      {/* Configuration Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Data Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Data Type</label>
          <div className="bg-card border rounded-lg p-4 space-y-2">
            {dataTypes.map((type) => (
              <label
                key={type.id}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="dataType"                 value={type.id}
                  checked={dataType === type.id}
                  onChange={(e) => setDataType(e.target.value)}
                  className="rounded-full"
                />
                <span>{type.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Time Range Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Time Range</label>
          <div className="bg-card border rounded-lg p-4 space-y-2">
            {timeRanges.map((range) => (
              <label
                key={range.id}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="timeRange"
                  value={range.id}
                  checked={timeRange === range.id}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="rounded-full"
                />
                <span>{range.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Output Format</label>
          <div className="bg-card border rounded-lg p-4 space-y-2">
            {formats.map((f) => {
              const Icon = f.icon;
              return (
                <label
                  key={f.id}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="format"
                    value={f.id}
                    checked={format === f.id}
                    onChange={(e) => setFormat(e.target.value)}
                    className="rounded-full"
                  />
                  <Icon className="h-4 w-4" />
                  <span>{f.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Data Schema Preview */}
      <div className="bg-card border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Data Schema</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
        </div>

        {showPreview && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <pre className="text-sm">
                  {JSON.stringify({
                    id: "string",
                    timestamp: "date",
                    location: {
                      latitude: "number",
                      longitude: "number",
                      region: "string"
                    },
                    metrics: {
                      cases: "number",
                      risk_level: "string",
                      confidence: "number"
                    },
                    metadata: {
                      source: "string",
                      version: "string"
                    }
                  }, null, 2)}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="ml-4"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Generated Data Actions */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Generated Datasets</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((dataset) => (
            <motion.div
              key={dataset}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center justify-between p-4 bg-background rounded-lg border"
            >
              <div>
                <h4 className="font-medium">Dataset #{dataset}</h4>
                <p className="text-sm text-muted-foreground">
                  Generated on {new Date().toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Data Quality Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Check className="h-4 w-4 text-green-500" />
            <h4 className="font-medium">Data Completeness</h4>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-green-500 w-[95%]" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">95% complete</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <h4 className="font-medium">Data Quality</h4>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-yellow-500 w-[85%]" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">85% quality score</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Database className="h-4 w-4 text-blue-500" />
            <h4 className="font-medium">Data Volume</h4>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-blue-500 w-[75%]" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">75MB generated</p>
        </div>
      </div>
    </div>
  );
};

export default DataGenerator;