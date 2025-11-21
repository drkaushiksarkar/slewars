# Disease Early Warning System (DEWS) Dashboard - Implementation Plan
## DHIS2 Sierra Leone Integration

**Version:** 2.0
**Date:** November 15, 2025
**Database:** DHIS2 Sierra Leone Demo
**Objective:** Build a comprehensive disease surveillance and forecasting dashboard

---

## Table of Contents
1. [Database Analysis Summary](#database-analysis-summary)
2. [Dashboard Architecture](#dashboard-architecture)
3. [Widgets & Visualizations](#widgets--visualizations)
4. [Disease Forecasting Model](#disease-forecasting-model)
5. [Implementation Phases](#implementation-phases)
6. [Technical Specifications](#technical-specifications)
7. [Deployment Guide](#deployment-guide)

---

## Database Analysis Summary

### Available Disease Data

#### Priority Diseases (with substantial data)

| Disease | Total Cases | Data Elements | Date Range | Status |
|---------|-------------|---------------|------------|--------|
| **Malaria** | 154,803 | 32 | Jan 2024 - Dec 2025 | ✅ Primary Focus |
| **Measles** | 30,855 | 12 | Jan 2024 - Dec 2025 | ✅ High Priority |
| **Typhoid Fever** | 2,968 | 4 | Jan 2024 - Dec 2025 | ✅ Medium Priority |
| **Yellow Fever** | 966 | 6 | Jan 2024 - Dec 2025 | ✅ Medium Priority |
| **Cholera** | 1,058 | 2 | Jan 2024 - Oct 2025 | ⚠️ Limited Data |
| **Lassa Fever** | 222 | 4 | Jan 2024 - Dec 2025 | ⚠️ Limited Data |

#### Key Data Elements by Disease

**Malaria (32 data elements):**
- New cases and follow-ups
- Treatment data (with/without ACT, timing < 24hrs / > 24hrs)
- Testing (RDT positive/negative, species identification: Pf, Pv, Po, Pm, Pk, mixed)
- Inpatient/outpatient cases and deaths
- Referrals
- Case investigation data (household, neighborhood, foci)
- Outbreak threshold
- IDSR reporting (UID: vq2qO3eTrNi)

**Measles (12 data elements):**
- New cases, follow-ups, referrals
- Deaths (< 5 years)
- Vaccination doses given
- Stock management
- IDSR reporting (UID: YazgqXbizv1)

**Typhoid Fever (4 data elements):**
- New cases, follow-ups, referrals
- Deaths (< 5 years)

**Yellow Fever (6 data elements):**
- New cases, follow-ups, referrals
- Deaths (< 5 years)
- Vaccination doses given

**Lassa Fever (4 data elements):**
- New cases, follow-ups, referrals

**Cholera (2 data elements):**
- Deaths (< 5 years)
- IDSR reporting (UID: UsSUX0cpKsH)

### Organization Unit Hierarchy

```
Sierra Leone (ImspTQPwCqd)                    [Level 1: Country]
├── Bo (O6uvpzGd5pu)                          [Level 2: District]
│   ├── Baoma (vWbkYPRmKyS)                  [Level 3: Chiefdom]
│   │   ├── Health Facility 1                 [Level 4: Facility]
│   │   └── Health Facility 2
│   └── Bargbe (dGheVylzol6)
├── Bombali (fdc6uOvgoji)
├── Bonthe (lc3eMKXaEfw)
├── Kailahun (jUb8gELQApl)
├── Kambia (PMa2VCrupOd)
├── Kenema (qhqAxPSTUXp)
├── Koinadugu (Vth0fbpFcsO)
├── Kono (kJq2mPyFEHo)
├── Moyamba (TEQlaapDQoK)
├── Port Loko (jmIPBj66vD6)
├── Pujehun (at6UHUQatSo)
├── Tonkolili (bL4ooGhyHRQ)
└── Western Area (jUb8gELQApl)
```

**Total Units:**
- **Level 1:** 1 (Country)
- **Level 2:** 13 (Districts)
- **Level 3:** 152 (Chiefdoms)
- **Level 4:** 1,166 (Health Facilities)

### Available Programs

1. **Malaria case diagnosis, treatment and investigation** (qDkgAbB5Jlk) - WITH_REGISTRATION
2. **Malaria focus investigation** (M3xtLkYBlKI) - WITH_REGISTRATION
3. **Child Programme** (IpHINAT79UW) - WITH_REGISTRATION
4. **TB program** (ur1Edk5Oe2n) - WITH_REGISTRATION
5. **WHO RMNCH Tracker** (WSGAb5XwJ3Y) - WITH_REGISTRATION
6. **Inpatient morbidity and mortality** (eBAyeGv0exc) - WITHOUT_REGISTRATION

---

## Dashboard Architecture

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL DHIS2 Database                    │
│                    (dhis2SierraLeoneDemo)                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │  PostgresService     │
                    │  (Connection Pool)   │
                    └───────────┬──────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
   ┌────▼─────┐         ┌──────▼──────┐        ┌──────▼──────┐
   │  Disease │         │  Location   │        │  Analytics  │
   │  Service │         │  Service    │        │  Service    │
   └────┬─────┘         └──────┬──────┘        └──────┬──────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   ML/Forecasting    │
                    │      Service        │
                    │  (Time Series +     │
                    │   Climate Data)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Express REST API   │
                    │  (port 4000)        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   React Frontend    │
                    │   (Vite + Tailwind) │
                    └─────────────────────┘
```

### Environment Configuration

The system supports flexible data sources via `.env`:

```env
# Data source options: synthetic | dhis2 | postgres | hybrid
DASHBOARD_DATA_SOURCE=postgres

# PostgreSQL DHIS2 Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=dhis2SierraLeoneDemo
POSTGRES_USER=                    # Leave blank if using trust auth
POSTGRES_PASSWORD=                # Leave blank if using trust auth

# DHIS2 Web API (optional - for API-based access)
DHIS2_BASE_URL=
DHIS2_USERNAME=
DHIS2_PASSWORD=

# Climate Data API (ERA5)
ERA5_API_KEY=                     # To be obtained
ERA5_API_URL=https://cds.climate.copernicus.eu/api/v2
```

---

## Widgets & Visualizations

### 1. Overview/Home Page

#### A. Key Performance Indicators (KPIs)

**Disease Overview Cards** (Top Row)
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Total Cases   │ │  Active Alerts  │ │   High Risk     │ │    Deaths       │
│                 │ │                 │ │   Districts     │ │                 │
│    158,872      │ │       12        │ │        3        │ │     4,412       │
│  (+2.3% ↑)     │ │   (Critical)    │ │  Bo, Bombali,   │ │  (+1.2% ↑)     │
│                 │ │                 │ │   Kenema        │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

**SQL Query for Total Cases:**
```sql
SELECT
  SUM(CAST(dv.value AS INTEGER)) as total_cases,
  COUNT(DISTINCT dv.sourceid) as affected_facilities,
  COUNT(DISTINCT p.startdate) as reporting_periods
FROM datavalue dv
JOIN dataelement de ON dv.dataelementid = de.dataelementid
JOIN period p ON dv.periodid = p.periodid
WHERE dv.deleted = false
  AND de.uid IN ('vq2qO3eTrNi', 'YazgqXbizv1', 'Cj5rTc9nEvl', 'XWU1Huh0Luy', 'UsSUX0cpKsH', 'NCteyX2xpMf')
  AND dv.value ~ '^[0-9]+$'
  AND p.enddate >= NOW() - INTERVAL '30 days';
```

#### B. Disease Breakdown by Category by Type

**Interactive Bar Chart** (Horizontal)
```
Malaria       ████████████████████████████████████ 154,803 cases
Measles       ████████████ 30,855 cases
Typhoid       ███ 2,968 cases
Yellow Fever  ██ 966 cases
Lassa Fever   █ 222 cases
Cholera       █ 1,058 deaths
```

**SQL Query:**
```sql
SELECT
  de.name as disease,
  SUM(CAST(dv.value AS INTEGER)) as total_cases,
  COUNT(DISTINCT dv.sourceid) as facilities_affected,
  AVG(CAST(dv.value AS INTEGER)) as avg_cases_per_period,
  MAX(CAST(dv.value AS INTEGER)) as peak_cases
FROM datavalue dv
JOIN dataelement de ON dv.dataelementid = de.dataelementid
JOIN period p ON dv.periodid = p.periodid
WHERE dv.deleted = false
  AND de.uid IN ('vq2qO3eTrNi', 'YazgqXbizv1', 'Cj5rTc9nEvl', 'XWU1Huh0Luy', 'UsSUX0cpKsH', 'NCteyX2xpMf')
  AND dv.value ~ '^[0-9]+$'
GROUP BY de.name, de.dataelementid
ORDER BY total_cases DESC;
```

#### C. Geographic Heat Map

**Choropleth Map** showing disease burden by district
- Color intensity based on case density (cases per 100,000 population)
- Click district to drill down to chiefdom level
- Hover to show tooltip with:
  - District name
  - Total cases (all diseases)
  - Dominant disease
  - Risk level
  - Population

**SQL Query for Map Data:**
```sql
WITH district_cases AS (
  SELECT
    ou.organisationunitid,
    ou.uid,
    ou.name as district_name,
    ST_AsGeoJSON(ou.geometry) as geometry,
    de.name as disease,
    SUM(CAST(dv.value AS INTEGER)) as cases
  FROM datavalue dv
  JOIN dataelement de ON dv.dataelementid = de.dataelementid
  JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
  WHERE dv.deleted = false
    AND ou.hierarchylevel = 2
    AND dv.value ~ '^[0-9]+$'
  GROUP BY ou.organisationunitid, ou.uid, ou.name, ou.geometry, de.name
)
SELECT
  district_name,
  uid,
  geometry,
  SUM(cases) as total_cases,
  json_object_agg(disease, cases) as cases_by_disease
FROM district_cases
GROUP BY district_name, uid, geometry
ORDER BY total_cases DESC;
```

#### D. Time Series Chart

**Multi-line Chart** showing trend over time (last 12 months)
- X-axis: Time (monthly)
- Y-axis: Number of cases
- Multiple lines for different diseases (color-coded)
- Toggle to switch between:
  - Absolute numbers
  - Rate per 100,000 population
  - Cumulative cases

**SQL Query:**
```sql
SELECT
  de.name as disease,
  p.startdate,
  p.enddate,
  SUM(CAST(dv.value AS INTEGER)) as cases,
  COUNT(DISTINCT dv.sourceid) as facilities_reporting
FROM datavalue dv
JOIN dataelement de ON dv.dataelementid = de.dataelementid
JOIN period p ON dv.periodid = p.periodid
WHERE dv.deleted = false
  AND de.uid IN ('vq2qO3eTrNi', 'YazgqXbizv1', 'Cj5rTc9nEvl', 'XWU1Huh0Luy', 'UsSUX0cpKsH', 'NCteyX2xpMf')
  AND dv.value ~ '^[0-9]+$'
  AND p.startdate >= NOW() - INTERVAL '12 months'
GROUP BY de.name, de.dataelementid, p.periodid, p.startdate, p.enddate
ORDER BY p.startdate, de.name;
```

#### E. Alert/Outbreak Detection Panel

**List of Active Alerts**
```
┌────────────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL: Malaria outbreak in Bo District                  │
│    - 1,234 cases in last 7 days (350% above threshold)        │
│    - Affected chiefdoms: Baoma, Bargbe                        │
│    - Recommended action: Deploy rapid response team           │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ 🟡 WARNING: Measles cases increasing in Western Area          │
│    - 145 cases in last 7 days (120% above threshold)          │
│    - Low vaccination coverage detected                        │
│    - Recommended action: Vaccination campaign                 │
└────────────────────────────────────────────────────────────────┘
```

**SQL Query for Outbreak Detection:**
```sql
WITH recent_cases AS (
  SELECT
    de.dataelementid,
    de.name as disease,
    ou.name as location,
    ou.hierarchylevel,
    ou.parentid,
    SUM(CAST(dv.value AS INTEGER)) as cases_7d,
    COUNT(DISTINCT dv.sourceid) as facilities
  FROM datavalue dv
  JOIN dataelement de ON dv.dataelementid = de.dataelementid
  JOIN period p ON dv.periodid = p.periodid
  JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
  WHERE dv.deleted = false
    AND p.enddate >= NOW() - INTERVAL '7 days'
    AND dv.value ~ '^[0-9]+$'
  GROUP BY de.dataelementid, de.name, ou.organisationunitid, ou.name, ou.hierarchylevel, ou.parentid
),
historical_baseline AS (
  SELECT
    de.dataelementid,
    dv.sourceid,
    AVG(CAST(dv.value AS INTEGER)) as avg_cases,
    STDDEV(CAST(dv.value AS INTEGER)) as stddev_cases
  FROM datavalue dv
  JOIN dataelement de ON dv.dataelementid = de.dataelementid
  JOIN period p ON dv.periodid = p.periodid
  WHERE dv.deleted = false
    AND p.enddate < NOW() - INTERVAL '7 days'
    AND p.enddate >= NOW() - INTERVAL '6 months'
    AND dv.value ~ '^[0-9]+$'
  GROUP BY de.dataelementid, dv.sourceid
)
SELECT
  rc.disease,
  rc.location,
  rc.cases_7d,
  COALESCE(hb.avg_cases, 0) as baseline,
  CASE
    WHEN hb.avg_cases > 0 THEN (rc.cases_7d - hb.avg_cases) / hb.avg_cases * 100
    ELSE NULL
  END as percent_change,
  CASE
    WHEN rc.cases_7d > (hb.avg_cases + 2 * hb.stddev_cases) THEN 'CRITICAL'
    WHEN rc.cases_7d > (hb.avg_cases + hb.stddev_cases) THEN 'WARNING'
    ELSE 'NORMAL'
  END as alert_level
FROM recent_cases rc
LEFT JOIN historical_baseline hb ON rc.dataelementid = hb.dataelementid
WHERE rc.cases_7d > (hb.avg_cases + hb.stddev_cases)
ORDER BY alert_level DESC, percent_change DESC;
```

### 2. Disease-Specific Page

When user selects a disease (e.g., Malaria), show detailed analysis:

#### A. Disease Summary Card

```
┌─────────────────────────────────────────────────────────────────┐
│                         MALARIA                                  │
│                                                                  │
│  Total Cases: 154,803    |  Deaths: 888    |  CFR: 0.57%       │
│  New Cases (7d): 1,234   |  Trend: ↑ 12%   |  Active Outbreaks: 2│
│                                                                  │
│  Treatment Coverage: 87%                                        │
│  ACT < 24hrs: 72%  |  RDT Positive Rate: 34%                   │
└─────────────────────────────────────────────────────────────────┘
```

**SQL Queries:**
```sql
-- Summary Stats
SELECT
  COUNT(DISTINCT dv.periodid) as reporting_periods,
  SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.uid = 'vq2qO3eTrNi') as total_cases,
  SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.uid = 'r6nrJANOqMw') as total_deaths,
  SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.uid = 'AFM5H0wNq3t') as treated_act_24hrs,
  SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.uid = 'wZwzzRnr9N4') as rdt_positive,
  SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.uid = 'Qk9nnX0i7lZ') as rdt_negative
FROM datavalue dv
JOIN dataelement de ON dv.dataelementid = de.dataelementid
WHERE dv.deleted = false
  AND de.name ILIKE '%malaria%'
  AND dv.value ~ '^[0-9]+$';
```

#### B. Age/Gender Distribution

```
Age Group Distribution        Gender Distribution
0-5 years    ████████ 35%     Male     ████████ 48%
6-14 years   ██████ 28%       Female   ██████████ 52%
15-49 years  █████ 22%
50+ years    ███ 15%
```

(Note: If age/gender data not available in aggregate, note as "Data not available - tracker data only")

#### C. Species Distribution (Malaria-specific)

```
P. falciparum  ████████████████ 78%
P. vivax       ████ 12%
P. ovale       ██ 5%
P. malariae    █ 3%
Mixed          █ 2%
```

**SQL Query:**
```sql
SELECT
  de.shortname as species,
  SUM(CAST(dv.value AS INTEGER)) as cases,
  ROUND(SUM(CAST(dv.value AS INTEGER)) * 100.0 / SUM(SUM(CAST(dv.value AS INTEGER))) OVER (), 2) as percentage
FROM datavalue dv
JOIN dataelement de ON dv.dataelementid = de.dataelementid
WHERE dv.deleted = false
  AND de.uid IN ('jt8mzqlDEjd', 'ImgnHPhcNYE', 'E2K6KluoF7L', 'sJ23PICb6Fy', 'HUPFagklWaN')
  AND dv.value ~ '^[0-9]+$'
GROUP BY de.shortname, de.dataelementid
ORDER BY cases DESC;
```

#### D. Treatment Timeline

```
PHU with ACT < 24hrs     ████████████████ 45,234 cases
PHU with ACT > 24hrs     ████████ 23,112 cases
Community ACT < 24hrs    ██████ 18,445 cases
Community ACT > 24hrs    ████ 12,334 cases
PHU without ACT          ███ 8,223 cases
```

#### E. Facility Performance

**Table showing top/bottom performers**
```
┌────────────────────┬───────────┬──────────┬────────────────┐
│ Health Facility    │   Cases   │ Deaths   │ CFR            │
├────────────────────┼───────────┼──────────┼────────────────┤
│ Kenema Hospital    │  2,345    │   12     │ 0.51%          │
│ Bo Government Hosp │  1,892    │   8      │ 0.42%          │
│ Makeni Hospital    │  1,654    │   15     │ 0.91% ⚠️       │
└────────────────────┴───────────┴──────────┴────────────────┘
```

### 3. Location-Based Analysis

#### A. District Comparison

**Horizontal bar chart comparing all 13 districts**
```
Bo          ████████████████ 28,542 cases
Bombali     ██████████████ 24,123 cases
Kenema      ████████████ 18,934 cases
Western Area██████████ 15,223 cases
...
```

#### B. Chiefdom Drill-Down

When district selected, show chiefdom-level data:
```
District: Bo
├── Baoma        4,523 cases  (15.8%)
├── Bargbe       3,234 cases  (11.3%)
├── Bagruwa      2,891 cases  (10.1%)
└── ...
```

#### C. Facility-Level Data

**Table with filters**
```
┌────────────────┬──────────┬─────────┬──────────────┬─────────────┐
│ Facility       │ District │ Cases   │ Last Report  │ Status      │
├────────────────┼──────────┼─────────┼──────────────┼─────────────┤
│ Kenema Hosp    │ Kenema   │ 2,345   │ 2 days ago   │ ✅ Active   │
│ Bo Govt Hosp   │ Bo       │ 1,892   │ 1 day ago    │ ✅ Active   │
│ Makeni MCHP    │ Bombali  │ 234     │ 14 days ago  │ ⚠️ Delayed  │
└────────────────┴──────────┴─────────┴──────────────┴─────────────┘
```

**SQL Query:**
```sql
SELECT
  ou.name as facility,
  parent_ou.name as district,
  SUM(CAST(dv.value AS INTEGER)) as total_cases,
  MAX(dv.lastupdated) as last_report_date,
  CASE
    WHEN MAX(dv.lastupdated) > NOW() - INTERVAL '7 days' THEN 'Active'
    WHEN MAX(dv.lastupdated) > NOW() - INTERVAL '30 days' THEN 'Delayed'
    ELSE 'Inactive'
  END as status
FROM datavalue dv
JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
JOIN organisationunit parent_ou ON ou.parentid = parent_ou.organisationunitid
WHERE dv.deleted = false
  AND ou.hierarchylevel = 4
  AND dv.value ~ '^[0-9]+$'
GROUP BY ou.organisationunitid, ou.name, parent_ou.name
ORDER BY total_cases DESC;
```

### 4. Forecasting & Prediction Dashboard

#### A. 30-Day Forecast

**Multi-line chart with confidence intervals**
```
Cases
  ↑
  │     Historical        │   Forecast
  │                       │
  │   ╱╲  ╱╲            │    ╱╲  ╱╲
  │  ╱  ╲╱  ╲          │   ╱  ╲╱  ╲
  │ ╱        ╲        │  ╱         ╲
  │╱          ╲      │ ╱            ╲
  └─────────────────┼──────────────────→ Time
                   NOW

  ─── Actual  ─── Predicted  ░░░ 95% CI
```

#### B. Risk Prediction by District

**Heat map showing predicted risk levels**
```
┌────────────────┬─────────────────┬────────────────────┐
│ District       │ Current Risk    │ 30-Day Forecast    │
├────────────────┼─────────────────┼────────────────────┤
│ Bo             │ 🟡 Medium (65%) │ 🔴 High (82%) ↑    │
│ Bombali        │ 🟢 Low (35%)    │ 🟡 Medium (58%) ↑  │
│ Kenema         │ 🔴 High (78%)   │ 🔴 High (85%) →    │
└────────────────┴─────────────────┴────────────────────┘
```

#### C. Contributing Factors

**Waterfall chart showing factor importance**
```
Impact on Risk Score
                    +15
            ┌────────────┐
            │            │
   +25      │            │  +10
┌────────┐  │            │ ┌─────┐
│        │  │            │ │     │    -8
│        │  │            │ │     │  ┌────┐
│        │  │            │ │     │  │    │
└────────┘  └────────────┘ └─────┘  └────┘
 Rainfall   Temperature   Humidity  Intervention

Base: 45 → Final: 87 (High Risk)
```

#### D. Climate Variables Correlation

**Scatter plots and correlation matrix**
```
Malaria Cases vs Rainfall          Correlation Matrix
Cases ↑                            ┌────────┬──────┬──────┬──────┐
    │ ●                            │        │ Rain │ Temp │ Humid│
    │   ●  ●                       ├────────┼──────┼──────┼──────┤
    │  ● ●●●                       │ Cases  │ 0.78 │ 0.65 │ 0.42 │
    │ ●● ●●                        │ Rain   │  -   │ 0.34 │ 0.56 │
    │●  ●                          │ Temp   │  -   │  -   │ 0.23 │
    └──────────────→ Rainfall      └────────┴──────┴──────┴──────┘
     r = 0.78, p < 0.001
```

### 5. Response & Intervention Tracking

#### A. Intervention Timeline

**Gantt chart showing planned/ongoing interventions**
```
District: Bo
┌─────────────────────────────┬────┬────┬────┬────┬────┐
│ Intervention                │ W1 │ W2 │ W3 │ W4 │ W5 │
├─────────────────────────────┼────┼────┼────┼────┼────┤
│ Mass testing campaign       │████│████│    │    │    │
│ IRS (Indoor spraying)       │    │████│████│████│    │
│ LLIN distribution           │    │    │████│████│████│
│ Community education         │████│████│████│████│████│
└─────────────────────────────┴────┴────┴────┴────┴────┘
```

#### B. Stock/Supply Management

**Inventory levels for key commodities**
```
┌────────────────────┬──────────┬────────┬────────────┐
│ Item               │ Stock    │ Usage  │ Days Left  │
├────────────────────┼──────────┼────────┼────────────┤
│ ACT (adult)        │ 12,500   │ 450/d  │ 27 days ✅ │
│ ACT (child)        │ 3,200    │ 280/d  │ 11 days ⚠️  │
│ RDT kits           │ 890      │ 520/d  │ 2 days 🔴  │
│ Measles vaccine    │ 2,340    │ 45/d   │ 52 days ✅ │
└────────────────────┴──────────┴────────┴────────────┘
```

**SQL Query:**
```sql
SELECT
  de.name as item,
  SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.name ILIKE '%start balance%') as start_balance,
  SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.name ILIKE '%received%') as received,
  SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.name ILIKE '%dispensed%') as dispensed,
  SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.name ILIKE '%discarded%') as discarded,
  (
    SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.name ILIKE '%start balance%') +
    SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.name ILIKE '%received%') -
    SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.name ILIKE '%dispensed%') -
    SUM(CAST(dv.value AS INTEGER)) FILTER (WHERE de.name ILIKE '%discarded%')
  ) as current_stock
FROM datavalue dv
JOIN dataelement de ON dv.dataelementid = de.dataelementid
WHERE dv.deleted = false
  AND (de.name ILIKE '%stock%' OR de.name ILIKE '%balance%' OR de.name ILIKE '%dispensed%')
  AND dv.value ~ '^[0-9]+$'
GROUP BY de.name
ORDER BY current_stock ASC;
```

### 6. Data Quality Dashboard

#### A. Completeness Metrics

```
Overall Completeness: 87%

┌────────────────────┬──────────────────┬──────────────┐
│ District           │ Completeness     │ Timeliness   │
├────────────────────┼──────────────────┼──────────────┤
│ Western Area       │ ████████████ 95% │ ████████ 92% │
│ Bo                 │ ██████████ 88%   │ █████ 78%    │
│ Bombali            │ █████████ 82%    │ ██████ 85%   │
│ Kono               │ ████ 45% ⚠️      │ ███ 34% 🔴   │
└────────────────────┴──────────────────┴──────────────┘
```

**SQL Query:**
```sql
WITH expected_reports AS (
  SELECT
    ou.organisationunitid,
    ou.name,
    COUNT(DISTINCT p.periodid) as expected_periods
  FROM organisationunit ou
  CROSS JOIN period p
  WHERE ou.hierarchylevel = 4
    AND p.startdate >= NOW() - INTERVAL '12 months'
    AND p.enddate < NOW()
  GROUP BY ou.organisationunitid, ou.name
),
actual_reports AS (
  SELECT
    dv.sourceid,
    COUNT(DISTINCT dv.periodid) as actual_periods,
    AVG(EXTRACT(EPOCH FROM (dv.lastupdated - p.enddate)) / 86400) as avg_delay_days
  FROM datavalue dv
  JOIN period p ON dv.periodid = p.periodid
  WHERE dv.deleted = false
    AND p.startdate >= NOW() - INTERVAL '12 months'
  GROUP BY dv.sourceid
)
SELECT
  parent_ou.name as district,
  COUNT(er.organisationunitid) as total_facilities,
  ROUND(AVG(COALESCE(ar.actual_periods, 0) * 100.0 / er.expected_periods), 1) as completeness_pct,
  ROUND(AVG(COALESCE(ar.avg_delay_days, 0)), 1) as avg_delay_days,
  COUNT(*) FILTER (WHERE COALESCE(ar.actual_periods, 0) * 100.0 / er.expected_periods >= 80) as compliant_facilities
FROM expected_reports er
LEFT JOIN actual_reports ar ON er.organisationunitid = ar.sourceid
JOIN organisationunit ou ON er.organisationunitid = ou.organisationunitid
JOIN organisationunit parent_ou ON ou.parentid = parent_ou.organisationunitid
WHERE parent_ou.hierarchylevel = 2
GROUP BY parent_ou.name
ORDER BY completeness_pct DESC;
```

#### B. Data Validation Issues

```
⚠️ Data Quality Alerts

- 23 facilities with missing reports (> 14 days)
- 8 outlier values detected (> 3 SD from mean)
- 4 duplicate submissions found
- 2 facilities with negative stock values
```

---

## Disease Forecasting Model

### Model Architecture: Time Series + Climate Integration

#### 1. Data Sources

**Historical Disease Data** (from DHIS2)
- Weekly/monthly case counts by disease and location
- Deaths, hospitalizations, referrals
- Treatment outcomes
- Testing data

**Climate Variables** (from ERA5)
- Temperature (mean, min, max) - daily/weekly/monthly
- Precipitation (rainfall) - cumulative
- Relative humidity
- Wind speed
- Soil moisture (optional)

**Geographic coordinates** for Sierra Leone:
- Latitude: 7.5° to 10° N
- Longitude: 10.5° to 13.5° W

#### 2. ERA5 Climate Data API Integration

**ERA5 API Configuration:**
```javascript
const ERA5_CONFIG = {
  apiUrl: 'https://cds.climate.copernicus.eu/api/v2',
  dataset: 'reanalysis-era5-single-levels',
  variables: [
    '2m_temperature',
    'total_precipitation',
    'relative_humidity',
    '10m_u_component_of_wind',
    '10m_v_component_of_wind'
  ],
  area: [10, -13.5, 7.5, -10.5], // North, West, South, East
  format: 'netcdf'
};
```

**Sample API Request:**
```python
import cdsapi

c = cdsapi.Client()

c.retrieve(
    'reanalysis-era5-single-levels',
    {
        'product_type': 'reanalysis',
        'variable': [
            '2m_temperature', 'total_precipitation',
            'relative_humidity'
        ],
        'year': ['2024', '2025'],
        'month': ['01', '02', '03', '04', '05', '06',
                  '07', '08', '09', '10', '11', '12'],
        'day': ['01', '02', ..., '31'],
        'time': ['00:00', '06:00', '12:00', '18:00'],
        'area': [10, -13.5, 7.5, -10.5],  # Sierra Leone
        'format': 'netcdf',
    },
    'sierra_leone_climate.nc')
```

#### 3. Feature Engineering

**Lagged Features:**
- Disease cases: t-1, t-2, t-4, t-8 weeks
- Climate: t-0, t-1, t-2, t-4 weeks (to capture incubation periods)

**Rolling Statistics:**
- 4-week moving average
- 4-week moving standard deviation
- 4-week cumulative sum (for rainfall)

**Seasonal Features:**
- Month (1-12)
- Week of year (1-52)
- Season indicator (Dry: Nov-Apr, Wet: May-Oct)

**Climate-Disease Interaction Terms:**
- Temperature × Rainfall
- Temperature² (for non-linear effects)
- Humidity × Rainfall

**Example Feature Vector:**
```
[
  cases_t1,           # Cases 1 week ago
  cases_t2,           # Cases 2 weeks ago
  cases_t4,           # Cases 4 weeks ago
  cases_ma4,          # 4-week moving average
  temp_current,       # Current temperature
  temp_lag1,          # Temperature 1 week ago
  temp_lag2,          # Temperature 2 weeks ago
  rainfall_cum4,      # 4-week cumulative rainfall
  rainfall_lag2,      # Rainfall 2 weeks ago
  humidity_current,   # Current humidity
  temp_rainfall,      # Interaction term
  month,              # Month (1-12)
  season_wet,         # Is wet season (0/1)
  district_id,        # Location encoding
  population          # Population size
]
```

#### 4. Model Selection

**Primary Model: SARIMA + XGBoost Ensemble**

```python
# SARIMA for capturing seasonality and trends
from statsmodels.tsa.statespace.sarimax import SARIMAX

sarima_model = SARIMAX(
    train_data['cases'],
    order=(1, 1, 1),              # (p, d, q)
    seasonal_order=(1, 1, 1, 52),  # (P, D, Q, s) - weekly seasonality
    exog=train_data[climate_features]
)

# XGBoost for non-linear climate relationships
import xgboost as xgb

xgb_model = xgb.XGBRegressor(
    n_estimators=100,
    learning_rate=0.05,
    max_depth=5,
    objective='reg:squarederror'
)

# Ensemble: weighted average
final_prediction = 0.6 * sarima_pred + 0.4 * xgb_pred
```

**Alternative Models to Compare:**
- **Prophet** (Facebook): Good for handling missing data and holidays
- **LSTM** (Deep Learning): Captures complex temporal patterns
- **Random Forest**: Robust to outliers
- **Gradient Boosting Machines**: Strong performance on tabular data

#### 5. Model Training Pipeline

```javascript
// server/src/services/ml/forecastingService.ts

class ForecastingService {
  async trainModel(disease: string, location: string) {
    // 1. Fetch historical disease data
    const diseaseData = await this.fetchDiseaseTimeSeries(disease, location);

    // 2. Fetch climate data from ERA5
    const climateData = await this.fetchClimateData(location);

    // 3. Merge datasets by date/location
    const mergedData = this.mergeData(diseaseData, climateData);

    // 4. Feature engineering
    const features = this.engineerFeatures(mergedData);

    // 5. Train-test split (80-20, temporal)
    const [trainData, testData] = this.temporalSplit(features, 0.8);

    // 6. Train SARIMA
    const sarimaModel = await this.trainSARIMA(trainData);

    // 7. Train XGBoost
    const xgbModel = await this.trainXGBoost(trainData);

    // 8. Evaluate on test set
    const metrics = await this.evaluate(testData, sarimaModel, xgbModel);

    // 9. Save models
    await this.saveModels(disease, location, sarimaModel, xgbModel);

    return metrics;
  }

  async forecast(disease: string, location: string, horizon: number = 4) {
    // Load trained models
    const models = await this.loadModels(disease, location);

    // Get latest data
    const latestData = await this.getLatestData(disease, location);

    // Fetch climate forecast (if available) or use historical averages
    const climateForecast = await this.getClimateForecast(location, horizon);

    // Generate forecasts
    const sarimaPred = models.sarima.forecast(horizon, climateForecast);
    const xgbPred = models.xgb.predict(climateForecast);

    // Ensemble
    const finalForecast = this.ensemble(sarimaPred, xgbPred);

    // Calculate prediction intervals (95% CI)
    const intervals = this.calculatePredictionIntervals(finalForecast);

    return {
      predictions: finalForecast,
      lower_bound: intervals.lower,
      upper_bound: intervals.upper,
      dates: this.generateFutureDates(horizon)
    };
  }
}
```

#### 6. Model Evaluation Metrics

**Accuracy Metrics:**
- **MAE** (Mean Absolute Error): Average magnitude of errors
- **RMSE** (Root Mean Squared Error): Penalizes large errors more
- **MAPE** (Mean Absolute Percentage Error): % error
- **R²**: Proportion of variance explained

**Forecast-Specific Metrics:**
- **Forecast Skill**: Compared to baseline (naive forecast)
- **Direction Accuracy**: % of times direction of change is correct
- **Alert Performance**: Sensitivity, Specificity, PPV, NPV for outbreak alerts

**Target Performance:**
```
MAE: < 20 cases per week
RMSE: < 50 cases per week
MAPE: < 25%
R²: > 0.70
Alert Sensitivity: > 85%
Alert PPV: > 70%
```

#### 7. Real-time Prediction Updates

**Automated Pipeline:**
```
Daily (3 AM):
├── Fetch new case data from DHIS2
├── Fetch latest climate data from ERA5
├── Update feature store
└── Generate updated forecasts

Weekly (Monday):
├── Retrain models with new data
├── Evaluate model performance
├── Compare with baseline
└── Alert if performance degradation

Monthly:
├── Full model retraining
├── Hyperparameter tuning
└── Model selection comparison
```

#### 8. Forecasting Output Format

```javascript
{
  "disease": "Malaria",
  "location": "Bo District",
  "location_uid": "O6uvpzGd5pu",
  "forecast_date": "2025-11-15",
  "forecast_horizon": 4, // weeks
  "predictions": [
    {
      "date": "2025-11-17",
      "week": "2025-W47",
      "predicted_cases": 234,
      "lower_bound": 187,
      "upper_bound": 298,
      "confidence": 0.95,
      "risk_level": "Medium",
      "risk_score": 0.65,
      "contributing_factors": [
        { "factor": "High rainfall", "impact": 0.35 },
        { "factor": "Increased temperature", "impact": 0.25 },
        { "factor": "Recent case trend", "impact": 0.20 }
      ]
    },
    // ... more weeks
  ],
  "model_info": {
    "sarima_weight": 0.6,
    "xgboost_weight": 0.4,
    "last_trained": "2025-11-14",
    "mae": 18.5,
    "rmse": 42.3
  }
}
```

#### 9. Climate Data Processing

**PostgreSQL Schema for Climate Data:**
```sql
CREATE TABLE climate_data (
  id SERIAL PRIMARY KEY,
  location_uid VARCHAR(11) REFERENCES organisationunit(uid),
  date DATE NOT NULL,
  temperature_mean DECIMAL(5,2),
  temperature_min DECIMAL(5,2),
  temperature_max DECIMAL(5,2),
  precipitation DECIMAL(7,2),
  humidity DECIMAL(5,2),
  wind_speed DECIMAL(5,2),
  source VARCHAR(50) DEFAULT 'ERA5',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(location_uid, date)
);

CREATE INDEX idx_climate_location_date ON climate_data(location_uid, date);
```

**Data Ingestion Service:**
```typescript
// server/src/services/climateService.ts

class ClimateService {
  async fetchERA5Data(startDate: string, endDate: string) {
    // Call ERA5 CDS API
    const response = await axios.post(
      'https://cds.climate.copernicus.eu/api/v2/resources/reanalysis-era5-single-levels',
      {
        product_type: 'reanalysis',
        format: 'netcdf',
        variable: ['2m_temperature', 'total_precipitation', 'relative_humidity'],
        area: [10, -13.5, 7.5, -10.5], // Sierra Leone
        date: `${startDate}/${endDate}`,
      }
    );

    return response.data;
  }

  async processNetCDF(file: Buffer) {
    // Parse NetCDF file and extract data
    // Map to district coordinates
    // Aggregate to weekly/monthly
    return processedData;
  }

  async storeClimateData(data: ClimateData[]) {
    // Bulk insert into PostgreSQL
    await postgresService.query(`
      INSERT INTO climate_data (location_uid, date, temperature_mean, precipitation, humidity)
      VALUES ${data.map(d => `('${d.location}', '${d.date}', ${d.temp}, ${d.precip}, ${d.humidity})`).join(',')}
      ON CONFLICT (location_uid, date) DO UPDATE SET
        temperature_mean = EXCLUDED.temperature_mean,
        precipitation = EXCLUDED.precipitation,
        humidity = EXCLUDED.humidity
    `);
  }
}
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Goal:** Set up database connections, basic API, and authentication

**Status:** ✅ COMPLETED (November 15, 2025)

**Tasks:**
1. ✅ Install PostgreSQL client (`pg`, `@types/pg`)
2. ✅ Create `postgresService.ts` with connection pooling
3. ✅ Update environment configuration
4. ✅ Create database exploration script
5. ✅ Create `diseaseService.ts` for disease-specific queries
6. ✅ Create `locationService.ts` for org unit queries
7. ✅ Create `analyticsService.ts` for aggregated metrics
8. ✅ Set up Express API routes:
   - `/api/diseases` - List all diseases
   - `/api/diseases/:diseaseId/summary` - Disease summary
   - `/api/diseases/:diseaseId/timeseries` - Time series data
   - `/api/diseases/:diseaseId/locations` - Cases by location
   - `/api/diseases/breakdown/all` - All diseases breakdown
   - `/api/locations` - Organization unit hierarchy
   - `/api/locations/hierarchy` - Tree structure
   - `/api/locations/:uid` - Location details
   - `/api/locations/:uid/data` - Location-specific data
   - `/api/locations/:uid/children` - Child locations
   - `/api/locations/districts/comparison` - District comparison
   - `/api/analytics/overview` - Dashboard overview metrics
   - `/api/analytics/outbreak-detection` - Outbreak alerts
   - `/api/analytics/trends` - Disease trends
   - `/api/analytics/heatmap` - Geographic heat map
   - `/api/analytics/data-quality` - Data quality metrics
9. ✅ Add health check endpoint: `/api/health`
10. ✅ Set up error handling and logging

**Deliverables:**
- ✅ Functional backend API with PostgreSQL integration
- ⏳ API documentation (OpenAPI/Swagger) - To be added
- ✅ Database query optimization
- ✅ Test connectivity script

**Files Created:**
```
server/src/services/
  ├── ✅ diseaseService.ts - Disease-specific queries and metrics
  ├── ✅ locationService.ts - Organization unit hierarchy and location data
  ├── ✅ analyticsService.ts - Aggregated metrics, outbreak detection, trends
  └── ⏳ climateService.ts (skeleton) - To be added in Phase 5

server/src/routes/
  ├── ✅ diseaseRoutes.ts - Disease endpoints
  ├── ✅ locationRoutes.ts - Location endpoints
  └── ✅ analyticsRoutes.ts - Analytics endpoints
```

**API Endpoints Implemented:**

*Disease Endpoints:*
- `GET /api/diseases` - List all diseases
- `GET /api/diseases/:diseaseId/summary` - Disease summary statistics
- `GET /api/diseases/:diseaseId/timeseries` - Time series data with optional filters
- `GET /api/diseases/:diseaseId/locations` - Disease cases by location
- `GET /api/diseases/breakdown/all` - All diseases breakdown

*Location Endpoints:*
- `GET /api/locations` - Get all organization units (optionally filtered by level)
- `GET /api/locations/hierarchy` - Get location hierarchy tree
- `GET /api/locations/:uid` - Get specific location details
- `GET /api/locations/:uid/children` - Get child locations
- `GET /api/locations/:uid/data` - Get disease data for location
- `GET /api/locations/districts/comparison` - District comparison data

*Analytics Endpoints:*
- `GET /api/analytics/overview` - Overview metrics (KPIs)
- `GET /api/analytics/outbreak-detection` - Detect outbreaks with statistical thresholds
- `GET /api/analytics/trends` - Disease trends over time
- `GET /api/analytics/heatmap` - Geographic heat map data
- `GET /api/analytics/data-quality` - Data quality metrics

*System Endpoints:*
- `GET /api/health` - Health check endpoint with database status

**Notes:**
- All endpoints return JSON with consistent response format: `{ success: true, data: ..., count?: ... }`
- Error handling is centralized in app.ts
- Logging uses Pino logger throughout
- Database queries are optimized with proper indexes and aggregations
- All services use the postgresService for database access

### Phase 2: Overview Dashboard (Week 2)

**Goal:** Build the main overview page with KPIs and visualizations

**Status:** ✅ COMPLETED (November 15, 2025)

**Tasks:**
1. ✅ Update `dashboardService.ts` to use PostgreSQL data (API endpoints from Phase 1)
2. ✅ Implement KPI calculations:
   - Total cases (30 days)
   - Active alerts
   - Deaths
   - High-risk districts
   - Affected facilities
3. ✅ Create Disease Breakdown by Category endpoint (already in Phase 1: `/api/diseases/breakdown/all`)
4. ✅ Build time series data endpoint (already in Phase 1: `/api/analytics/trends`)
5. ✅ Implement outbreak detection algorithm (already in Phase 1: `/api/analytics/outbreak-detection`)
6. ✅ Create frontend components:
   - `NewOverview.jsx` - Main overview page using real DHIS2 data
   - `KPICard.jsx` - Reusable KPI card with trend indicators
   - `DiseaseBarChart.jsx` - Horizontal bar chart with CSS animations
   - `TimeSeriesChart.jsx` - SVG-based line chart for trends
   - `AlertPanel.jsx` - Expandable alert cards with filtering
7. ✅ Add disease selector dropdown
8. ✅ Integrate with existing Mapbox visualization (DiseaseMap)
9. ✅ Add GeoJSON support via heatmap endpoint
10. ✅ Implement drill-down navigation (disease filtering)

**Components Created:**
```
src/hooks/
  └── ✅ useDashboardAnalytics.js - Custom hook for fetching Phase 1 API data

src/components/dashboard/
  ├── ✅ KPICard.jsx - Animated KPI cards with trend indicators
  ├── ✅ DiseaseBarChart.jsx - Horizontal bar chart with percentage bars
  ├── ✅ TimeSeriesChart.jsx - SVG line chart with multiple diseases
  └── ✅ AlertPanel.jsx - Expandable alert cards with filtering

src/components/
  └── ✅ NewOverview.jsx - Complete overview page using all components
```

**Features Implemented:**
- ✅ 4 KPI cards showing: Total Cases, Active Alerts, High Risk Districts, Affected Facilities
- ✅ Disease Breakdown by Category chart with animated horizontal bars
- ✅ Multi-line time series chart showing 12-week trends for all diseases
- ✅ Alert panel with CRITICAL/WARNING filtering and expandable details
- ✅ Disease selector dropdown to filter by specific disease
- ✅ Geographic heat map integration with existing DiseaseMap component
- ✅ Real-time data fetching from Phase 1 API endpoints
- ✅ Loading states and error handling
- ✅ Responsive grid layouts
- ✅ Smooth animations with Framer Motion

**Data Integration:**
- Uses `/api/analytics/overview` for KPIs
- Uses `/api/diseases` for disease list
- Uses `/api/diseases/breakdown/all` for bar chart
- Uses `/api/analytics/outbreak-detection` for alerts
- Uses `/api/analytics/trends?weeks=12` for time series
- Uses `/api/analytics/heatmap` for geographic data

**Deliverables:**
- ✅ Fully functional overview dashboard with real DHIS2 data
- ✅ Interactive visualizations (charts, graphs, maps)
- ✅ Real-time data updates via API calls
- ✅ Responsive design for all screen sizes
- ✅ Error handling and loading states
- ✅ Disease filtering capability

**Notes:**
- All visualizations built without external charting libraries (using CSS and SVG)
- Lightweight implementation for faster page loads
- Component-based architecture for reusability
- Integrated seamlessly with existing Dashboard.jsx

### Phase 3: Disease-Specific Pages (Week 3)

**Goal:** Detailed disease analysis pages

**Tasks:**
1. Create dynamic route: `/diseases/:diseaseId`
2. Implement disease detail service methods
3. Build disease summary card
4. Create species/subtype distribution (for Malaria)
5. Treatment timeline visualization
6. Facility performance table
7. Add filters:
   - Date range selector
   - Location filter
   - Age group filter (if available)
8. Export functionality (CSV, PDF)
9. Share/bookmark functionality
10. Add disease comparison tool

**Components:**
```
src/components/disease/
  ├── DiseasePage.tsx
  ├── DiseaseSummaryCard.tsx
  ├── SpeciesDistribution.tsx
  ├── TreatmentTimeline.tsx
  └── FacilityPerformanceTable.tsx
```

**Deliverables:**
- Individual pages for each disease
- Detailed analytics and breakdowns
- Export capabilities
- Comparison tools

### Phase 4: Location Analysis (Week 4)

**Goal:** Geographic drill-down and facility-level analysis

**Tasks:**
1. Create location hierarchy service
2. Implement breadcrumb navigation
3. Build district comparison page
4. Create chiefdom drill-down view
5. Facility-level data table
6. Add GeoJSON support for all levels
7. Implement location-based filtering across dashboard
8. Create heatmap visualization
9. Add population normalization (cases per 100k)
10. Build facility performance rankings

**Components:**
```
src/components/location/
  ├── LocationPage.tsx
  ├── DistrictComparison.tsx
  ├── ChiefdomView.tsx
  ├── FacilityTable.tsx
  └── LocationHeatmap.tsx
```

**Deliverables:**
- Complete geographic navigation
- Drill-down from country → district → chiefdom → facility
- Facility-level insights
- Performance rankings

### Phase 5: Climate Data Integration (Week 5-6)

**Goal:** Integrate ERA5 climate data and prepare for forecasting

**Tasks:**
1. Set up ERA5 CDS API account and credentials
2. Create climate data schema in PostgreSQL
3. Implement ERA5 data fetching service
4. Parse NetCDF files and extract relevant data
5. Map climate data to organization units
6. Create temporal aggregation (daily → weekly → monthly)
7. Build climate data visualization components
8. Implement climate-disease correlation analysis
9. Create data synchronization job (daily/weekly)
10. Add climate data endpoints to API

**ERA5 Setup:**
```bash
# Install ERA5 client
npm install cds-api

# Create configuration file
cat > ~/.cdsapirc << EOF
url: https://cds.climate.copernicus.eu/api/v2
key: YOUR_UID:YOUR_API_KEY
EOF
```

**Database Schema:**
```sql
-- Run this migration
CREATE TABLE climate_data (
  id SERIAL PRIMARY KEY,
  location_uid VARCHAR(11),
  date DATE NOT NULL,
  temperature_mean DECIMAL(5,2),
  temperature_min DECIMAL(5,2),
  temperature_max DECIMAL(5,2),
  precipitation DECIMAL(7,2),
  humidity DECIMAL(5,2),
  wind_speed DECIMAL(5,2),
  source VARCHAR(50) DEFAULT 'ERA5',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(location_uid, date)
);

CREATE INDEX idx_climate_location_date ON climate_data(location_uid, date);
```

**Deliverables:**
- Historical climate data (2024-2025) ingested
- Climate visualization dashboard
- Correlation analysis tools
- Automated data updates

### Phase 6: Forecasting Model Development (Week 7-8)

**Goal:** Build and train disease forecasting models

**Tasks:**
1. Set up Python environment for ML (if using Python) or TensorFlow.js
2. Create feature engineering pipeline
3. Implement SARIMA model
4. Implement XGBoost model
5. Create model training pipeline
6. Develop model evaluation framework
7. Build ensemble predictor
8. Create prediction interval calculator
9. Implement model persistence/loading
10. Create forecast API endpoints
11. Build forecast visualization components
12. Add confidence intervals to charts
13. Implement contributing factors analysis
14. Create model retraining scheduler
15. Add model performance monitoring

**ML Stack Options:**

**Option A: Python Backend (Recommended)**
```bash
# Install Python dependencies
pip install numpy pandas scikit-learn xgboost statsmodels prophet tensorflow

# Create Python microservice
mkdir server/ml-service
cd server/ml-service
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn
```

**Option B: Node.js ML**
```bash
npm install @tensorflow/tfjs-node ml-regression node-ml
```

**API Endpoints:**
```
POST /api/forecast/train
  - Trigger model training

GET /api/forecast/:disease/:location?horizon=4
  - Get forecasts for disease at location

GET /api/forecast/performance
  - Model performance metrics

POST /api/forecast/evaluate
  - Evaluate on test set
```

**Deliverables:**
- Trained forecasting models for all diseases
- Forecast API
- Prediction visualization
- Model evaluation dashboard
- Automated retraining pipeline

### Phase 7: Advanced Features (Week 9-10)

**Goal:** Add advanced analytics, alerts, and interventions

**Tasks:**
1. Implement automated alert system
2. Create alert notification service (email/SMS)
3. Build intervention tracking system
4. Add stock/supply management
5. Create data quality dashboard
6. Implement report generation (PDF)
7. Add user authentication and roles
8. Create admin panel for configuration
9. Implement data export/import tools
10. Add audit logging
11. Create API rate limiting
12. Implement caching layer (Redis)
13. Add real-time updates (WebSocket)
14. Build mobile-responsive views
15. Performance optimization

**Components:**
```
src/components/advanced/
  ├── AlertManagement.tsx
  ├── InterventionTracker.tsx
  ├── StockManagement.tsx
  ├── DataQualityDashboard.tsx
  └── ReportGenerator.tsx
```

**Deliverables:**
- Alert system with notifications
- Intervention tracking
- Data quality monitoring
- Report generation
- Admin panel

### Phase 8: Testing & Deployment (Week 11-12)

**Goal:** Comprehensive testing and production deployment

**Tasks:**
1. Write unit tests for backend services
2. Write integration tests for API
3. Create frontend component tests
4. Implement end-to-end tests
5. Perform load testing
6. Security audit
7. Create deployment scripts
8. Set up CI/CD pipeline
9. Configure production environment
10. Database optimization and indexing
11. Create backup and recovery procedures
12. Write user documentation
13. Create deployment guide
14. Conduct user acceptance testing
15. Production deployment

**Testing Stack:**
```bash
npm install -D jest supertest @testing-library/react playwright
```

**Deployment Options:**

**Option A: Docker**
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

**Option B: PM2**
```bash
npm install -g pm2
pm2 start server/dist/index.js --name slewars-api
pm2 start npm --name slewars-web -- run dev
```

**Deliverables:**
- Test coverage > 80%
- Deployed production system
- User documentation
- Deployment playbook
- Monitoring setup

---

## Technical Specifications

### Technology Stack

**Backend:**
- **Runtime:** Node.js 18+
- **Framework:** Express 5
- **Database:** PostgreSQL 14+ (DHIS2 database)
- **ORM:** Raw SQL with pg driver
- **Validation:** Zod
- **Logging:** Pino
- **Caching:** Node-cache (in-memory) or Redis
- **ML:** Python (FastAPI microservice) or TensorFlow.js

**Frontend:**
- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **Charts:** Recharts or Visx
- **Maps:** Mapbox GL JS, Deck.gl
- **State Management:** React Context API
- **HTTP Client:** Axios

**Machine Learning:**
- **Python:** NumPy, Pandas, Scikit-learn, XGBoost, Statsmodels
- **Time Series:** SARIMA, Prophet, LSTM
- **Climate API:** CDS API (ERA5)

**DevOps:**
- **Version Control:** Git
- **CI/CD:** GitHub Actions or GitLab CI
- **Containerization:** Docker
- **Process Manager:** PM2
- **Monitoring:** Prometheus + Grafana

### Database Schema Extensions

**Additional Tables to Create:**

```sql
-- Climate data
CREATE TABLE climate_data (
  id SERIAL PRIMARY KEY,
  location_uid VARCHAR(11),
  date DATE NOT NULL,
  temperature_mean DECIMAL(5,2),
  temperature_min DECIMAL(5,2),
  temperature_max DECIMAL(5,2),
  precipitation DECIMAL(7,2),
  humidity DECIMAL(5,2),
  wind_speed DECIMAL(5,2),
  source VARCHAR(50) DEFAULT 'ERA5',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(location_uid, date)
);

-- Forecasts
CREATE TABLE forecasts (
  id SERIAL PRIMARY KEY,
  disease VARCHAR(100) NOT NULL,
  location_uid VARCHAR(11) NOT NULL,
  forecast_date DATE NOT NULL,
  target_date DATE NOT NULL,
  predicted_cases INTEGER,
  lower_bound INTEGER,
  upper_bound INTEGER,
  confidence DECIMAL(5,4),
  risk_level VARCHAR(20),
  model_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(disease, location_uid, forecast_date, target_date)
);

-- Alerts
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  disease VARCHAR(100) NOT NULL,
  location_uid VARCHAR(11) NOT NULL,
  alert_date DATE NOT NULL,
  severity VARCHAR(20), -- CRITICAL, WARNING, NORMAL
  cases INTEGER,
  threshold INTEGER,
  percent_above_threshold DECIMAL(7,2),
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, RESOLVED, DISMISSED
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Interventions
CREATE TABLE interventions (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES alerts(id),
  intervention_type VARCHAR(100),
  location_uid VARCHAR(11),
  start_date DATE,
  end_date DATE,
  target_population INTEGER,
  reached_population INTEGER,
  cost DECIMAL(12,2),
  status VARCHAR(20), -- PLANNED, ONGOING, COMPLETED, CANCELLED
  notes TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Model performance tracking
CREATE TABLE model_performance (
  id SERIAL PRIMARY KEY,
  disease VARCHAR(100),
  location_uid VARCHAR(11),
  model_type VARCHAR(50),
  evaluation_date DATE,
  mae DECIMAL(10,2),
  rmse DECIMAL(10,2),
  mape DECIMAL(10,4),
  r_squared DECIMAL(10,4),
  training_data_size INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_climate_location_date ON climate_data(location_uid, date);
CREATE INDEX idx_forecasts_disease_location ON forecasts(disease, location_uid, target_date);
CREATE INDEX idx_alerts_disease_location ON alerts(disease, location_uid, alert_date);
CREATE INDEX idx_interventions_alert ON interventions(alert_id);
CREATE INDEX idx_model_performance_disease ON model_performance(disease, evaluation_date);
```

### API Endpoints Reference

**Base URL:** `http://localhost:4000/api`

```
GET    /health                                    - Health check
GET    /overview                                  - Dashboard overview

GET    /diseases                                  - List all diseases with data
GET    /diseases/:disease/summary                 - Disease summary stats
GET    /diseases/:disease/timeseries              - Time series data
GET    /diseases/:disease/locations               - Cases by location
GET    /diseases/:disease/facilities              - Facility-level data

GET    /locations                                 - Org unit hierarchy
GET    /locations/:uid                            - Location details
GET    /locations/:uid/diseases                   - Diseases at location
GET    /locations/:uid/timeseries                 - Time series for location

GET    /analytics/outbreak-detection              - Current outbreaks
GET    /analytics/trends                          - Disease trends
GET    /analytics/correlations                    - Climate correlations

GET    /climate/:location/:startDate/:endDate     - Climate data
POST   /climate/sync                              - Sync ERA5 data

GET    /forecast/:disease/:location               - Get forecasts
POST   /forecast/train                            - Train models
GET    /forecast/performance                      - Model metrics

GET    /alerts                                    - Active alerts
POST   /alerts                                    - Create alert
PUT    /alerts/:id/resolve                        - Resolve alert

GET    /interventions                             - List interventions
POST   /interventions                             - Create intervention
PUT    /interventions/:id                         - Update intervention

GET    /data-quality                              - Completeness metrics
GET    /data-quality/facilities                   - Facility reporting status

POST   /export/csv                                - Export data as CSV
POST   /export/pdf                                - Generate PDF report
```

### Configuration Files

**Country Configuration** (`server/config/country-config.json`):
```json
{
  "sierra-leone": {
    "id": "sierra-leone",
    "name": "Sierra Leone",
    "uid": "ImspTQPwCqd",
    "population": 8420641,
    "currency": "SLL",
    "timezone": "Africa/Freetown",
    "coordinates": {
      "lat": 8.460555,
      "lon": -11.779889
    },
    "diseases": [
      {
        "id": "malaria",
        "name": "Malaria",
        "dataElements": {
          "cases": "vq2qO3eTrNi",
          "deaths": "r6nrJANOqMw",
          "inpatient": "p4K11MFEWtw",
          "treatment": "AFM5H0wNq3t"
        },
        "threshold": {
          "type": "statistical",
          "method": "mean_plus_2sd"
        },
        "priority": 1
      },
      {
        "id": "measles",
        "name": "Measles",
        "dataElements": {
          "cases": "YazgqXbizv1",
          "deaths": "f7n9E0hX8qk",
          "newCases": "GCvqIM3IzN0"
        },
        "threshold": {
          "type": "fixed",
          "value": 50
        },
        "priority": 2
      }
      // ... more diseases
    ],
    "districts": [
      {
        "id": "bo",
        "name": "Bo",
        "uid": "O6uvpzGd5pu",
        "population": 575478
      }
      // ... more districts
    ]
  }
}
```

### Performance Optimization

**Database Optimizations:**
1. Create indexes on frequently queried columns
2. Use materialized views for complex aggregations
3. Implement query caching
4. Use connection pooling
5. Optimize JOIN operations

**API Optimizations:**
1. Implement response caching (Redis)
2. Use compression (gzip)
3. Implement pagination for large datasets
4. Use data aggregation at database level
5. Implement rate limiting

**Frontend Optimizations:**
1. Code splitting and lazy loading
2. Image optimization
3. Use virtual scrolling for large tables
4. Debounce user inputs
5. Implement service workers for offline support

### Security Considerations

1. **Authentication:** JWT-based auth with refresh tokens
2. **Authorization:** Role-based access control (RBAC)
3. **Data Protection:** Encrypt sensitive data at rest
4. **API Security:** Rate limiting, CORS, input validation
5. **SQL Injection Prevention:** Use parameterized queries
6. **XSS Prevention:** Sanitize user inputs
7. **CSRF Protection:** Use CSRF tokens
8. **HTTPS:** Enforce SSL/TLS in production
9. **Audit Logging:** Log all data access and modifications
10. **Regular Updates:** Keep dependencies updated

---

## Deployment Guide

### Prerequisites

```bash
# System requirements
- Node.js 18+ (with npm)
- PostgreSQL 17+
- Python 3.9+ (for ML service)
- Git
- 4GB RAM minimum
- 20GB disk space
```

### Installation Steps

#### 1. Clone Repository
```bash
git clone <repository-url>
cd slewars
```

#### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (for ML service)
cd server/ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

#### 3. Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env
```

**Required .env variables:**
```env
NODE_ENV=production
PORT=4000
DASHBOARD_DATA_SOURCE=postgres

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=dhis2SierraLeoneDemo
POSTGRES_USER=
POSTGRES_PASSWORD=

# ERA5 Climate Data
ERA5_API_KEY=YOUR_CDS_API_KEY #Read .env file and find the key
ERA5_API_URL=https://cds.climate.copernicus.eu/api/v2

# Optional
REDIS_URL=redis://localhost:6379
```

#### 4. Database Setup
```bash
# Run migrations (create additional tables)
npm run db:migrate

# Verify connection
npm run db:check
```

#### 5. Initial Data Load
```bash
# Fetch historical climate data
npm run climate:sync -- --start=2024-01-01 --end=2025-11-15

# Generate initial forecasts
npm run forecast:init
```

#### 6. Build Application
```bash
# Build backend
npm run server:build

# Build frontend
npm run build
```

#### 7. Start Services
```bash
# Option A: Development
npm run dev:full  # Starts both backend and frontend

# Option B: Production with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'slewars-api',
      script: './server/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    },
    {
      name: 'slewars-ml',
      script: './server/ml-service/main.py',
      interpreter: 'python3',
      env: {
        PYTHONPATH: './server/ml-service'
      }
    }
  ]
};
```

#### 8. Verify Installation
```bash
# Check backend health
curl http://localhost:4000/api/health

# Access frontend
open http://localhost:3000
```

### Production Deployment

**Using Docker:**
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: dhis2SierraLeoneDemo
      POSTGRES_USER: dhis
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      PORT: 4000
      POSTGRES_HOST: postgres
      REDIS_URL: redis://redis:6379
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - redis

  ml-service:
    build:
      context: ./server/ml-service
      dockerfile: Dockerfile
    environment:
      PYTHONPATH: /app
    ports:
      - "8000:8000"
    depends_on:
      - postgres

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    ports:
      - "3000:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

### Monitoring Setup

**Prometheus Configuration:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'slewars-api'
    static_configs:
      - targets: ['localhost:4000']
```

**Grafana Dashboard:**
- Import pre-built dashboard: `dashboards/grafana-dashboard.json`

### Backup Strategy

```bash
# Daily database backup
0 2 * * * pg_dump dhis2SierraLeoneDemo | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz

# Weekly full backup
0 3 * * 0 tar -czf /backups/full_$(date +\%Y\%m\%d).tar.gz /app /backups/db_*.sql.gz
```

### Troubleshooting

**Issue: Cannot connect to PostgreSQL**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -h localhost -U dhis -d dhis2SierraLeoneDemo

# Check .env configuration
cat .env | grep POSTGRES
```

**Issue: Climate data fetch failing**
```bash
# Verify ERA5 API credentials
cat ~/.cdsapirc

# Test API connection
curl -u UID:API_KEY https://cds.climate.copernicus.eu/api/v2
```

**Issue: Forecast model errors**
```bash
# Check Python dependencies
pip list | grep -E 'numpy|pandas|scikit-learn|xgboost'

# Retrain models
npm run forecast:train -- --force
```

---

## Maintenance & Updates

### Regular Tasks

**Daily:**
- Monitor system health (API, database)
- Check alert generation
- Verify data synchronization
- Review error logs

**Weekly:**
- Update climate data
- Retrain forecasting models
- Review model performance
- Check data quality metrics
- Database maintenance (VACUUM, ANALYZE)

**Monthly:**
- Full model retraining with hyperparameter tuning
- Performance optimization review
- Security updates
- User feedback review
- Generate monthly report

**Quarterly:**
- Comprehensive system audit
- Model architecture review
- Feature prioritization
- Stakeholder presentation

---

## Future Enhancements

### Short-term (3-6 months)
1. Mobile app (React Native)
2. SMS alert system
3. WhatsApp integration
4. Offline mode support
5. Multi-language support (French, local languages)
6. Advanced report templates
7. Integration with other health systems
8. API for third-party access

### Medium-term (6-12 months)
1. Deep learning models (LSTM, Transformer)
2. Satellite imagery integration
3. Social media surveillance (Twitter/X trends)
4. Real-time case reporting (mobile forms)
5. Supply chain optimization
6. Contact tracing module
7. Genomic surveillance integration
8. Economic impact modeling

### Long-term (12+ months)
1. Multi-country expansion
2. WHO EWARS integration
3. Predictive resource allocation
4. AI-powered recommendations
5. Blockchain for data integrity
6. Federated learning across countries
7. Virtual assistant (chatbot)
8. Augmented reality for field workers

---

## Appendix

### A. Key DHIS2 UIDs Reference

**Diseases (IDSR Data Elements):**
- Malaria: `vq2qO3eTrNi`
- Measles: `YazgqXbizv1`
- Typhoid: (part of aggregate data)
- Yellow Fever: `noIzB569hTM`
- Cholera: `UsSUX0cpKsH`
- Lassa Fever: (aggregate data elements)

**Deaths (< 5 years):**
- Malaria: `r6nrJANOqMw`
- Measles: `f7n9E0hX8qk`
- Typhoid: `Yy9NtNfwYZJ`
- Yellow Fever: `USBq0VHSkZq`
- Cholera: `eY5ehpbEsB7`

**Organization Units:**
- Sierra Leone (Country): `ImspTQPwCqd`
- Bo District: `O6uvpzGd5pu`
- Bombali: `fdc6uOvgoji`
- Bonthe: `lc3eMKXaEfw`
- (See exploration output for complete list)

### B. Useful SQL Queries

**1. Total cases by disease (last 30 days):**
```sql
SELECT
  de.name,
  SUM(CAST(dv.value AS INTEGER)) as cases
FROM datavalue dv
JOIN dataelement de ON dv.dataelementid = de.dataelementid
JOIN period p ON dv.periodid = p.periodid
WHERE dv.deleted = false
  AND p.enddate >= NOW() - INTERVAL '30 days'
  AND dv.value ~ '^[0-9]+$'
GROUP BY de.name
ORDER BY cases DESC;
```

**2. District-level case distribution:**
```sql
SELECT
  ou.name as district,
  de.name as disease,
  SUM(CAST(dv.value AS INTEGER)) as cases
FROM datavalue dv
JOIN dataelement de ON dv.dataelementid = de.dataelementid
JOIN organisationunit ou ON dv.sourceid = ou.organisationunitid
WHERE dv.deleted = false
  AND ou.hierarchylevel = 2
  AND dv.value ~ '^[0-9]+$'
GROUP BY ou.name, de.name
ORDER BY ou.name, cases DESC;
```

**3. Weekly trend:**
```sql
SELECT
  DATE_TRUNC('week', p.startdate) as week,
  de.name as disease,
  SUM(CAST(dv.value AS INTEGER)) as cases
FROM datavalue dv
JOIN dataelement de ON dv.dataelementid = de.dataelementid
JOIN period p ON dv.periodid = p.periodid
WHERE dv.deleted = false
  AND p.startdate >= NOW() - INTERVAL '12 weeks'
  AND dv.value ~ '^[0-9]+$'
GROUP BY week, de.name
ORDER BY week, de.name;
```

### C. ERA5 Climate Variables

**Temperature:**
- `2m_temperature` - Air temperature at 2m above ground (K)
- Convert to Celsius: T(°C) = T(K) - 273.15

**Precipitation:**
- `total_precipitation` - Total precipitation (m)
- Convert to mm: P(mm) = P(m) × 1000

**Humidity:**
- `relative_humidity` - Relative humidity at 2m (%)
- Or use `2m_dewpoint_temperature` to calculate

**Wind:**
- `10m_u_component_of_wind` - Eastward wind (m/s)
- `10m_v_component_of_wind` - Northward wind (m/s)
- Speed = √(u² + v²)

### D. Contact Information

**Technical Support:**
- Email: support@slewars.org
- Documentation: https://docs.slewars.org
- GitHub Issues: https://github.com/org/slewars/issues

**Data Sources:**
- DHIS2 Sierra Leone: https://sl.dhis2.org
- ERA5 Climate: https://cds.climate.copernicus.eu
- WHO EWARS: https://www.who.int/teams/epidemic-and-pandemic-prevention-and-preparedness/early-warning-systems

---

**End of Implementation Plan**

*This document should be updated as the project evolves. Version control: Track changes in Git.*

**Next Steps:**
1. Review and approve this plan
2. Set up project management board (Jira/Trello)
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews
5. Set up communication channels (Slack/Discord)
