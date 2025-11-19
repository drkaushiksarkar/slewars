# Disease Quick Reference - Implementation Cheat Sheet

> **✏️ SIMPLIFIED VERSION:** Using single Malaria entry (IDSR) for better UX

## All 36 Diseases by Category

### 🦟 Vector-Borne (4 diseases, 75K cases)
```typescript
malaria: "vq2qO3eTrNi"                   // 25K cases - IDSR SURVEILLANCE
yellowFeverIDSR: "noIzB569hTM"           // 25K cases - IDSR SURVEILLANCE
yellowFever: "XWU1Huh0Luy"               // 966 cases
plague: "HS9zqaBdOQ4"                    // 25K cases - IDSR SURVEILLANCE
```

**Note:** Malaria treatment variants (6 UIDs with 2.8M cases) available in database but excluded from dashboard.

### 💧 Water-Borne & Diarrheal (5 diseases, 498K cases)
```typescript
diarrhoeaNoDehydration: "U3jd8zVFKxY"    // 333K cases
diarrhoeaDysentery: "nymNRxmnj4z"        // 60K cases
diarrhoeaSevere: "UfZcabJUVcZ"           // 46K cases
typhoid: "Cj5rTc9nEvl"                   // 35K cases
cholera: "UsSUX0cpKsH"                   // 25K cases - SURVEILLANCE
```

### 🫁 Air-Borne & Respiratory (6 diseases, 1.3M cases)
```typescript
ariPneumonia: "iKGjnOOaPlE"              // 1.0M cases - HIGH PRIORITY
ariCough: "Cm4XUw6VAxv"                  // 329K cases
measlesIDSR: "YazgqXbizv1"               // 25K cases - SURVEILLANCE
measles: "GCvqIM3IzN0"                   // 13K cases
tuberculosis: "z9dYcQ2DlBG"              // 9K cases
meningitis: "JFFUt8yR2iW"                // 2K cases
```

### 🪱 Neglected Tropical Diseases (5 diseases, 207K cases)
```typescript
wormInfestation: "Usk9Asj5DED"           // 189K cases
schistosomiasis: "Y7Oq71I3ASg"           // 13K cases
onchocerciasis: "DrEOxW8mbbh"            // 2K cases
yaws: "FF3Ev33BuCh"                      // 1K cases
leprosy: "zAW6b5Owalk"                   // 786 cases
```

### 💉 Vaccine-Preventable (4 diseases, 39K cases)
```typescript
// Note: Measles also counts here (38K total)
tetanus: "Uoj2wmnr5Dw"                   // 1K cases
neonatalTetanus: "wcwbN1jR0ar"           // 170 cases
afp: "FQ2o8UBlcrS"                       // 114 cases
```

### 🩺 Other Infections & NCDs (11 diseases, 1.4M cases)
```typescript
allOther: "A2VfEfPflHV"                  // 552K cases
skinInfection: "Y4cFzB4A9ZQ"             // 195K cases
malnutrition: "TBbCcJfZ91x"              // 143K cases
stiDischarge: "CN9Oxawn7bD"              // 140K cases
anaemia: "HLPuaFB7Frw"                   // 107K cases
wounds: "FJs8ZjlQE6f"                    // 93K cases
eyeInfection: "BQI18TPLR7W"              // 73K cases
hypertension: "UXW5hWW8dE1"              // 37K cases
otitisMedia: "DWLCM68Q7Zl"               // 24K cases
stiUlcer: "IeO1sWXVyp6"                  // 23K cases
burns: "zMGEd921xd3"                     // 16K cases
```

### 🩸 Viral Hemorrhagic (1 disease)
```typescript
lassaFever: "NCteyX2xpMf"                // 222 cases
```

---

## Deaths UIDs (< 5 years)
```typescript
malariaDeaths: "r6nrJANOqMw"
measlesDeaths: "f7n9E0hX8qk"
choleraDeaths: "eY5ehpbEsB7"
typhoidDeaths: "Yy9NtNfwYZJ"
yellowFeverDeaths: "USBq0VHSkZq"
dysenteryDeaths: "Ix2HsbDMLea"
meningitisDeaths: "MSZuQ1mTsia"
plagueDeaths: "lXolhoWewYH"
tetanusDeaths: "hM4ya5T2AqX"
neonatalTetanusDeaths: "Vp12ncSU1Av"
afpDeaths: "FTRrcoaog83"
```

---

## Testing Priority Order

### Week 1: IDSR Surveillance Diseases (5 diseases)
```bash
# IDSR Surveillance diseases for outbreak detection
vq2qO3eTrNi  # Malaria (25K cases)
YazgqXbizv1  # Measles (25K cases)
UsSUX0cpKsH  # Cholera (25K cases)
noIzB569hTM  # Yellow Fever (25K cases)
HS9zqaBdOQ4  # Plague (25K cases)
```

### Week 2: High Burden (10 diseases)
```bash
iKGjnOOaPlE  # ARI Pneumonia (1M cases) - HIGHEST VOLUME
U3jd8zVFKxY  # Diarrhoea - no dehydration (333K cases)
Cm4XUw6VAxv  # ARI Cough (329K cases)
Y4cFzB4A9ZQ  # Skin Infection (195K cases)
Usk9Asj5DED  # Worm Infestation (189K cases)
TBbCcJfZ91x  # Clinical Malnutrition (143K cases)
CN9Oxawn7bD  # STI - Genital Discharge (140K cases)
HLPuaFB7Frw  # Anaemia (107K cases)
FJs8ZjlQE6f  # Wounds/Trauma (93K cases)
BQI18TPLR7W  # Eye Infection (73K cases)
```

### Week 3: Remaining diseases (21 diseases)
All others with lower case counts (NTDs, rare diseases, etc.)

---

## Common API Queries

### Get All Diseases
```bash
curl http://localhost:4000/api/diseases
```

### Get Disease Groups (6 categories)
```bash
curl "http://localhost:4000/api/analytics/disease-groups?timeRange=30d"
```

### Get Threshold Data
```bash
# Malaria IDSR
curl "http://localhost:4000/api/analytics/threshold/vq2qO3eTrNi?timeRange=30d&thresholdType=percentile95"

# ARI Pneumonia
curl "http://localhost:4000/api/analytics/threshold/iKGjnOOaPlE?timeRange=30d&thresholdType=meanPlus2SD"
```

### Get National Risk
```bash
curl "http://localhost:4000/api/analytics/national-risk?diseaseUid=vq2qO3eTrNi&timeRange=30d"
```

### Get Geographic Data
```bash
# Districts (ADM2)
curl "http://localhost:4000/api/analytics/geographic/vq2qO3eTrNi?level=ADM2&timeRange=30d"

# Facilities (ADM4) - Bubble map
curl "http://localhost:4000/api/analytics/geographic/AFM5H0wNq3t?level=ADM4&timeRange=30d"
```

---

## Database Queries

### Get Total Cases by Disease
```sql
SELECT
  de.uid,
  de.name,
  SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as total_cases,
  COUNT(DISTINCT dv.sourceid) as facilities
FROM dataelement de
LEFT JOIN datavalue dv ON de.dataelementid = dv.dataelementid AND dv.deleted = false
WHERE de.uid IN ('vq2qO3eTrNi', 'AFM5H0wNq3t', 'iKGjnOOaPlE')
GROUP BY de.uid, de.name
ORDER BY total_cases DESC;
```

### Get District-Level Cases
```sql
SELECT
  ou.name as district,
  SUM(CASE WHEN dv.value ~ '^[0-9]+$' THEN CAST(dv.value AS INTEGER) ELSE 0 END) as cases
FROM datavalue dv
JOIN dataelement de ON dv.dataelementid = de.dataelementid
JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
WHERE de.uid = 'vq2qO3eTrNi'
  AND ou.hierarchylevel = 2
  AND dv.deleted = false
GROUP BY ou.name
ORDER BY cases DESC;
```

### Check Data Availability
```sql
-- Check which diseases have recent data
SELECT
  de.uid,
  de.name,
  MAX(p.enddate) as latest_data,
  COUNT(DISTINCT dv.periodid) as periods,
  COUNT(DISTINCT dv.sourceid) as facilities
FROM dataelement de
LEFT JOIN datavalue dv ON de.dataelementid = dv.dataelementid AND dv.deleted = false
LEFT JOIN period p ON dv.periodid = p.periodid
WHERE de.uid IN ('vq2qO3eTrNi', 'AFM5H0wNq3t', 'iKGjnOOaPlE', 'U3jd8zVFKxY')
GROUP BY de.uid, de.name
ORDER BY latest_data DESC;
```

---

## Color Palette Reference

### RdYlGn Muted/Pastel Colors
```css
Low cases (< 33%):  #a8e6a1  /* Pastel Green */
Medium cases (33-67%): #fff59d  /* Pastel Yellow */
High cases (> 67%):  #ffab91  /* Pastel Red */
```

### Risk Level Colors
```css
Low risk:     bg: #e8f5e9, border: #4caf50  /* Green */
Medium risk:  bg: #fff9c4, border: #fbc02d  /* Yellow */
High risk:    bg: #ffebee, border: #f44336  /* Red */
```

---

## Disease Category Dropdown Structure

```javascript
const diseaseCategories = {
  "Vector-borne": {
    icon: "🦟",
    diseases: ["Malaria (All)", "Yellow Fever", "Plague"],
    subcategories: {
      "Malaria": [
        "PHU with ACT < 24hrs",
        "PHU with ACT > 24hrs",
        "Community with ACT < 24hrs",
        "Community with ACT > 24hrs",
        "PHU without ACT < 24hrs",
        "PHU without ACT > 24hrs",
        "IDSR Surveillance"
      ]
    }
  },
  "Water-borne & Diarrheal": {
    icon: "💧",
    diseases: ["Cholera", "Typhoid", "Dysentery", "Diarrhoea (All)"]
  },
  "Air-borne & Respiratory": {
    icon: "🫁",
    diseases: ["ARI/Pneumonia", "Measles", "Tuberculosis", "Meningitis"]
  },
  "Neglected Tropical Diseases": {
    icon: "🪱",
    diseases: ["Worm Infestation", "Schistosomiasis", "Onchocerciasis", "Leprosy", "Yaws"]
  },
  "Vaccine-Preventable": {
    icon: "💉",
    diseases: ["Measles", "Tetanus", "Neonatal Tetanus", "AFP"]
  },
  "Other Infections & NCDs": {
    icon: "🩺",
    diseases: ["STIs", "Skin Infections", "Eye/ENT", "NCDs", "Injuries"]
  }
};
```

---

## Performance Benchmarks

| Operation | Target | Critical |
|-----------|--------|----------|
| Single disease query | < 500ms | < 1s |
| Disease groups (6 categories) | < 1s | < 2s |
| All diseases list | < 200ms | < 500ms |
| Geographic heatmap (ADM2) | < 1s | < 2s |
| Geographic heatmap (ADM4, 1,166 facilities) | < 2s | < 5s |
| Threshold calculation | < 800ms | < 2s |
| National risk calculation | < 1s | < 3s |

---

## Error Messages

```typescript
const ERROR_MESSAGES = {
  DISEASE_NOT_FOUND: "Disease UID not found in database",
  INVALID_TIME_RANGE: "Time range must be between 7 and 365 days",
  INVALID_ADMIN_LEVEL: "Admin level must be ADM2, ADM3, or ADM4",
  INVALID_THRESHOLD_TYPE: "Threshold type must be percentile95, meanPlus2SD, or endemicChannel",
  NO_DATA_AVAILABLE: "No data available for the specified parameters",
  DATABASE_ERROR: "Database query failed. Please try again.",
  INVALID_DISEASE_UID: "Disease UID format is invalid"
};
```

---

## Common Issues & Solutions

### Issue: Slow geographic queries at facility level
**Solution:** Add database indexes
```sql
CREATE INDEX idx_datavalue_source ON datavalue(sourceid) WHERE deleted = false;
CREATE INDEX idx_org_hierarchy ON organisationunit(hierarchylevel);
```

### Issue: Too many diseases in dropdown
**Solution:** Group by category with accordion/collapse
```jsx
<Accordion>
  <AccordionItem value="vector-borne">
    <AccordionTrigger>🦟 Vector-borne (10 diseases)</AccordionTrigger>
    <AccordionContent>
      {/* List individual diseases */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

### Issue: Threshold calculations timeout
**Solution:** Pre-calculate and cache thresholds
```typescript
// Cache thresholds for 1 hour
const thresholdCache = new Map();
const CACHE_TTL = 3600000; // 1 hour
```

---

**Quick Reference v2.1 - Simplified**
**Last Updated:** 2025-01-19
**Total Diseases:** 36 (Malaria simplified to single IDSR entry)
**Ready for Implementation:** ✅
