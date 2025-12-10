# Deploy API URL Fixes to Lightsail

## What Was Fixed

All frontend components were using hardcoded `http://localhost:4000/api/...` URLs which caused CORS errors in production. These have been replaced with relative URLs (`/api/...`) that work correctly with your Nginx proxy.

## Files Changed

### New Files:
- `src/utils/api.js` - New API utility for consistent URL handling

### Modified Files (all API calls now use relative URLs):
- src/components/DiseaseAnalysis.jsx
- src/components/LocationAnalysis.jsx
- src/components/disease/DiseaseSummaryCard.jsx
- src/components/disease/FacilityPerformanceTable.jsx
- src/components/location/LocationHeatmap.jsx
- src/components/location/DistrictComparison.jsx
- src/components/location/FacilityTable.jsx
- src/components/location/ChiefdomDrillDown.jsx
- src/components/forecast/ForecastDashboard.jsx
- src/components/forecast/ForecastHeatmap.jsx
- src/components/Overview.jsx
- src/components/Simulation.jsx
- src/components/disease/SpeciesDistribution.jsx
- src/components/disease/TreatmentTimeline.jsx
- src/hooks/useForecast.js
- src/hooks/useClimateData.js

## Deployment Steps

### Step 1: Commit Changes (Optional but Recommended)

```bash
# On your local machine
git add .
git commit -m "fix: replace hardcoded localhost URLs with relative paths for production

- Add API utility for consistent URL handling
- Replace all http://localhost:4000/api URLs with /api
- Fix CORS errors in production deployment"

git push origin main
```

### Step 2: Deploy to Lightsail

SSH into your Lightsail instance and run:

```bash
ssh -i your-key.pem ubuntu@YOUR_LIGHTSAIL_IP

cd ~/slewars

# Pull latest changes (if you committed)
git pull origin main

# OR if you didn't commit, copy files manually using scp (see below)

# Rebuild frontend
npm run build

# Restart services
pm2 restart all

# Check status
pm2 status
pm2 logs --lines 30
```

### Step 3: Alternative - Copy Files Without Git

If you didn't commit to git, you can copy files directly:

```bash
# On your LOCAL machine (from the project directory):

# Copy the API utility file
scp -i your-key.pem src/utils/api.js ubuntu@YOUR_LIGHTSAIL_IP:~/slewars/src/utils/

# Copy all modified component files
scp -i your-key.pem src/components/DiseaseAnalysis.jsx ubuntu@YOUR_LIGHTSAIL_IP:~/slewars/src/components/
scp -i your-key.pem src/components/LocationAnalysis.jsx ubuntu@YOUR_LIGHTSAIL_IP:~/slewars/src/components/
scp -i your-key.pem -r src/components/disease ubuntu@YOUR_LIGHTSAIL_IP:~/slewars/src/components/
scp -i your-key.pem -r src/components/location ubuntu@YOUR_LIGHTSAIL_IP:~/slewars/src/components/
scp -i your-key.pem -r src/components/forecast ubuntu@YOUR_LIGHTSAIL_IP:~/slewars/src/components/
scp -i your-key.pem src/components/Overview.jsx ubuntu@YOUR_LIGHTSAIL_IP:~/slewars/src/components/
scp -i your-key.pem src/components/Simulation.jsx ubuntu@YOUR_LIGHTSAIL_IP:~/slewars/src/components/
scp -i your-key.pem -r src/hooks ubuntu@YOUR_LIGHTSAIL_IP:~/slewars/src/

# Then SSH in and rebuild
ssh -i your-key.pem ubuntu@YOUR_LIGHTSAIL_IP
cd ~/slewars
npm run build
pm2 restart all
pm2 logs --lines 30
```

### Step 4: Verify Fixes

1. **Open browser** and go to: `http://YOUR_LIGHTSAIL_IP`

2. **Open Developer Tools** (F12) and go to Console tab

3. **Navigate to Disease Analysis page**
   - You should NO longer see CORS errors
   - The page should load with data

4. **Navigate to Location Analysis page**
   - You should NO longer see CORS errors
   - The page should load with data

5. **Check Network tab** (F12 → Network)
   - API calls should now go to `/api/...` (relative URLs)
   - Status should be 200 OK
   - Responses should contain data

## Expected Results

### Before Fix (CORS Errors):
```
❌ Access to XMLHttpRequest at 'http://localhost:4000/api/diseases/categories'
   from origin 'http://100.30.12.168' has been blocked by CORS policy
```

### After Fix (Success):
```
✅ GET /api/diseases/categories 200 OK
✅ GET /api/locations?level=2 200 OK
✅ GET /api/analytics/overview 200 OK
```

## Troubleshooting

### If pages still show errors:

1. **Clear browser cache:**
   - Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or open in Incognito/Private mode

2. **Verify rebuild completed:**
   ```bash
   ls -la ~/slewars/dist/
   # Should show recent timestamp
   ```

3. **Check PM2 logs:**
   ```bash
   pm2 logs ewars-backend --lines 50
   # Look for incoming API requests
   ```

4. **Test API directly:**
   ```bash
   curl http://localhost/api/diseases
   curl http://localhost/api/locations?level=2
   ```

### If build fails:

```bash
cd ~/slewars

# Clean build
rm -rf dist
rm -rf node_modules/.vite

# Rebuild
npm run build

# If still fails, reinstall dependencies
npm install
npm run build
```

## Verification Checklist

After deployment, verify:

- [ ] No CORS errors in browser console
- [ ] Disease Analysis page loads with data
- [ ] Location Analysis page loads with data
- [ ] Forecast/Prediction Risk page loads
- [ ] Overview page still works
- [ ] API requests in Network tab show 200 OK status
- [ ] Backend logs show incoming API requests

## Additional Notes

### Why This Fix Works:

1. **In Production:** Browser accesses app from `http://YOUR_IP`, makes relative requests to `/api/...`, Nginx proxies to `localhost:4000`

2. **No CORS Issues:** Because all requests stay within the same origin (`YOUR_IP`), no cross-origin policy violations occur

3. **Nginx Already Configured:** Your Nginx config at `/etc/nginx/sites-available/ewars` already has:
   ```nginx
   location /api {
       proxy_pass http://localhost:4000;
       ...
   }
   ```

### Development vs Production:

- **Development (npm run dev):** Vite's dev server proxies `/api` to `localhost:4000`
- **Production (deployed):** Nginx proxies `/api` to `localhost:4000`
- **Result:** Same relative URLs work in both environments!

## Questions?

If issues persist after deployment:
1. Share PM2 logs: `pm2 logs --lines 50`
2. Share browser console errors (F12 → Console)
3. Share Network tab screenshot (F12 → Network, showing failed requests)
