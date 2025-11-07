export interface ThresholdRange {
  high: number;
  medium: number;
  low: number;
}

export type DiseaseThresholds = Record<string, ThresholdRange>;

export interface CountryConfig {
  id: string;
  name: string;
  flag: string;
  languages: string[];
  timeZone: string;
  currency: string;
  diseases: string[];
  regions: string[];
  climateFactors: string[];
  healthSystemLevels: string[];
  emergencyContacts: Record<string, string>;
  thresholds: DiseaseThresholds;
  map: {
    center: [number, number];
    zoom: number;
  };
  dhis2?: {
    orgUnit: string;
    dataElements: string[];
    program?: string;
  };
}

export type CountryConfigMap = Record<string, CountryConfig>;
