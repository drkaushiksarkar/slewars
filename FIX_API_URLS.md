# API URL Fix - Quick Reference

## Problem
Frontend components are using hardcoded `http://localhost:4000/api/...` URLs which causes CORS errors in production.

## Solution
Use the API utility at `src/utils/api.js` which provides relative URLs (`/api/...`) that work with Nginx proxy.

## Files Already Fixed
- ✅ src/components/DiseaseAnalysis.jsx
- ✅ src/components/LocationAnalysis.jsx

## Files That Need Fixing

### High Priority (Breaking pages):
1. src/components/disease/DiseaseSummaryCard.jsx - Lines 24, 40, 75
2. src/components/disease/FacilityPerformanceTable.jsx - Line 22
3. src/components/location/LocationHeatmap.jsx - Line 47
4. src/components/location/DistrictComparison.jsx - Lines 22, 71
5. src/components/location/FacilityTable.jsx - Line 24
6. src/components/location/ChiefdomDrillDown.jsx - Line 18

### Medium Priority (Other pages):
7. src/components/forecast/ForecastDashboard.jsx - Lines 76, 88
8. src/components/forecast/ForecastHeatmap.jsx - Lines 24, 49
9. src/components/Overview.jsx - Lines 74, 117
10. src/components/Simulation.jsx - Line 309

### Low Priority (May not be used):
11. src/components/disease/SpeciesDistribution.jsx - Line 16
12. src/components/disease/TreatmentTimeline.jsx - Line 16
13. src/hooks/useForecast.js - Line 4
14. src/hooks/useClimateData.js - Line 4

## How to Fix Each File

### Pattern 1: Using fetch()
**Before:**
```javascript
const response = await fetch("http://localhost:4000/api/diseases");
const data = await response.json();
```

**After:**
```javascript
import { apiFetch } from "@/utils/api";

const data = await apiFetch("diseases");
```

### Pattern 2: Using axios.get()
**Before:**
```javascript
const response = await axios.get("http://localhost:4000/api/locations?level=2");
```

**After:**
```javascript
import { getApiUrl } from "@/utils/api";

const response = await axios.get(getApiUrl("locations?level=2"));
```

### Pattern 3: Constant definition
**Before:**
```javascript
const API_BASE = 'http://localhost:4000/api';
```

**After:**
```javascript
import { API_BASE_URL } from "@/utils/api";

const API_BASE = API_BASE_URL;
```

## Quick Fix Script

I'll update the most critical files now. For the rest, you can use find-replace:

**Find:** `http://localhost:4000/api/`
**Replace:** `/api/`

This simple change will fix most issues since axios and fetch work with relative URLs.
