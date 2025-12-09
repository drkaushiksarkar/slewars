# AWS Lightsail Deployment Guide

Complete step-by-step guide to deploy the EWARS Platform on AWS Lightsail.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Create Lightsail Instance](#create-lightsail-instance)
3. [Connect to Your Instance](#connect-to-your-instance)
4. [Deploy Application](#deploy-application)
5. [Configure Firewall](#configure-firewall)
6. [Access Your Application](#access-your-application)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- AWS Account with Lightsail access
- GitHub repository access (or ability to upload files)
- Basic understanding of SSH/terminal commands

**Estimated Time:** 30-40 minutes

**Monthly Cost:** $10-20 USD (Lightsail instance) + $15 (if using managed PostgreSQL)

---

## Create Lightsail Instance

### Step 1: Go to AWS Lightsail Console

1. Log in to AWS Console
2. Navigate to **Lightsail** service
3. Click **"Create instance"**

### Step 2: Configure Instance

**Instance Location:**
- Choose region closest to your users (e.g., US East, EU, Asia Pacific)

**Pick Your Instance Image:**
1. Select **"Linux/Unix"**
2. Choose **"OS Only"**
3. Select **"Ubuntu 22.04 LTS"**

**Choose Your Instance Plan:**
- **Recommended:** $10/month plan (2 GB RAM, 1 vCPU, 60 GB SSD)
- **Minimum:** $5/month plan (512 MB RAM) - may be slow for ML service
- **Better Performance:** $20/month plan (4 GB RAM) - recommended for production

**Identify Your Instance:**
- Name: `ewars-production` (or your preferred name)

### Step 3: Create Instance

Click **"Create instance"** and wait 2-3 minutes for it to start.

---

## Connect to Your Instance

### Method 1: Browser-Based SSH (Easiest)

1. In Lightsail console, click on your instance name
2. Click the **"Connect using SSH"** button
3. A terminal window opens in your browser

### Method 2: SSH Key (Advanced)

1. Download SSH key from Lightsail console
2. Connect from terminal:
   ```bash
   ssh -i LightsailDefaultKey.pem ubuntu@YOUR_INSTANCE_IP
   ```

---

## Deploy Application

### Step 1: Clone Repository

Once connected via SSH, run:

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

**Alternative (if using private repo):**
```bash
# Generate SSH key on Lightsail
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Copy the output and add to GitHub Settings > SSH Keys
# Then clone
git clone git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
```

**Alternative (upload files):**
If you prefer not to use Git:
1. Compress your project: `tar -czf project.tar.gz *`
2. Upload via Lightsail console or SCP
3. Extract: `tar -xzf project.tar.gz`

### Step 2: Run Automated Setup

Run the deployment script:

```bash
chmod +x lightsail-setup.sh
./lightsail-setup.sh
```

**This script will automatically:**
- ✓ Update system packages
- ✓ Install Node.js 18
- ✓ Install PostgreSQL
- ✓ Install Python 3
- ✓ Install PM2 process manager
- ✓ Install Nginx web server
- ✓ Install all dependencies
- ✓ Setup ML service
- ✓ Create .env configuration
- ✓ Build the application
- ✓ Configure Nginx reverse proxy
- ✓ Initialize database
- ✓ Start all services with PM2

**Setup Time:** 10-15 minutes

### Step 3: Verify Installation

Check if services are running:

```bash
pm2 status
```

You should see:
```
┌─────┬────────────────┬─────────┬─────────┐
│ id  │ name           │ status  │ restart │
├─────┼────────────────┼─────────┼─────────┤
│ 0   │ ewars-backend  │ online  │ 0       │
│ 1   │ ewars-ml       │ online  │ 0       │
└─────┴────────────────┴─────────┴─────────┘
```

Check logs:
```bash
pm2 logs --lines 50
```

---

## Configure Firewall

### Step 1: Open HTTP Port

1. Go to Lightsail console
2. Click on your instance
3. Click **"Networking"** tab
4. Under **"Firewall"**, click **"Add rule"**
5. Add:
   - **Application:** HTTP
   - **Protocol:** TCP
   - **Port:** 80

### Step 2: (Optional) Add HTTPS

If setting up SSL later:
- **Application:** HTTPS
- **Protocol:** TCP
- **Port:** 443

---

## Access Your Application

### Find Your Public IP

1. In Lightsail console, find your instance's **Public IP**
2. Or run on server: `curl http://169.254.169.254/latest/meta-data/public-ipv4`

### Access Application

Open browser and go to:
```
http://YOUR_PUBLIC_IP
```

**API Endpoint:**
```
http://YOUR_PUBLIC_IP/api/config/countries
```

---

## Post-Deployment

### 1. Configure Environment Variables

Edit `.env` file if needed:

```bash
cd ~/YOUR_REPO_NAME
nano .env
```

**Important configurations:**
- `DHIS2_BASE_URL` - If using DHIS2 integration
- `OPENWEATHER_API_KEY` - For weather data
- `MAPBOX_TOKEN` - For map visualization

After editing, restart services:
```bash
pm2 restart all
```

### 2. Set Up Custom Domain (Optional)

**In Lightsail:**
1. Create static IP: Networking > Create static IP
2. Attach to your instance

**In your domain registrar:**
1. Add A record pointing to your static IP
2. Example: `ewars.yourdomain.com` → `YOUR_STATIC_IP`

**Update Nginx:**
```bash
sudo nano /etc/nginx/sites-available/ewars
```
Change `server_name` from IP to your domain:
```nginx
server_name ewars.yourdomain.com;
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Set Up SSL Certificate (Recommended)

Install Certbot:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

Get certificate:
```bash
sudo certbot --nginx -d ewars.yourdomain.com
```

Auto-renewal is configured automatically!

### 4. Set Up Backups

**Database Backup Script:**

Create `backup-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U ewars_user ewars_db > $BACKUP_DIR/ewars_db_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "ewars_db_*.sql" -mtime +7 -delete
```

Make executable and add to cron:
```bash
chmod +x backup-db.sh
crontab -e
# Add this line (daily backup at 2 AM):
0 2 * * * ~/YOUR_REPO_NAME/backup-db.sh
```

---

## Useful Commands

### PM2 Process Management

```bash
# Check status
pm2 status

# View logs
pm2 logs
pm2 logs ewars-backend
pm2 logs ewars-ml

# Restart services
pm2 restart all
pm2 restart ewars-backend

# Stop services
pm2 stop all

# Monitor resources
pm2 monit
```

### Nginx Commands

```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Database Commands

```bash
# Connect to database
psql -U ewars_user -d ewars_db

# Backup database
pg_dump -U ewars_user ewars_db > backup.sql

# Restore database
psql -U ewars_user -d ewars_db < backup.sql
```

### Application Updates

```bash
cd ~/YOUR_REPO_NAME

# Pull latest changes
git pull origin main

# Install new dependencies (if any)
npm install

# Rebuild application
npm run build:full

# Restart services
pm2 restart all
```

---

## Troubleshooting

### Application Not Loading

1. **Check PM2 services:**
   ```bash
   pm2 status
   pm2 logs
   ```

2. **Check Nginx:**
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

3. **Check if ports are listening:**
   ```bash
   sudo netstat -tulpn | grep -E ':(80|4000|8000)'
   ```

### 502 Bad Gateway

This means Nginx can't reach the backend:

1. **Check if backend is running:**
   ```bash
   pm2 status
   ```

2. **Restart backend:**
   ```bash
   pm2 restart ewars-backend
   ```

3. **Check backend logs:**
   ```bash
   pm2 logs ewars-backend --lines 100
   ```

### Database Connection Errors

1. **Check PostgreSQL is running:**
   ```bash
   sudo systemctl status postgresql
   ```

2. **Verify credentials in .env:**
   ```bash
   cat .env | grep POSTGRES
   ```

3. **Test connection:**
   ```bash
   psql -U ewars_user -d ewars_db -c "SELECT 1;"
   ```

### ML Service Not Responding

1. **Check ML service logs:**
   ```bash
   pm2 logs ewars-ml
   ```

2. **Restart ML service:**
   ```bash
   pm2 restart ewars-ml
   ```

3. **Check Python environment:**
   ```bash
   cd ~/YOUR_REPO_NAME/server/ml-service
   source venv/bin/activate
   python -c "import flask, pandas, sklearn; print('OK')"
   ```

### Out of Memory

If the $5 instance runs out of memory:

1. **Add swap space:**
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

2. **Or upgrade to $10 or $20 plan** in Lightsail console

### High CPU Usage

1. **Check which process:**
   ```bash
   pm2 monit
   top
   ```

2. **Check logs for errors:**
   ```bash
   pm2 logs
   ```

3. **Consider upgrading instance size**

---

## Monitoring and Maintenance

### Set Up Email Alerts

Configure PM2 to send alerts:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Check Disk Space

```bash
df -h
```

If running low:
```bash
# Clean old logs
pm2 flush
sudo journalctl --vacuum-time=7d

# Clean apt cache
sudo apt-get clean
```

### Monitor Performance

```bash
# System resources
htop

# PM2 monitoring
pm2 monit

# Nginx status
curl http://localhost/api/config/countries
```

---

## Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt-get update && sudo apt-get upgrade -y
   ```

2. **Enable automatic security updates:**
   ```bash
   sudo apt-get install unattended-upgrades
   sudo dpkg-reconfigure -plow unattended-upgrades
   ```

3. **Change default database password:**
   Edit `.env` and change `POSTGRES_PASSWORD`

4. **Set up firewall (UFW):**
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

5. **Use SSL certificate** (see Setup SSL section above)

6. **Restrict SSH access** to your IP only in Lightsail firewall

---

## Cost Optimization

**Current Setup:**
- Lightsail $10/month instance: $10
- **Total: ~$10/month**

**To Reduce Costs:**
- Use $5/month instance (slower, but works)
- Add swap space for memory

**To Improve Performance:**
- Upgrade to $20/month (4 GB RAM)
- Use managed PostgreSQL ($15/month) instead of local

---

## Support

**Common Issues:**
- Check logs first: `pm2 logs`
- Restart services: `pm2 restart all`
- Check Nginx: `sudo nginx -t`

**For DHIS2 integration issues:**
- Verify credentials in `.env`
- Check DHIS2_BASE_URL is accessible from Lightsail

**For ML service issues:**
- Check Python dependencies: `pip list`
- Retrain models if needed

---

## Summary

✅ **Deployment Complete!**

Your EWARS platform is now running on AWS Lightsail with:
- ✓ Frontend served via Nginx
- ✓ Backend API running on PM2
- ✓ ML service for predictions
- ✓ PostgreSQL database
- ✓ Auto-restart on server reboot
- ✓ Professional production setup

**Access:** `http://YOUR_PUBLIC_IP`

**Next Steps:**
1. Set up custom domain
2. Enable SSL certificate
3. Configure DHIS2 integration (if needed)
4. Set up automated backups
5. Monitor performance

**Questions?** Check troubleshooting section or PM2/Nginx logs.
