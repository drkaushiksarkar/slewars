# AWS Lightsail Deployment Guide - EWARS Platform

Complete, tested deployment guide for deploying the EWARS Platform on AWS Lightsail.

**Estimated Time:** 45-60 minutes
**Monthly Cost:** $10-20 USD (Lightsail instance only)
**Tested On:** Ubuntu 22.04 LTS, Node.js v18.20.8, Python 3.10

---

## 🔥 CRITICAL FIXES APPLIED (December 2025)

### Issue 1: Backend Module System Error (FIXED)
**Error**: `SyntaxError: Cannot use import statement outside a module`

**Root Cause**: Backend code uses ES module syntax but `server/package.json` was set to `"type":"commonjs"`

**Fix Applied**:
- Changed `server/package.json` to `{"type":"module"}` (server/package.json:1)
- Updated build script to copy package.json to dist folder (package.json:12)

**Action Required**: After pulling latest code, run `npm run build:full` and restart backend

### Issue 2: Using Synthetic Data Instead of DHIS2 (FIXED)
**Error**: Application shows synthetic/demo data instead of real DHIS2 data

**Root Cause**: `lightsail-setup.sh` was setting `DASHBOARD_DATA_SOURCE=synthetic` by default

**Fix Applied**: Updated `lightsail-setup.sh` line 186 to use `DASHBOARD_DATA_SOURCE=postgres`

**Action Required**: Update `.env` file on Lightsail to set `DASHBOARD_DATA_SOURCE=postgres` and provide correct DHIS2 database credentials

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Lightsail Instance](#step-1-create-lightsail-instance)
3. [Step 2: Configure Static IP (Recommended)](#step-2-configure-static-ip-recommended)
4. [Step 3: Whitelist IP in RDS (If Using RDS)](#step-3-whitelist-ip-in-rds-if-using-rds)
5. [Step 4: Connect to Instance](#step-4-connect-to-instance)
6. [Step 5: Setup SSH Key (Private Repos Only)](#step-5-setup-ssh-key-private-repos-only)
7. [Step 6: Clone Repository](#step-6-clone-repository)
8. [Step 7: Run Automated Setup](#step-7-run-automated-setup)
9. [Step 8: Configure Environment Variables](#step-8-configure-environment-variables)
10. [Step 9: Configure Module System](#step-9-configure-module-system)
11. [Step 10: Build Application](#step-10-build-application)
12. [Step 11: Configure Nginx](#step-11-configure-nginx)
13. [Step 12: Setup ML Service](#step-12-setup-ml-service)
14. [Step 13: Start Services with PM2](#step-13-start-services-with-pm2)
15. [Step 14: Verify Deployment](#step-14-verify-deployment)
16. [Troubleshooting](#troubleshooting)
17. [Maintenance Commands](#maintenance-commands)

---

## Prerequisites

- AWS Account with Lightsail access
- GitHub repository access (SSH key for private repos)
- RDS PostgreSQL instance (optional - can use local PostgreSQL)
- Basic knowledge of SSH and terminal commands

---

## Step 1: Create Lightsail Instance

### 1.1 Create Instance

1. Go to **AWS Lightsail Console**
2. Click **"Create instance"**
3. Select:
   - **Region:** Choose closest to your users
   - **Platform:** Linux/Unix
   - **Blueprint:** OS Only → **Ubuntu 22.04 LTS**
   - **Instance plan:** **$10/month** (2 GB RAM, 1 vCPU) - Recommended minimum
   - **Instance name:** `ewars-production`
4. Click **"Create instance"**
5. Wait 2-3 minutes for instance to start

### 1.2 Configure Firewall

1. Click on your instance name
2. Go to **"Networking"** tab
3. Under **"IPv4 Firewall"**, click **"Add rule"**
4. Add HTTP rule:
   - **Application:** HTTP
   - **Protocol:** TCP
   - **Port:** 80
5. Click **"Create"**

The firewall should now have:
- SSH (port 22) - Already configured
- HTTP (port 80) - Just added

---

## Step 2: Configure Static IP (Recommended)

Static IP ensures your IP doesn't change if you stop/restart the instance.

1. In Lightsail console, go to **"Networking"** tab
2. Click **"Create static IP"**
3. Select your instance
4. Name it: `ewars-static-ip`
5. Click **"Create"**
6. Note your static IP address (e.g., `100.30.12.168`)

**Important:** Use this static IP for all subsequent steps!

---

## Step 3: Whitelist IP in RDS (If Using RDS)

**Skip this if using local PostgreSQL.**

### 3.1 Add Security Group Rule

1. Go to **AWS RDS Console**
2. Click on your database instance
3. Click **"Connectivity & security"** tab
4. Click on the **VPC security group** link (e.g., `sg-xxxxxxxxx`)
5. Click **"Edit inbound rules"**
6. Click **"Add rule"**:
   - **Type:** PostgreSQL
   - **Protocol:** TCP
   - **Port:** 5432
   - **Source:** Custom → `YOUR_STATIC_IP/32` (e.g., `100.30.12.168/32`)
   - **Description:** Lightsail EWARS Production
7. Click **"Save rules"**

### 3.2 Get RDS Endpoint

1. In RDS Console, click your database
2. Copy the **Endpoint** from "Connectivity & security" tab
3. Example: `mydb.c1234567890.us-east-1.rds.amazonaws.com`
4. Save this - you'll need it for `.env` configuration

---

## Step 4: Connect to Instance

### Option A: Browser SSH (Easiest)

1. In Lightsail console, click instance name
2. Click **"Connect using SSH"**
3. Terminal opens in browser

### Option B: SSH from Local Machine

```bash
# Download SSH key from Lightsail console first
ssh -i /path/to/LightsailDefaultKey.pem ubuntu@YOUR_STATIC_IP
```

---

## Step 5: Setup SSH Key (Private Repos Only)

**Skip this section if your repository is public.**

### 5.1 Generate SSH Key

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

**When prompted:**
- `Enter file in which to save the key`: Press **Enter** (use default)
- `Enter passphrase`: Press **Enter** (no passphrase)
- `Enter same passphrase again`: Press **Enter**

### 5.2 Copy Public Key

```bash
cat ~/.ssh/id_ed25519.pub
```

**Copy the ENTIRE output** (from `ssh-ed25519` to your email)

### 5.3 Add to GitHub

1. Go to https://github.com/settings/keys
2. Click **"New SSH key"**
3. Title: `Lightsail EWARS Production`
4. Key type: Authentication Key
5. Paste the public key
6. Click **"Add SSH key"**

### 5.4 Test Connection

```bash
ssh -T git@github.com
```

Type `yes` if prompted. Should say: *"Hi username! You've successfully authenticated"*

---

## Step 6: Clone Repository

### For Private Repository:

```bash
cd ~
git clone git@github.com:YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### For Public Repository:

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

Replace `YOUR_USERNAME/YOUR_REPO` with your actual repository path.

---

## Step 7: Run Automated Setup

```bash
chmod +x lightsail-setup.sh
./lightsail-setup.sh
```

**During setup:**
- If prompted about **"Daemons using outdated libraries"**, press **Tab** then **Enter**
- Wait 10-15 minutes for installation to complete

**This script installs:**
- Node.js 18.x
- PostgreSQL 14 (local database)
- Python 3.10 and virtual environment
- Nginx web server
- PM2 process manager
- All required dependencies

---

## Step 8: Configure Environment Variables

### 8.1 Edit .env File

```bash
nano .env
```

### 8.2 Configure Database

**For RDS PostgreSQL:**
```bash
POSTGRES_HOST=your-rds-endpoint.us-east-1.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=your_database_name
POSTGRES_USER=your_rds_username
POSTGRES_PASSWORD=your_rds_password
```

**For Local PostgreSQL:**
```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ewars_db
POSTGRES_USER=ewars_user
POSTGRES_PASSWORD=ewars_password_2024  # Change this to something secure!
```

### 8.3 Configure API Keys (Optional)

```bash
# Mapbox for maps
VITE_MAPBOX_TOKEN=your_mapbox_token

# OpenWeather for climate data
VITE_OPENWEATHER_API_KEY=your_openweather_key

# Pexels for images (optional)
VITE_PEXELS_API_KEY=your_pexels_key
```

### 8.4 Configure DHIS2 (Optional)

```bash
DASHBOARD_DATA_SOURCE=dhis2  # or hybrid, or local
DHIS2_BASE_URL=https://your-dhis2-instance.org
DHIS2_USERNAME=your_username
DHIS2_PASSWORD=your_password
```

### 8.5 Save File

- Press **Ctrl + O**, then **Enter** to save
- Press **Ctrl + X** to exit

---

## Step 9: Configure Module System

**CRITICAL:** This step ensures proper module compatibility between frontend and backend.

### 9.1 Verify Root package.json

```bash
# Check root package.json has "type": "module"
cat package.json | grep -A1 '"name"'
```

**Expected output:**
```json
"name": "web-app",
"type": "module",
```

If missing, add it:
```bash
nano package.json
# Add "type": "module", after the "name" line
```

### 9.2 Create Server package.json Override

```bash
# Create CommonJS override for server
echo '{"type":"commonjs"}' > server/package.json

# Verify
cat server/package.json
```

**Expected output:** `{"type":"commonjs"}`

### 9.3 Understanding the Module System

The module system hierarchy:
- **Root** (`package.json`): `"type": "module"` → Frontend/Vite uses ES modules
- **Server** (`server/package.json`): `"type":"commonjs"` → Backend uses CommonJS
- **Server dist** (`server/dist/package.json`): Created after build → Compiled backend uses CommonJS

Node.js uses the **closest** package.json to determine module type!

---

## Step 10: Build Application

### 10.1 Build Backend and Frontend

```bash
cd ~/slewars  # or your repo name
npm run build:full
```

Wait 3-5 minutes for build to complete.

### 10.2 Create Dist package.json Override

**IMPORTANT:** This must be done AFTER the build completes!

```bash
# Create CommonJS override for compiled backend
echo '{"type":"commonjs"}' > server/dist/package.json

# Verify
cat server/dist/package.json
```

**Expected output:** `{"type":"commonjs"}`

### 10.3 Verify Build Success

```bash
# Check backend dist folder
ls -la server/dist/

# Check frontend dist folder
ls -la dist/

# Verify a compiled file is CommonJS (should see "require" not "import")
head -n 10 server/dist/index.js
```

---

## Step 11: Configure Nginx

### 11.1 Fix Permission Issues

Nginx needs access to your project files:

```bash
# Give Nginx access to home directory
chmod +x /home/ubuntu

# Give read permissions to project directories
chmod -R 755 ~/slewars/dist
```

### 11.2 Update Nginx Configuration

```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/ewars
```

**Ensure the configuration looks like this:**

```nginx
server {
    listen 80;
    server_name YOUR_STATIC_IP;

    # Serve frontend static files
    location / {
        root /home/ubuntu/slewars/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Replace `YOUR_STATIC_IP` with your actual static IP address.

**Save:** Press **Ctrl + O**, **Enter**, then **Ctrl + X**

### 11.3 Test and Reload Nginx

```bash
# Test configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx

# Verify Nginx is running
sudo systemctl status nginx
```

---

## Step 12: Setup ML Service

### 12.1 Install Python Dependencies

```bash
cd ~/slewars/server/ml-service

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

Wait 5-10 minutes for installation.

### 12.2 Upgrade scikit-learn (Optional but Recommended)

This prevents version mismatch warnings:

```bash
# Still in activated virtual environment
pip install scikit-learn==1.7.2

# Deactivate
deactivate
```

---

## Step 13: Start Services with PM2

### 13.1 Clear Any Existing PM2 Processes

```bash
cd ~/slewars

# Kill PM2 completely to ensure clean start
pm2 kill

# Clean PM2 cache
rm -rf ~/.pm2/logs/*
rm -rf ~/.pm2/pids/*
```

### 13.2 Start Backend

```bash
pm2 start npm --name "ewars-backend" -- run server:start
```

Wait 10-15 seconds for backend to initialize.

### 13.3 Start ML Service

```bash
cd ~/slewars/server/ml-service
pm2 start venv/bin/python --name "ewars-ml" -- main.py
cd ~/slewars
```

### 13.4 Save PM2 Configuration

```bash
pm2 save
```

### 13.5 Configure PM2 Auto-Startup

```bash
pm2 startup systemd -u $USER --hp $HOME
```

**Copy and run the `sudo` command** it outputs (looks like: `sudo env PATH=...`)

Then save again:

```bash
pm2 save
```

---

## Step 14: Verify Deployment

### 14.1 Check PM2 Status

```bash
pm2 status
```

**Expected output:**
```
┌─────┬─────────────────┬─────────┬─────────┐
│ id  │ name            │ status  │ restart │
├─────┼─────────────────┼─────────┼─────────┤
│ 0   │ ewars-backend   │ online  │ 0       │
│ 1   │ ewars-ml        │ online  │ 0       │
└─────┴─────────────────┴─────────┴─────────┘
```

Both services should show **"online"** status with **0 or low restarts**.

### 14.2 Check Logs

```bash
# View all logs
pm2 logs --lines 30

# Backend logs only
pm2 logs ewars-backend --lines 20

# ML service logs only
pm2 logs ewars-ml --lines 20
```

**Look for:**
- Backend: `Server running on port 4000` or similar
- Backend: Database connection success message
- ML: `Uvicorn running on http://0.0.0.0:8000`
- ML: `Application startup complete`
- ML: `Model loaded`

### 14.3 Test Backend API

```bash
curl http://localhost:4000/api/config/countries
```

Should return JSON data about countries.

### 14.4 Test Frontend

```bash
# Test locally
curl -I http://localhost

# Test from public IP
curl -I http://YOUR_STATIC_IP
```

Both should return `HTTP/1.1 200 OK`.

### 14.5 Access in Browser

Open your browser and go to:
```
http://YOUR_STATIC_IP
```

You should see the EWARS Platform dashboard!

**Test the API in browser:**
```
http://YOUR_STATIC_IP/api/config/countries
```

---

## Troubleshooting

### Services Not Starting

**Check status:**
```bash
pm2 status
pm2 logs
```

**If backend shows "errored":**
```bash
# Check logs for specific error
pm2 logs ewars-backend --lines 50

# Common fixes:
# 1. Database connection issue - verify .env credentials
# 2. Port already in use - kill process on port 4000
# 3. Module error - verify package.json files are correct
```

**Clean restart:**
```bash
cd ~/slewars
pm2 delete all
pm2 start npm --name "ewars-backend" -- run server:start
cd server/ml-service && pm2 start venv/bin/python --name "ewars-ml" -- main.py && cd ~/slewars
pm2 save
```

### Module System Errors

**Error: "Cannot use import statement outside a module"**

This means Node.js is treating CommonJS code as ES modules.

**Fix:**
```bash
cd ~/slewars

# Verify package.json files
echo "=== Root ==="
cat package.json | grep -A1 '"name"'
echo "=== Server ==="
cat server/package.json
echo "=== Server dist ==="
cat server/dist/package.json

# Should show:
# Root: "type": "module"
# Server: {"type":"commonjs"}
# Server dist: {"type":"commonjs"}
```

If any are wrong, recreate them:
```bash
# Ensure root has type module
nano package.json  # Add "type": "module", after name

# Create server overrides
echo '{"type":"commonjs"}' > server/package.json
echo '{"type":"commonjs"}' > server/dist/package.json

# Restart
pm2 restart ewars-backend
```

**Error: "ERR_MODULE_NOT_FOUND"**

Backend is being loaded as ES module but missing `.js` extensions.

**Fix:**
```bash
cd ~/slewars

# Verify TypeScript compiles to CommonJS
cat server/tsconfig.json | grep module

# Should show:
#   "module": "CommonJS",
#   "moduleResolution": "Node",

# If wrong, rebuild:
rm -rf server/dist
npm run server:build
echo '{"type":"commonjs"}' > server/dist/package.json
pm2 restart ewars-backend
```

### Permission Denied (Nginx 500 Error)

**Error in logs:** `stat() failed (13: Permission denied)`

**Fix:**
```bash
# Give Nginx access to home directory
chmod +x /home/ubuntu

# Give permissions to project
chmod -R 755 ~/slewars/dist

# Test if Nginx can access files
sudo -u www-data test -r ~/slewars/dist/index.html && echo "SUCCESS" || echo "FAILED"
```

### Database Connection Failed

**Check credentials:**
```bash
cat .env | grep POSTGRES
```

**Test connection manually:**
```bash
# For local PostgreSQL
psql -U ewars_user -d ewars_db

# For RDS
psql -h your-rds-endpoint.amazonaws.com -U your_username -d your_database
```

**If RDS connection fails:**
1. Verify IP is whitelisted in RDS security group
2. Check endpoint is correct
3. Verify credentials
4. Test from Lightsail instance (not your local machine)

### ML Service Scikit-learn Warning

**Warning:** `InconsistentVersionWarning: Trying to unpickle estimator`

This is a warning, not an error. ML service will still work, but to fix:

```bash
cd ~/slewars/server/ml-service
source venv/bin/activate
pip install scikit-learn==1.7.2  # Match model version
deactivate
pm2 restart ewars-ml
```

### Port Already in Use

```bash
# Find process on port 4000
sudo lsof -i :4000

# Kill it
sudo kill -9 <PID>

# Or use PM2 to manage it
pm2 restart ewars-backend
```

### Frontend Not Updating

If you updated frontend code but don't see changes:

```bash
cd ~/slewars

# Rebuild frontend
npm run build

# Copy to nginx directory (if using /var/www)
sudo cp -r dist/* /var/www/ewars/

# Clear browser cache or open in incognito mode
```

---

## Maintenance Commands

### Check Service Status

```bash
# PM2 status
pm2 status

# Live logs
pm2 logs

# Resource monitoring
pm2 monit

# System resources
htop
```

### Update Application

```bash
cd ~/slewars

# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Rebuild
npm run build:full
echo '{"type":"commonjs"}' > server/dist/package.json

# Restart services
pm2 restart all

# Check logs
pm2 logs --lines 30
```

### Update Environment Variables

```bash
# Edit .env
nano .env

# Restart services with new environment
pm2 restart all --update-env
```

### Database Backup

```bash
# Local PostgreSQL
pg_dump -U ewars_user ewars_db > backup_$(date +%Y%m%d).sql

# RDS
pg_dump -h your-rds-endpoint.amazonaws.com -U username dbname > backup_$(date +%Y%m%d).sql

# Restore
psql -U username -d dbname < backup.sql
```

### View Logs

```bash
# PM2 logs
pm2 logs ewars-backend --lines 100
pm2 logs ewars-ml --lines 100

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u nginx -f
```

### Clean Restart (Nuclear Option)

If everything is broken and you need to start fresh:

```bash
cd ~/slewars

# Stop everything
pm2 kill

# Clean build artifacts
rm -rf server/dist
rm -rf dist
rm -rf node_modules

# Reinstall and rebuild
npm install
echo '{"type":"commonjs"}' > server/package.json
npm run build:full
echo '{"type":"commonjs"}' > server/dist/package.json

# Fix permissions
chmod +x /home/ubuntu
chmod -R 755 ~/slewars/dist

# Start services
pm2 start npm --name "ewars-backend" -- run server:start
cd server/ml-service && pm2 start venv/bin/python --name "ewars-ml" -- main.py && cd ~/slewars
pm2 save

# Check status
pm2 status
pm2 logs --lines 30
```

---

## Post-Deployment (Optional)

### Setup Custom Domain

1. **Point domain to Lightsail:**
   - In your domain registrar, add A record
   - Name: `@` or `www`
   - Value: Your static IP address

2. **Update Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/ewars
   ```
   Change `server_name YOUR_IP;` to `server_name yourdomain.com www.yourdomain.com;`

3. **Reload Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### Setup SSL Certificate (HTTPS)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts, agree to terms, provide email

# Test auto-renewal
sudo certbot renew --dry-run
```

Certbot will automatically configure Nginx for HTTPS and set up auto-renewal.

### Setup Monitoring (Optional)

```bash
# Install monitoring tools
pm2 install pm2-logrotate  # Rotate logs automatically
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Setup email alerts (requires PM2 Plus account)
pm2 link <secret> <public>
```

### Add Swap Space (Low Memory Instances)

If using $5/month instance (1GB RAM):

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

---

## Security Checklist

- [ ] Changed default database password in `.env`
- [ ] Setup static IP in Lightsail
- [ ] Configured firewall (only ports 22, 80, 443 open)
- [ ] Setup SSL certificate (HTTPS)
- [ ] Never commit `.env` to GitHub
- [ ] Use strong passwords for all credentials
- [ ] Restrict SSH access to specific IPs (optional)
- [ ] Enable automatic security updates
- [ ] Setup database backups
- [ ] Monitor PM2 logs regularly

---

## Summary

✅ **Your EWARS Platform is now deployed!**

**Access:** `http://YOUR_STATIC_IP`

**Services Running:**
- Frontend (Nginx) → Port 80
- Backend API (PM2) → Port 4000
- ML Service (PM2) → Port 8000
- Database → RDS or Local PostgreSQL

**Auto-restart:** Configured with PM2 startup

**Next steps:**
- Setup custom domain (optional)
- Enable SSL/HTTPS (optional)
- Configure monitoring
- Setup regular backups

---

## Getting Help

**Common resources:**
- Check PM2 logs: `pm2 logs`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Verify services: `pm2 status`
- Test API: `curl http://localhost:4000/api/config/countries`

**If stuck:**
1. Check the Troubleshooting section above
2. Review the logs for specific errors
3. Try the Clean Restart procedure
4. Verify all package.json files are correct

---

## FAQ

**Q: What if I change my static IP?**
A: Update RDS security group with new IP and update Nginx server_name.

**Q: Do I need to rebuild after changing .env?**
A: Only for `VITE_*` variables. Backend variables just need `pm2 restart --update-env`.

**Q: Can I use a $5/month instance?**
A: Yes, but add swap space. $10/month (2GB RAM) is recommended for better performance.

**Q: How do I update the application?**
A: `git pull && npm install && npm run build:full && pm2 restart all`

**Q: Services keep crashing?**
A: Check logs with `pm2 logs`, verify database connection, ensure ports aren't in use.

**Q: Frontend shows 500 error?**
A: Check Nginx error logs. Usually permission issue - run `chmod +x /home/ubuntu && chmod -R 755 ~/slewars/dist`.

**Q: Can I use a different database?**
A: Yes, update `.env` with your database credentials. Ensure port 5432 is accessible.

---

**Deployment Guide Version:** 2.0
**Last Updated:** December 2025
**Tested On:** AWS Lightsail Ubuntu 22.04 LTS
