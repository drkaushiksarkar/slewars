import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Bug,
  Droplets,
  Wind,
  Microscope,
  Syringe,
  Stethoscope,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_ICONS = {
  "Vector-Borne": Bug,
  "Water-Borne & Diarrheal": Droplets,
  "Air-Borne & Respiratory": Wind,
  "Neglected Tropical Diseases": Microscope,
  "Vaccine-Preventable": Syringe,
  "Other Infections & NCDs": Stethoscope,
  "Viral Hemorrhagic": AlertTriangle,
};

const CATEGORY_COLORS = {
  "Vector-Borne": "text-amber-600",
  "Water-Borne & Diarrheal": "text-blue-600",
  "Air-Borne & Respiratory": "text-sky-600",
  "Neglected Tropical Diseases": "text-purple-600",
  "Vaccine-Preventable": "text-green-600",
  "Other Infections & NCDs": "text-slate-600",
  "Viral Hemorrhagic": "text-red-600",
};

const DiseaseBreakdown = ({ locationUid = "all", timeRange = "30d" }) => {
  const [diseaseData, setDiseaseData] = useState({});
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Convert timeRange to days
  const getDaysFromTimeRange = (range) => {
    const match = range.match(/(\d+)d/);
    return match ? parseInt(match[1]) : 30;
  };

  useEffect(() => {
    const fetchDiseaseData = async () => {
      try {
        setLoading(true);
        setError(null);

        const days = getDaysFromTimeRange(timeRange);

        // Fetch diseases grouped by category
        const categoriesResponse = await fetch("/api/diseases/categories");
        const categoriesData = await categoriesResponse.json();

        // Fetch breakdown data for all diseases
        const params = new URLSearchParams();
        if (locationUid && locationUid !== "all") {
          params.append("locationUid", locationUid);
        }
        params.append("days", days.toString());

        const breakdownResponse = await fetch(`/api/diseases/breakdown/all?${params}`);
        const breakdownData = await breakdownResponse.json();

        // Create a map of disease UID to breakdown data
        const breakdownMap = {};
        if (breakdownData.success && breakdownData.data) {
          breakdownData.data.forEach((item) => {
            // Normalize disease names for matching (remove " new", trim, lowercase)
            const normalizedName = item.disease
              .toLowerCase()
              .replace(/ new$/, "")
              .trim();
            breakdownMap[normalizedName] = item;
          });
        }

        // Initialize organized data with all 7 categories to ensure they're always shown
        const organized = {};

        // First, initialize all categories with empty data
        Object.keys(CATEGORY_ICONS).forEach((category) => {
          organized[category] = {
            diseaseGroups: [],
            totalCases: 0,
            totalFacilities: 0,
          };
        });

        // Now populate with actual data
        if (categoriesData.success && categoriesData.data) {
          Object.entries(categoriesData.data).forEach(([category, diseases]) => {
            // First, map diseases with breakdown data
            const mappedDiseases = diseases.map((disease) => {
              // Normalize the disease name from categories for matching
              const normalizedName = disease.name.toLowerCase().trim();
              const breakdown = breakdownMap[normalizedName];

              return {
                ...disease,
                totalCases: breakdown?.totalCases || 0,
                facilitiesAffected: breakdown?.facilitiesAffected || 0,
                avgCasesPerPeriod: breakdown?.avgCasesPerPeriod || 0,
                peakCases: breakdown?.peakCases || 0,
              };
            });

            // Group diseases by their group property
            const diseaseGroups = {};
            mappedDiseases.forEach((disease) => {
              const groupName = disease.group || disease.name;
              if (!diseaseGroups[groupName]) {
                diseaseGroups[groupName] = {
                  name: groupName,
                  variants: [],
                  totalCases: 0,
                  maxFacilities: 0,
                };
              }
              diseaseGroups[groupName].variants.push(disease);
              diseaseGroups[groupName].totalCases += disease.totalCases;
              // Take the maximum facilities among variants (since variants of the same disease
              // likely affect overlapping facilities)
              diseaseGroups[groupName].maxFacilities = Math.max(
                diseaseGroups[groupName].maxFacilities,
                disease.facilitiesAffected || 0
              );
            });

            // Convert to array and sort variants within each group
            const diseaseGroupsArray = Object.values(diseaseGroups).map((group) => ({
              ...group,
              facilitiesAffected: group.maxFacilities,
              variants: group.variants.sort((a, b) => b.totalCases - a.totalCases),
              hasVariants: group.variants.length > 1,
            }));

            // Sort disease groups by total cases (descending)
            diseaseGroupsArray.sort((a, b) => b.totalCases - a.totalCases);

            // Update the category with data
            organized[category] = {
              diseaseGroups: diseaseGroupsArray,
              totalCases: diseaseGroupsArray.reduce((sum, g) => sum + g.totalCases, 0),
              totalFacilities: diseaseGroupsArray.reduce((sum, g) => sum + g.facilitiesAffected, 0),
            };
          });
        }

        // Sort categories by total cases (prevalence) - descending
        // But ensure all 7 categories remain in the output, even if they have 0 cases
        const sortedOrganized = Object.entries(organized)
          .sort(([, a], [, b]) => b.totalCases - a.totalCases)
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {});

        setDiseaseData(sortedOrganized);
      } catch (err) {
        console.error("Error fetching Disease Breakdown:", err);
        setError("Failed to load Disease Breakdown data");
      } finally {
        setLoading(false);
      }
    };

    fetchDiseaseData();
  }, [locationUid, timeRange]);

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleGroup = (groupKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Disease Breakdown</h3>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Disease Breakdown</h3>
        <div className="text-center text-red-500 py-8">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Disease Breakdown by Category</h3>
      <div className="space-y-2">
        {Object.entries(diseaseData).map(([category, data]) => (
          <div key={category} className="border rounded-lg overflow-hidden">
            {/* Category Header (Level 1) */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedCategories.has(category) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                {React.createElement(CATEGORY_ICONS[category] || Stethoscope, {
                  className: `h-5 w-5 ${CATEGORY_COLORS[category] || "text-gray-600"}`,
                })}
                <div className="text-left">
                  <div className="font-medium">{category}</div>
                  <div className="text-sm text-muted-foreground">
                    {data.diseaseGroups.length} disease groups
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{data.totalCases.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Cases</div>
              </div>
            </button>

            {/* Expandable Disease Groups (Level 2) */}
            <AnimatePresence>
              {expandedCategories.has(category) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t bg-muted/20"
                >
                  {data.diseaseGroups.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No cases reported for this category in the selected time range and location
                    </div>
                  ) : (
                    <div className="divide-y">
                      {data.diseaseGroups.map((group) => {
                      const groupKey = `${category}-${group.name}`;
                      const isGroupExpanded = expandedGroups.has(groupKey);

                      return (
                        <div key={groupKey}>
                          {/* Disease Group Header */}
                          <button
                            onClick={() => group.hasVariants && toggleGroup(groupKey)}
                            className={`w-full px-4 py-3 pl-12 flex items-center justify-between transition-colors ${
                              group.hasVariants ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {group.hasVariants ? (
                                isGroupExpanded ? (
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                )
                              ) : (
                                <div className="w-3" />
                              )}
                              <div className="text-left flex-1">
                                <div className="font-medium text-sm">{group.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {group.facilitiesAffected} facilities affected
                                  {group.hasVariants && (
                                    <span className="ml-2">
                                      • {group.variants.length} variants
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {group.totalCases.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">cases</div>
                            </div>
                          </button>

                          {/* Expandable Disease Variants (Level 3) */}
                          {group.hasVariants && (
                            <AnimatePresence>
                              {isGroupExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="bg-muted/30"
                                >
                                  <div className="divide-y">
                                    {group.variants.map((variant) => (
                                      <div
                                        key={variant.uid}
                                        className="px-4 py-2 pl-20 hover:bg-muted/40 transition-colors"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="text-sm">{variant.name}</div>
                                            <div className="text-xs text-muted-foreground mt-1">
                                              {variant.facilitiesAffected} facilities
                                              {variant.peakCases > 0 && (
                                                <span className="ml-2">
                                                  • Peak: {variant.peakCases.toLocaleString()}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-sm font-medium">
                                              {variant.totalCases.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-muted-foreground">cases</div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Show message only if no data at all, but categories will still be visible with 0 cases */}
    </div>
  );
};

export default DiseaseBreakdown;
