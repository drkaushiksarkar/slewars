# New User Setup Guide

## Quick Start for Setting Up the Dashboard

If you're setting up this Early Warning System for the first time, follow these steps:

## 1. Database Setup
Ensure PostgreSQL is running with the DHIS2 database:
```bash
psql -h localhost -p 5432 -d dhis2SierraLeoneDemo
```

## 2. Climate Data Setup (IMPORTANT!)

### Get CDS API Key
1. Sign up at: https://cds.climate.copernicus.eu/register
2. Get your API key from: https://cds.climate.copernicus.eu/how-to-api
3. Accept ERA5 license at: https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels

### Configure Environment
Create/update `.env` file in project root:
```bash
# Add these lines
CDS_API_KEY=your-cds-api-key-here
CDS_API=https://cds.climate.copernicus.eu/api
```

### Auto-Download Climate Data
```bash
cd server/ml-service
./venv/bin/python setup_climate_data.py
```

This will:
- Download 2 years of ERA5 climate data (2023-2024)
- Store in PostgreSQL database
- Cache NetCDF files for reuse (~6-8 MB)
- Take ~10-15 minutes

### Verify Data
```bash
./venv/bin/python setup_climate_data.py --check-only
```

Expected output:
```
Database Records: 9516+
Date Range: 2023-01-01 to 2024-12-31
Districts: 13/13
Cached Files: 2
```

## 3. Install Dependencies

### Backend
```bash
cd server
npm install
```

### ML Service
```bash
cd server/ml-service
python3 -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Frontend
```bash
npm install
```

## 4. Start Services

### Terminal 1 - Backend Server
```bash
cd server
npm run dev
```

### Terminal 2 - ML Service
```bash
cd server/ml-service
source venv/bin/activate
python main.py
```

### Terminal 3 - Frontend
```bash
npm run dev
```

## 5. Access Dashboard

Open browser: http://localhost:5173

## Important Notes

### Climate Data Files
- Location: `server/ml-service/data/`
- Files are cached to avoid re-downloading
- Safe to commit to git (small size: ~3-4 MB per year)
- Can be shared with team members

### If Data Already Exists
If someone on your team has already downloaded the data:
1. Copy `server/ml-service/data/*.nc` files from them
2. Import database dump or run setup script
3. No need to download again!

### Troubleshooting

**"CDS_API_KEY not found"**
- Add your API key to `.env` file

**"License not accepted"**
- Visit ERA5 dataset page and accept terms

**"Download failed"**
- CDS server may be busy, wait and retry
- Download smaller date ranges (6 months)

**"No data in database"**
- Run setup script: `python setup_climate_data.py`
- Check PostgreSQL connection in `.env`

## Documentation

- Climate Data: `CLIMATE_DATA_SETUP.md`
- ML Modeling: `server/ml-service/README_CLIMATE_DATA.md`
- API Docs: Check `/api` endpoints

## Support

For issues:
1. Check `CLIMATE_DATA_SETUP.md`
2. Review logs in terminal
3. Verify `.env` configuration
4. Contact development team

---

**Important**: The climate data setup is required for the system to work properly. Don't skip it!
