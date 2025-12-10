# Troubleshooting Guide - Pages Not Loading

## Diagnosis Summary

✅ **What's Working:**
- Database connection to AWS RDS PostgreSQL
- All DHIS2 tables exist and are populated with data
- Disease data element UIDs are correct and exist in the database
- Database queries for diseases, locations, and analytics all work correctly
- Frontend pages (DiseaseAnalysis, LocationAnalysis, etc.) are present in the codebase

## Most Likely Issues

Based on the diagnosis, here are the most likely causes for pages not loading:

### 1. Frontend-Backend Connection Issue (Most Likely)

The frontend might not be able to reach the backend API.

**Check this on your Lightsail instance:**

```bash
# SSH into your Lightsail instance
ssh -i your-key.pem ubuntu@YOUR_IP

cd ~/slewars

# Check if backend is running
pm2 status

# Check backend logs for errors
pm2 logs ewars-backend --lines 50

# Test if backend is responding
curl http://localhost:4000/api/health
curl http://localhost:4000/api/diseases

# Check if Nginx is proxying correctly
curl http://localhost/api/health
curl http://localhost/api/diseases
```

**Expected behavior:**
- `pm2 status` should show `ewars-backend` as `online`
- `curl http://localhost:4000/api/health` should return JSON with database status
- `curl http://localhost:4000/api/diseases` should return JSON array of diseases

### 2. Browser Console Errors (Client-Side)

The pages might have JavaScript errors in the browser.

**To check:**

1. Open your dashboard in the browser
2. Press F12 to open Developer Tools
3. Go to the "Console" tab
4. Try to navigate to a failing page (e.g., Disease Analysis or Location Analysis)
5. Look for red error messages

**Common errors to look for:**
- `Failed to fetch` - Backend not responding
- `Network Error` - CORS or connection issues
- `404 Not Found` - API endpoint doesn't exist
- `500 Internal Server Error` - Backend error

### 3. CORS Configuration Issue

If you see CORS errors in the browser console, the backend might not be allowing requests from the frontend.

**Check server CORS configuration:**

```bash
# On your Lightsail instance
cd ~/slewars
grep -r "cors" server/src/

# Check if CORS is enabled in the backend
cat server/src/index.ts | grep -A5 cors
```

### 4. Build Issues

The frontend might not be built correctly.

**Rebuild on your Lightsail instance:**

```bash
cd ~/slewars

# Rebuild frontend
npm run build

# Restart services
pm2 restart ewars-backend
pm2 logs --lines 30
```

## Detailed Debugging Steps

### Step 1: Verify Backend API Endpoints

On your Lightsail instance, test each API endpoint:

```bash
# Test diseases endpoint
curl http://localhost:4000/api/diseases
# Should return: {"success":true,"data":[...diseases...],"count":X}

# Test disease summary
curl "http://localhost:4000/api/diseases/malariaIDSR/summary"
# Should return: {"success":true,"data":{...summary data...}}

# Test locations endpoint
curl http://localhost:4000/api/locations
# Should return: {"success":true,"data":[...locations...],"count":X}

# Test analytics endpoint
curl "http://localhost:4000/api/analytics/overview"
# Should return: {"success":true,"data":{...metrics...}}
```

If any of these fail:
1. Check `pm2 logs ewars-backend` for errors
2. Verify `.env` file has correct database credentials
3. Test database connection: `node check_database.js` (from this repo)

### Step 2: Check Frontend API Calls

The frontend might be calling the wrong API URL.

**Check vite.config.js:**

```bash
cd ~/slewars
cat vite.config.js | grep -A10 proxy
```

Expected proxy configuration:
```javascript
proxy: {
  '/api': {
    target: 'http://localhost:4000',
    changeOrigin: true,
  }
}
```

### Step 3: Check Browser Network Tab

1. Open dashboard in browser
2. Press F12 → Network tab
3. Click on a failing page (e.g., Disease Analysis)
4. Look at the API calls:
   - Are they being made?
   - What's the status code? (200 = OK, 404 = Not Found, 500 = Server Error)
   - What's the response?

### Step 4: Check PM2 Logs in Real-Time

```bash
# Watch logs as you navigate the dashboard
pm2 logs ewars-backend --raw --lines 100

# In another terminal or after this, navigate to failing pages in browser
# Look for errors like:
# - Database query errors
# - "Cannot read property of undefined" errors
# - TypeScript compilation errors
```

## Quick Fixes

### Fix 1: Restart All Services

```bash
cd ~/slewars
pm2 restart all
pm2 logs --lines 30
```

### Fix 2: Clear Build and Rebuild

```bash
cd ~/slewars

# Clean everything
rm -rf dist
rm -rf server/dist

# Rebuild
npm run build:full
echo '{"type":"commonjs"}' > server/dist/package.json

# Restart
pm2 restart all
```

### Fix 3: Check and Fix Environment Variables

```bash
# Verify .env file
cat .env

# Make sure these are set:
# NODE_ENV=production
# PORT=4000
# POSTGRES_HOST=dhis2sierraleonedemo.cihii8am29pu.us-east-1.rds.amazonaws.com
# POSTGRES_PORT=5432
# POSTGRES_DB=dhis2sierraleonedemo
# POSTGRES_USER=postgres
# POSTGRES_PASSWORD=Imacssl123
# DASHBOARD_DATA_SOURCE=postgres

# After changing .env, restart with updated env
pm2 restart all --update-env
```

### Fix 4: Enable Detailed Logging

Temporarily enable more detailed logging to see what's happening:

```bash
cd ~/slewars

# Add this to .env
echo "LOG_LEVEL=debug" >> .env

# Restart
pm2 restart ewars-backend --update-env

# Now check logs
pm2 logs ewars-backend --lines 100
```

## Expected API Responses

### GET /api/diseases
```json
{
  "success": true,
  "data": [
    {
      "id": "malariaIDSR",
      "name": "IDSR Malaria",
      "uid": "vq2qO3eTrNi",
      "category": "Vector-Borne"
    },
    ...
  ],
  "count": 30
}
```

### GET /api/diseases/:id/summary
```json
{
  "success": true,
  "data": {
    "disease": "IDSR Malaria",
    "totalCases": 24306,
    "affectedFacilities": 368,
    "reportingPeriods": 234,
    "earliestDate": "2019-01-01",
    "latestDate": "2024-12-31",
    "avgCasesPerPeriod": 103.87,
    "peakCases": 500
  }
}
```

### GET /api/locations
```json
{
  "success": true,
  "data": [
    {
      "organisationunitid": 1,
      "uid": "ImspTQPwCqd",
      "name": "Sierra Leone",
      "hierarchylevel": 1,
      "path": "/ImspTQPwCqd"
    },
    ...
  ],
  "count": 1332
}
```

## Still Having Issues?

If pages are still not loading after trying the above:

1. **Collect information:**
   ```bash
   # On Lightsail instance
   pm2 status > debug_info.txt
   pm2 logs ewars-backend --lines 100 >> debug_info.txt
   curl -v http://localhost:4000/api/diseases >> debug_info.txt 2>&1
   cat .env | grep -v PASSWORD >> debug_info.txt
   ```

2. **Check browser console** (F12) and copy any error messages

3. **Provide the following:**
   - What page you're trying to access
   - Error message in browser console
   - Output from `debug_info.txt`
   - Output from `pm2 logs ewars-backend --lines 50`

## Database-Specific Notes

Your database has been verified to contain:
- ✅ 1,037 data elements (disease indicators)
- ✅ 4,933,875 data values (actual case reports)
- ✅ 1,332 organization units (locations)
- ✅ 384 time periods
- ✅ All 14 specific disease UIDs the app needs

The database is NOT the issue. The problem is likely in the backend server, API connection, or frontend build.

## Configuration Note

Your .env file shows `DASHBOARD_DATA_SOURCE=postgres`. This is correct for direct database access.

However, the frontend Dashboard.jsx (line 44) has this code:
```javascript
React.useEffect(() => {
  if (dataSource !== "dhis2") {
    setDataSource("dhis2");
  }
}, []);
```

This means the frontend is defaulting to "dhis2" mode regardless of your .env setting. This shouldn't affect the new pages (Disease Analysis, Location Analysis) which query the database directly, but it's worth noting.

## Contact

If you need further help, please provide:
1. Browser console errors (F12 → Console tab)
2. Backend logs (`pm2 logs ewars-backend --lines 50`)
3. Network tab responses (F12 → Network tab, showing failed requests)
