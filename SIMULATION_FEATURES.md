# Epidemiological Simulation - Feature Documentation

## Overview
The Simulation page has been completely redesigned as a comprehensive epidemiological modeling tool with live geographic visualization. It provides real-time disease outbreak simulation using the SEIR (Susceptible-Exposed-Infected-Recovered) mathematical model.

## 🎯 Key Features Implemented

### 1. **SEIR Epidemiological Model**
- Full implementation of the SEIR compartmental model
- Real-time calculation of disease transmission dynamics
- Tracks population states: Susceptible, Exposed, Infected, Recovered, Deaths
- Dynamic R₀ (reproduction number) calculation based on interventions

### 2. **IDSR Diseases Configuration** (8 Diseases)
All diseases include realistic epidemiological parameters:

1. **Cholera**
   - R₀: 2.5
   - Incubation: 2 days
   - Mortality: 2%
   - Type: Waterborne bacterial infection

2. **Measles**
   - R₀: 15 (highly contagious)
   - Incubation: 10 days
   - Mortality: 0.2%
   - Type: Viral respiratory infection

3. **Dengue Fever**
   - R₀: 3.5
   - Incubation: 5 days
   - Mortality: 1%
   - Type: Mosquito-borne viral infection

4. **Malaria**
   - R₀: 2.0
   - Incubation: 10 days
   - Mortality: 0.3%
   - Type: Parasitic infection

5. **Yellow Fever**
   - R₀: 4.0
   - Incubation: 6 days
   - Mortality: 5%
   - Type: Viral hemorrhagic disease

6. **Meningitis**
   - R₀: 3.0
   - Incubation: 4 days
   - Mortality: 10%
   - Type: Bacterial infection

7. **COVID-19**
   - R₀: 4.5
   - Incubation: 5 days
   - Mortality: 1.5%
   - Type: Respiratory illness

8. **Typhoid Fever**
   - R₀: 2.2
   - Incubation: 10 days
   - Mortality: 1%
   - Type: Bacterial infection

### 3. **Live Geographic Visualization**
- **Interactive Map** with Mapbox integration
- **Real-time disease spread** visualization across regions
- **Dynamic heatmap** showing infection intensity (0-100%)
- **Pulsing animations** on active outbreak locations
- **Regional markers** with severity-based coloring
- **Interactive popups** showing:
  - Active case counts
  - Severity percentage
  - Outbreak status
- **Multiple map styles**: Light, Dark, Streets, Satellite
- **Color-coded legend** for disease intensity levels

### 4. **Public Health Interventions** (6 Types)
Each intervention has measurable impact on disease spread:

1. **Mass Vaccination Campaign**
   - Effectiveness: 85%
   - Duration: 30 days
   - Cost: $50,000
   - Reduces susceptibility

2. **Social Distancing**
   - Effectiveness: 50%
   - Duration: 60 days
   - Cost: $5,000
   - Reduces transmission rate

3. **Enhanced Quarantine**
   - Effectiveness: 70%
   - Duration: 45 days
   - Cost: $15,000
   - Isolates infected individuals

4. **Vector Control**
   - Effectiveness: 60%
   - Duration: 90 days
   - Cost: $20,000
   - Mosquito control for vector-borne diseases

5. **Enhanced Treatment**
   - Effectiveness: 40%
   - Duration: 90 days
   - Cost: $30,000
   - Reduces mortality and infectious period

6. **Water & Hygiene**
   - Effectiveness: 55%
   - Duration: 120 days
   - Cost: $10,000
   - Improves sanitation

### 5. **Real-Time Metrics Dashboard**
Seven key metrics displayed with live updates:
- **Susceptible Population** (Blue gradient card)
- **Exposed** (Yellow gradient card)
- **Infected** (Red gradient card)
- **Recovered** (Green gradient card)
- **Deaths** (Gray gradient card)
- **Effective R₀** (Purple gradient card)
- **Active Interventions** (Orange gradient card)

### 6. **Advanced Visualizations**

#### Disease Progression Chart (SEIR Model)
- Stacked area chart showing all population compartments
- Real-time updates as simulation runs
- Clear visualization of epidemic curve

#### Active Cases & Mortality Chart
- Line chart tracking infections and deaths
- Demonstrates intervention effectiveness
- Shows mortality impact over time

### 7. **Location-Based Filtering**
- Select specific regions or view "All Regions"
- Dynamic data fetching from location API
- Fallback to default regions if API unavailable
- Real-time regional spread simulation

### 8. **Simulation Controls**
- **Speed Control**: 0.5x, 1x, 2x, 5x, 10x speeds
- **Disease Selection**: Dropdown with all 8 IDSR diseases
- **Location Filter**: Region-specific simulation
- **Current Day Counter**: Track simulation progress
- **Play/Pause**: Full simulation control
- **Reset**: Restart simulation with new parameters

### 9. **Configurable Parameters**
Accessible via Settings modal:
- **Initial Population**: 1,000 - 10,000,000
- **Initial Infected Cases**: 1 - 10,000
- **Environmental Factors**:
  - Temperature (°C)
  - Rainfall (mm)
  - Humidity (%)
- Real-time parameter updates
- Educational information about SEIR model

### 10. **Summary Statistics**
- **Total Cases**: Cumulative case count
- **Peak Infections**: Maximum simultaneous infections
- **Case Fatality Rate**: Deaths / Total Cases
- **Attack Rate**: Total Cases / Population

### 11. **Visual Enhancements**
- **Gradient cards** for all metrics
- **Smooth animations** with Framer Motion
- **Live indicator badge** when simulation is running
- **Disease-specific color coding**
- **Responsive design** for all screen sizes
- **Dark mode support**
- **Interactive hover effects**
- **Collapsible intervention panel**

## 🎨 Design & UX Features

### Aesthetically Pleasing Elements
1. **Color Gradients**: Each metric uses beautiful gradient backgrounds
2. **Disease Branding**: Each disease has unique color and icon
3. **Animated Badges**: "LIVE" badge with pulsing animation
4. **Map Animations**: Pulsing circles on active outbreak locations
5. **Smooth Transitions**: All state changes animated
6. **Info Banners**: Rich disease information with icons
7. **Professional Typography**: Clear hierarchy and readability
8. **Shadow Effects**: Depth and dimension for cards
9. **Hover Effects**: Interactive feedback on all clickable elements
10. **Loading States**: Smooth initialization animations

### Epidemiological Accuracy
- Based on real SEIR mathematical model
- Realistic disease parameters from WHO/CDC data
- Proper compartmental transitions
- Accurate R₀ calculations
- Intervention effects based on public health literature

## 📊 How to Use

1. **Select a Disease**: Choose from 8 IDSR diseases in the dropdown
2. **Choose Location**: Filter by region or simulate all regions
3. **Configure Parameters**: Click Settings to adjust population and environmental factors
4. **Start Simulation**: Press "Start Simulation" button
5. **Deploy Interventions**: Click "Deploy Intervention" on any intervention card during simulation
6. **Observe Impact**: Watch the geographic spread and charts update in real-time
7. **Adjust Speed**: Change simulation speed from 0.5x to 10x
8. **Analyze Results**: Review summary statistics and peak infection data

## 🔬 Educational Value

This simulation serves as a training tool for:
- Understanding epidemic dynamics
- Testing intervention strategies
- Visualizing disease spread patterns
- Learning SEIR model concepts
- Evaluating public health responses
- Analyzing cost-effectiveness of interventions

## 🚀 Technical Implementation

### Technologies Used
- **React Hooks**: useState, useEffect, useRef, useMemo
- **Mapbox GL JS**: Geographic visualization
- **Recharts**: Data visualization
- **Framer Motion**: Smooth animations
- **Axios**: API communication
- **Lucide React**: Icon library
- **Tailwind CSS**: Styling

### Performance Optimizations
- useMemo for regional data calculations
- Efficient state management
- Optimized animation loops
- Background computation of SEIR equations
- Lazy rendering of map layers

## 🎯 Future Enhancements (Optional)

1. **Stochastic Models**: Add randomness to transmission
2. **Age-Structured Models**: Different disease impacts by age group
3. **Network Models**: Contact tracing visualization
4. **Historical Comparison**: Compare with real outbreak data
5. **Multi-Disease Simulation**: Simulate co-infections
6. **Scenario Comparison**: Side-by-side intervention comparison
7. **Export Reports**: PDF/Excel export of simulation results
8. **Save/Load Scenarios**: Bookmark and share simulation configurations

## 📝 Notes

- All disease parameters are based on epidemiological literature
- The SEIR model is a simplified representation of disease dynamics
- Environmental factors are displayed but not yet integrated into transmission calculations
- Regional spread uses simulated data with realistic growth patterns
- Mapbox access token is configured and working

## 🌐 Live Demo

Access the simulation at: http://localhost:3001
Navigate to: Dashboard → Simulation tab

---

**Created with Claude Code** 🤖
*Designed for epidemiological training and public health planning*
