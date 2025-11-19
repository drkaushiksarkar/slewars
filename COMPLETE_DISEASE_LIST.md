# Complete Disease Catalog - DHIS2 Sierra Leone Database

> **✏️ SIMPLIFIED VERSION:** Malaria now uses single IDSR entry instead of 6 treatment variants for better user experience

## Summary Statistics
- **Total Diseases Identified:** 36 diseases with case data
- **Data Records:** 4.9+ million records
- **Total Cases:** 3,612,583 cases (simplified, using IDSR surveillance data)
- **Date Range:** 2015-2025
- **Reporting Facilities:** 1,166 health facilities across 4 administrative levels

---

## Disease Categories & Complete List

### 1. **Vector-Borne Diseases** (Diseases transmitted by insects/vectors)

| Disease | UID (Cases) | Total Cases | Facilities | Category |
|---------|-------------|-------------|------------|----------|
| **Malaria (IDSR)** | vq2qO3eTrNi | **24,687** | 368 | Surveillance |
| **Yellow Fever (IDSR)** | noIzB569hTM | **24,850** | 368 | Surveillance |
| **Yellow Fever** | XWU1Huh0Luy | **966** | 76 | Primary Care |
| **Plague (IDSR)** | HS9zqaBdOQ4 | **24,758** | 368 | Surveillance |

**Total Vector-Borne Cases:** ~75,261

**Note:** Malaria treatment-level data (6 variants totaling 2.8M cases) is available in database but excluded from dashboard for simplicity. Users see aggregate IDSR surveillance data.

---

### 2. **Water-Borne & Diarrheal Diseases** (Spread through contaminated water/food)

| Disease | UID (Cases) | Total Cases | Facilities | Category |
|---------|-------------|-------------|------------|----------|
| **Diarrhoea (All types)** | Multiple | **439,265** | 1,166 | Water-borne |
| - Diarrhoea without severe dehydration | U3jd8zVFKxY | 333,124 | 1,091 | Primary |
| - Diarrhoea with blood (Dysentery) | nymNRxmnj4z | 60,341 | 1,007 | Primary |
| - Diarrhoea with severe dehydration | UfZcabJUVcZ | 45,800 | 915 | Primary |
| **Cholera** | | **24,507** | | Water-borne |
| - IDSR Cholera | UsSUX0cpKsH | 24,507 | 368 | Surveillance |
| **Typhoid** | | **34,514** | | Water-borne |
| - Typhoid fever new | Cj5rTc9nEvl | 34,514 | 495 | Primary |
| **Dysentery (Deaths)** | Ix2HsbDMLea | 19 deaths | - | Water-borne |

**Total Water-Borne Cases:** ~498,286

---

### 3. **Air-Borne & Respiratory Diseases** (Spread through respiratory droplets)

| Disease | UID (Cases) | Total Cases | Facilities | Category |
|---------|-------------|-------------|------------|----------|
| **Acute Respiratory Infections (ARI)** | Multiple | **1,339,834** | 1,166 | Air-borne |
| - ARI treated with antibiotics (pneumonia) | iKGjnOOaPlE | 1,010,742 | 1,087 | Primary |
| - ARI treated without antibiotics (cough) | Cm4XUw6VAxv | 329,092 | 986 | Primary |
| **Measles** | | **38,160** | | Air-borne |
| - IDSR Measles (surveillance) | YazgqXbizv1 | 25,038 | 368 | Surveillance |
| - Measles new | GCvqIM3IzN0 | 13,122 | 507 | Primary |
| **Tuberculosis** | z9dYcQ2DlBG | **9,296** | 308 | Air-borne |
| **Meningitis** | | **2,380** | | Air-borne |
| - Meningitis/severe bacterial infection | JFFUt8yR2iW | 2,380 | 177 | Primary |

**Total Air-Borne Cases:** ~1,389,670

---

### 4. **Viral Hemorrhagic Fevers** (Severe viral infections with bleeding)

| Disease | UID (Cases) | Total Cases | Facilities | Category |
|---------|-------------|-------------|------------|----------|
| **Lassa Fever** | NCteyX2xpMf | **222** | 21 | Viral Hemorrhagic |
| **Yellow Fever** | (see Vector-borne) | 25,816 | - | Viral Hemorrhagic |

**Total Viral Hemorrhagic Cases:** ~26,038

---

### 5. **Neglected Tropical Diseases (NTDs)** (Endemic diseases in tropical regions)

| Disease | UID (Cases) | Total Cases | Facilities | Category |
|---------|-------------|-------------|------------|----------|
| **Schistosomiasis** | Y7Oq71I3ASg | **13,484** | 324 | NTD - Parasitic |
| **Worm Infestation** | Usk9Asj5DED | **189,058** | 1,043 | NTD - Parasitic |
| **Onchocerciasis** | DrEOxW8mbbh | **2,104** | 128 | NTD - Parasitic |
| **Leprosy** | zAW6b5Owalk | **786** | 104 | NTD - Bacterial |
| **Yaws** | FF3Ev33BuCh | **1,386** | 112 | NTD - Bacterial |

**Total NTD Cases:** ~206,818

---

### 6. **Vaccine-Preventable Diseases** (Can be prevented through immunization)

| Disease | UID (Cases) | Total Cases | Facilities | Category |
|---------|-------------|-------------|------------|----------|
| **Measles** | (see Air-borne) | 38,160 | - | Vaccine-Preventable |
| **Tetanus** | Multiple | **1,214** | | Vaccine-Preventable |
| - Tetanus (not incl. 0-28 days) | Uoj2wmnr5Dw | 1,044 | 52 | Primary |
| - Neonatal Tetanus | wcwbN1jR0ar | 170 | 57 | Primary |
| **Acute Flaccid Paralysis (AFP)** | FQ2o8UBlcrS | **114** | 26 | Vaccine-Preventable |
| **Rabies** | | **8 deaths** | | Vaccine-Preventable |

**Total Vaccine-Preventable Cases:** ~39,488

---

### 7. **Sexually Transmitted Infections (STIs)**

| Disease | UID (Cases) | Total Cases | Facilities | Category |
|---------|-------------|-------------|------------|----------|
| **STI - Genital Discharge** | CN9Oxawn7bD | **139,810** | 1,073 | STI |
| **STI - Genital Ulcer** | IeO1sWXVyp6 | **22,698** | 708 | STI |

**Total STI Cases:** ~162,508

---

### 8. **Non-Communicable Diseases (NCDs)** (Not infectious)

| Disease | UID (Cases) | Total Cases | Facilities | Category |
|---------|-------------|-------------|------------|----------|
| **Hypertension** | UXW5hWW8dE1 | **37,386** | 920 | NCD - Cardiovascular |
| **Clinical Malnutrition** | TBbCcJfZ91x | **142,566** | 1,033 | NCD - Nutritional |
| **Anaemia** | HLPuaFB7Frw | **107,386** | 1,003 | NCD - Hematological |

**Total NCD Cases:** ~287,338

---

### 9. **Skin & Soft Tissue Infections**

| Disease | UID (Cases) | Total Cases | Facilities | Category |
|---------|-------------|-------------|------------|----------|
| **Skin Infection** | Y4cFzB4A9ZQ | **194,524** | 1,086 | Dermatological |
| **Wounds/Trauma** | FJs8ZjlQE6f | **92,848** | 1,042 | Injury |
| **Burns** | zMGEd921xd3 | **15,706** | 911 | Injury |

**Total Skin/Injury Cases:** ~303,078

---

### 10. **Eye & ENT Infections**

| Disease | UID (Cases) | Total Cases | Facilities | Category |
|---------|-------------|-------------|------------|----------|
| **Eye Infection** | BQI18TPLR7W | **73,042** | 1,069 | Ophthalmological |
| **Otitis Media (Ear infection)** | DWLCM68Q7Zl | **24,342** | 888 | ENT |

**Total Eye/ENT Cases:** ~97,384

---

### 11. **Other Diseases & Conditions**

| Disease | UID (Cases) | Total Cases | Facilities | Category |
|---------|-------------|-------------|------------|----------|
| **All Other (Miscellaneous)** | A2VfEfPflHV | **551,648** | 1,057 | Other |

---

## Disease Deaths Data (< 5 years)

| Disease | UID (Deaths) | Total Deaths | Facilities |
|---------|--------------|--------------|------------|
| **Cholera** | eY5ehpbEsB7 | 32 | - |
| **Malaria** | r6nrJANOqMw | 24 | - |
| **Measles** | f7n9E0hX8qk | 23 | - |
| **Meningitis** | MSZuQ1mTsia | 21 | - |
| **Dysentery** | Ix2HsbDMLea | 19 | - |
| **Acute Flaccid Paralysis** | FTRrcoaog83 | 18 | - |
| **Louse Borne Typhus - Relapsing fever** | NpJtsQkMTm3 | 16 | - |
| **Plague** | lXolhoWewYH | 13 | - |
| **Animal Bites - Rabid** | LjNlMTl9Nq9 | 12 | - |
| **Yellow Fever** | USBq0VHSkZq | 10 | - |
| **Rabies** | jVDAvs6kIAP | 8 | - |
| **Tetanus Neonatal** | Vp12ncSU1Av | 3 | - |
| **Tetanus Other** | hM4ya5T2AqX | 2 | - |
| **Typhoid** | Yy9NtNfwYZJ | 1 | - |

**Total Deaths Recorded:** 202 deaths (children < 5 years)

---

## Recommended Disease Grouping for Dashboard

### **Priority Surveillance Diseases (IDSR Weekly)**
For real-time outbreak detection:
1. Malaria (vq2qO3eTrNi)
2. Measles (YazgqXbizv1)
3. Cholera (UsSUX0cpKsH)
4. Yellow Fever (noIzB569hTM)
5. Plague (HS9zqaBdOQ4)

### **High Burden Diseases (Primary Care)**
Most common diseases:
1. Malaria - All forms (2.8M cases)
2. ARI/Pneumonia (1.3M cases)
3. Diarrhoeal Diseases (439K cases)
4. Worm Infestation (189K cases)
5. Skin Infections (195K cases)

### **Epidemic-Prone Diseases**
Require immediate response:
1. Cholera
2. Measles
3. Yellow Fever
4. Lassa Fever
5. Meningitis
6. Plague

### **Neglected Tropical Diseases (NTDs)**
Endemic diseases requiring sustained control:
1. Schistosomiasis
2. Onchocerciasis
3. Leprosy
4. Yaws

### **Non-Communicable Diseases**
Growing health burden:
1. Hypertension
2. Malnutrition
3. Anaemia

---

## Dashboard Design Recommendations

### **Top-Level Categories (6 Groups)**
```
1. Vector-Borne (8 diseases)
   - Malaria variants, Yellow Fever, Plague

2. Water-Borne (4 diseases)
   - Cholera, Typhoid, Dysentery, Diarrhoea types

3. Air-Borne & Respiratory (4 diseases)
   - ARI/Pneumonia, Measles, Tuberculosis, Meningitis

4. Neglected Tropical Diseases (5 diseases)
   - Schistosomiasis, Worms, Onchocerciasis, Leprosy, Yaws

5. Vaccine-Preventable (4 diseases)
   - Measles, Tetanus, AFP/Polio, Rabies

6. Other Infections & NCDs (10+ diseases)
   - STIs, Skin infections, Eye/ENT, NCDs, Injuries
```

### **Disease Dropdown Structure**
```javascript
{
  "Vector-Borne": {
    primary: ["Malaria (All)", "Yellow Fever", "Plague"],
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
  "Water-Borne": ["Cholera", "Typhoid", "Dysentery", "Diarrhoea (All)"],
  "Air-Borne": ["ARI/Pneumonia", "Measles", "Tuberculosis", "Meningitis"],
  "NTDs": ["Schistosomiasis", "Worms", "Onchocerciasis", "Leprosy", "Yaws"],
  "Vaccine-Preventable": ["Measles", "Tetanus", "AFP", "Rabies"],
  "Other": ["STIs", "Skin Infections", "Eye/ENT", "NCDs", "Injuries"]
}
```

---

## Data Quality Notes

1. **Malaria has highest data quality** - 1.2M+ records across all facilities
2. **IDSR diseases** have standardized weekly reporting (12,803 records each)
3. **NTD data** is sparser (300-600 facilities) - these are targeted programs
4. **Lassa Fever** has limited data (21 facilities) - endemic in specific regions
5. **Deaths data** is complete for children < 5 years across all diseases

---

## Implementation Priority

### **Phase 1 - Core Surveillance (Week 1)**
Implement 5 IDSR diseases + Malaria aggregated + Typhoid = **7 diseases**

### **Phase 2 - Expanded View (Week 2)**
Add 10 high-burden diseases:
- ARI/Pneumonia
- Diarrhoeal diseases (grouped)
- Measles
- Skin infections
- Worm infestation
- Clinical Malnutrition
- STIs (grouped)
- Anaemia
- Eye infections
- Wounds/Trauma

### **Phase 3 - Complete Catalog (Week 3)**
Add remaining 20+ diseases for comprehensive surveillance

### **Phase 4 - Malaria Breakdown (Week 4)**
Implement detailed Malaria treatment categories as sub-view

---

## Key Insights for Implementation

1. **Malaria dominates** - 2.8M cases (56% of all disease burden)
2. **Respiratory infections** are 2nd highest - 1.3M cases (26%)
3. **Diarrheal diseases** show 439K cases - critical for child health
4. **NTDs require targeted view** - different geographic distribution
5. **IDSR diseases need real-time alerting** - outbreak surveillance
6. **Deaths data available** - can calculate CFR (Case Fatality Rate)

**Total Disease Cases Tracked:** 3,612,583 cases (simplified)
**Unique Diseases:** 36 with significant data
**Reporting Facilities:** 1,166 across Sierra Leone
**Admin Levels:** 4 (Country → 13 Districts → 152 Chiefdoms → 1,166 Facilities)

---

End of Complete Disease Catalog
