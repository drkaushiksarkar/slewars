# AWS Lightsail Deployment Guide

Complete deployment guide for EWARS Platform on AWS Lightsail, tested and verified with real DHIS2 data.

**Time Required:** 30-40 minutes
**Cost:** $10-20/month (Lightsail only)
**Tested:** Ubuntu 22.04 LTS, Node.js 18, Python 3.10

---

## Prerequisites

✓ AWS Account with Lightsail access
✓ DHIS2 PostgreSQL database (host, port, credentials, database name)
✓ GitHub access to repository
✓ Basic terminal/SSH knowledge

---

## Quick Start Guide

### 1. Create Lightsail Instance

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com/)
2. Click **"Create instance"**
3. Select:
   - **Platform:** Linux/Unix
   - **Blueprint:** Ubuntu 22.04 LTS
   - **Plan:** $20/month (4 GB RAM, 2 vCPU) recommended
4. Name: `ewars-production`
5. Click **"Create instance"**
6. Wait for instance status to show "Running"

### 2. Configure Networking

**Firewall:**
1. Instance → Networking → IPv4 Firewall
2. Add rule: **HTTP (port 80)**

**Static IP (Recommended):**
1. Networking tab → **Create static IP**
2. Attach to your instance
3. **Note the IP address** - you'll need this to access your dashboard

**Database Access (if using RDS or external DB):**
1. RDS Console → Your database → Security groups
2. Add inbound rule: **PostgreSQL (5432)** from `your-lightsail-static-ip/32`
3. Test connection: `psql -h your-db-host -U your-username -d your-database`

### 3. Connect to Instance

```bash
# Option 1: SSH from local machine (if you have the key)
ssh -i YourKey.pem ubuntu@YOUR_STATIC_IP

# Option 2: Use browser-based SSH from Lightsail console (easiest)
# Click on instance → Connect using SSH (in browser)
```

### 4. Setup SSH for GitHub (Private Repositories)

If your repository is private, set up SSH key:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your@email.com"
# Press Enter for all prompts (use default location, no passphrase)

# Display public key
cat ~/.ssh/id_ed25519.pub

# Copy the output and add it to GitHub:
# GitHub → Settings → SSH and GPG keys → New SSH key
```

### 5. Clone Repository

```bash
# For private repos (after SSH setup)
git clone git@github.com:IMACS-Health-Modeling/slewars.git
cd slewars

# For public repos
git clone https://github.com/your-org/slewars.git
cd slewars
```

### 6. Configure Environment Variables

**IMPORTANT:** Create the `.env` file BEFORE running the setup script.

```bash
# Create .env file
nano .env
```

**Add the following configuration** (update with your actual values):

```bash
# Server Configuration
NODE_ENV=production
PORT=4000

# Database Configuration - UPDATE THESE WITH YOUR DHIS2 DATABASE CREDENTIALS
POSTGRES_HOST=your-dhis2-db.region.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=your_dhis2_database_name
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password

# Data Source (MUST be postgres for DHIS2 data)
DASHBOARD_DATA_SOURCE=postgres

# DHIS2 Configuration (Optional)
DHIS2_BASE_URL=
DHIS2_USERNAME=
DHIS2_PASSWORD=
DHIS2_VERIFY_SSL=false

# API Keys (Optional)
OPENWEATHER_API_KEY=
MAPBOX_TOKEN=
ERA5_API_KEY=

# ML Service
ML_SERVICE_URL=http://localhost:8000
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

**Critical Configuration Notes:**
- `DASHBOARD_DATA_SOURCE=postgres` - MUST be set to postgres to use real DHIS2 data
- Update all `POSTGRES_*` values with your actual database credentials
- Verify database connectivity before proceeding

### 7. Test Database Connection (Optional but Recommended)

```bash
# Load environment variables
source .env

# Test connection
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "\dt"

# If successful, you should see list of tables
# If it fails, verify your credentials in .env file
```

### 8. Run Automated Setup Script

```bash
# Make script executable
chmod +x lightsail-setup.sh

# Run the setup script
./lightsail-setup.sh
```

**The script will automatically:**
- ✓ Check for .env file (exits if not found)
- ✓ Install Node.js 18
- ✓ Install PostgreSQL client tools
- ✓ Install Python 3 + pip
- ✓ Install PM2 (process manager)
- ✓ Install Nginx (web server)
- ✓ Fix file permissions for Nginx
- ✓ Configure backend for CommonJS module system
- ✓ Install all application dependencies
- ✓ Setup ML service with scikit-learn
- ✓ Build frontend and backend
- ✓ Configure Nginx reverse proxy
- ✓ Setup PM2 to auto-start on boot
- ✓ Start all services
- ✓ Verify services are running

**⏱️ Takes 10-15 minutes**

### 9. Verify Deployment

After setup completes, verify everything is working:

```bash
# 1. Check PM2 status
pm2 status
# Should show: ewars-backend (online), ewars-ml (online)

# 2. Check backend logs
pm2 logs ewars-backend --lines 30
# Look for: "Database connection successful" and "API server listening on port 4000"

# 3. Test backend API
curl http://localhost:4000/api/health
# Should return: {"status":"healthy"}

# 4. Test through Nginx
curl http://localhost/api/health
# Should return: {"status":"healthy"}
```

### 10. Access Your Dashboard

Open browser: `http://YOUR_STATIC_IP`

You should see the EWARS dashboard loading real DHIS2 data!

**Test all pages:**
- [ ] Overview page loads with disease trends
- [ ] Disease Analysis shows real disease data
- [ ] Location Analysis displays map with data points
- [ ] Climate page shows weather trends
- [ ] Forecast page generates ML predictions

---

## Post-Deployment Checklist

After successful deployment:

- [ ] Static IP is configured and noted
- [ ] Firewall allows HTTP (port 80)
- [ ] Database connection is verified
- [ ] `.env` file has correct production values
- [ ] `DASHBOARD_DATA_SOURCE=postgres` is set
- [ ] All PM2 services are online
- [ ] Frontend loads correctly in browser
- [ ] API health endpoint responds
- [ ] All dashboard pages display real data
- [ ] PM2 auto-start is enabled (survives reboots)

---

## Troubleshooting

### Issue: Setup Script Fails Immediately

**Symptom:** Script exits with ".env file not found"

**Solution:**
```bash
# Create .env file first
nano .env
# Add your configuration (see step 6)
# Then run setup script again
./lightsail-setup.sh
```

### Issue: Database Connection Failed

**Symptom:** Backend logs show "Connection refused" or "timeout"

**Solutions:**
```bash
# 1. Verify credentials in .env
cat .env | grep POSTGRES

# 2. Test connection manually
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB

# 3. Check database security groups
# AWS RDS → Your DB → Security groups → Inbound rules
# Must allow port 5432 from your Lightsail IP

# 4. Verify database is accessible
telnet $POSTGRES_HOST 5432
```

### Issue: Backend Won't Start

**Symptom:** PM2 shows backend as "errored" or "stopped"

**Solutions:**
```bash
# 1. Check detailed logs
pm2 logs ewars-backend --lines 100

# 2. Check for port conflicts
sudo lsof -i :4000
# If port is in use:
sudo kill -9 <PID>
pm2 restart ewars-backend

# 3. Verify CommonJS configuration
cat server/dist/package.json
# Should show: {"type":"commonjs"}

# 4. Rebuild if needed
echo '{"type":"commonjs"}' > server/package.json
echo '{"type":"commonjs"}' > server/dist/package.json
npm run server:build
pm2 restart all
```

### Issue: ML Service Won't Start

**Symptom:** PM2 shows ewars-ml as "errored"

**Solutions:**
```bash
# 1. Check ML logs
pm2 logs ewars-ml --lines 50

# 2. Test Python environment
cd server/ml-service
source venv/bin/activate
python main.py
# Check for errors

# 3. Reinstall dependencies
pip install -r requirements.txt
pip install --upgrade scikit-learn
deactivate

# 4. Restart service
cd ~/slewars
pm2 restart ewars-ml
```

### Issue: Nginx Shows 403 Forbidden

**Symptom:** Browser shows "403 Forbidden" error

**Solutions:**
```bash
# 1. Fix permissions
chmod +x /home/ubuntu
chmod -R 755 ~/slewars/dist

# 2. Verify Nginx configuration
sudo nano /etc/nginx/sites-available/ewars
# Ensure root path is correct: root /home/ubuntu/slewars/dist;

# 3. Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# 4. Check Nginx error logs
sudo tail -50 /var/log/nginx/error.log
```

### Issue: Pages Show Synthetic Data Instead of Real Data

**Symptom:** Dashboard shows fake/demo data

**Solutions:**
```bash
# 1. Check data source configuration
grep DASHBOARD_DATA_SOURCE .env
# Must show: DASHBOARD_DATA_SOURCE=postgres

# 2. If incorrect, edit .env
nano .env
# Change to: DASHBOARD_DATA_SOURCE=postgres

# 3. Restart backend
pm2 restart ewars-backend

# 4. Verify database connection in logs
pm2 logs ewars-backend | grep -i "database\|postgres"
```

### Issue: Services Die After Reboot

**Symptom:** After server restart, dashboard doesn't work

**Solutions:**
```bash
# 1. Check PM2 startup is configured
pm2 startup

# 2. Run the sudo command it outputs

# 3. Save current process list
pm2 save

# 4. Restart server to test
sudo reboot

# 5. After reboot, verify
pm2 status
```

---

## Maintenance

### Update Application Code

```bash
cd ~/slewars

# Pull latest changes
git pull

# Install any new dependencies
npm install

# Rebuild application
npm run build:full

# Restart services
pm2 restart all

# Check logs
pm2 logs --lines 50
```

### Rebuild Backend Only

```bash
cd ~/slewars

# Ensure CommonJS configuration
echo '{"type":"commonjs"}' > server/package.json
echo '{"type":"commonjs"}' > server/dist/package.json

# Rebuild
npm run server:build

# Restart
pm2 restart ewars-backend
```

### View and Manage Logs

```bash
# View all logs in real-time
pm2 logs

# View specific service
pm2 logs ewars-backend
pm2 logs ewars-ml

# View last N lines without streaming
pm2 logs --lines 100 --nostream

# Clear old logs
pm2 flush

# Clear PM2 logs manually
rm -rf ~/.pm2/logs/*
```

### PM2 Process Management

```bash
pm2 status              # View all processes
pm2 restart all         # Restart all services
pm2 restart ewars-backend  # Restart specific service
pm2 stop all            # Stop all services
pm2 start all           # Start all services
pm2 delete all          # Remove all processes (doesn't delete app)
pm2 monit               # Real-time monitoring dashboard
pm2 save                # Save current process list
```

### System Monitoring

```bash
# Resource usage (install if needed: sudo apt-get install htop)
htop

# Disk space
df -h

# Memory usage
free -h

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# System logs
sudo tail -f /var/log/syslog
```

### Database Maintenance

```bash
# Connect to database
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB

# Backup database (if you have write access)
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB > backup-$(date +%Y%m%d).sql

# Test queries
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT COUNT(*) FROM datavalue;"
```

---

## Security Best Practices

### 1. Enable UFW Firewall

```bash
# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS (if using SSL)

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 2. Setup SSL Certificate (Optional)

If you have a domain name:

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### 3. Secure Database Access

- Use strong passwords (20+ characters)
- Restrict security groups to specific IPs only
- Enable SSL/TLS connections if available
- Regular backups
- Monitor access logs

### 4. Keep System Updated

```bash
# Update packages regularly
sudo apt-get update
sudo apt-get upgrade -y

# Update Node.js packages
cd ~/slewars
npm update

# Update PM2
sudo npm update -g pm2

# Reboot if kernel updated
sudo reboot
```

### 5. Secure .env File

```bash
# Restrict .env permissions
chmod 600 .env

# Never commit .env to git
# (should already be in .gitignore)
```

---

## Performance Optimization

### Enable Nginx Gzip Compression

```bash
# Edit Nginx config
sudo nano /etc/nginx/nginx.conf

# Add inside http block:
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### PM2 Cluster Mode (High Traffic)

```bash
# Delete existing backend process
pm2 delete ewars-backend

# Start in cluster mode with max CPU cores
pm2 start server/dist/index.js -i max --name ewars-backend

# Save configuration
pm2 save
```

### Monitor Performance

```bash
# Real-time monitoring
pm2 monit

# Detailed metrics
pm2 describe ewars-backend

# Memory and CPU usage
pm2 status
```

---

## Backup and Recovery

### Application Backup

```bash
# Backup configuration
cp .env .env.backup-$(date +%Y%m%d)

# Save PM2 processes
pm2 save

# Create Lightsail snapshot
# Lightsail Console → Instance → Snapshots → Create snapshot
# Name: ewars-backup-YYYY-MM-DD
```

### Database Backup (if applicable)

```bash
# Full database dump
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB > backup-$(date +%Y%m%d).sql

# Compressed backup
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Restore from Backup

```bash
# Restore .env
cp .env.backup-YYYYMMDD .env

# Restore database
psql -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB < backup-YYYYMMDD.sql

# Rebuild and restart
npm run build:full
pm2 restart all
```

---

## Advanced Configuration

### Custom Domain Setup

```bash
# 1. Point your domain A record to Lightsail static IP

# 2. Update Nginx configuration
sudo nano /etc/nginx/sites-available/ewars

# Change server_name line to:
server_name yourdomain.com www.yourdomain.com;

# 3. Test and reload
sudo nginx -t
sudo systemctl reload nginx

# 4. Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Environment-Specific Configurations

```bash
# Create multiple .env files
cp .env .env.production
cp .env .env.staging

# Load specific environment
pm2 delete all
pm2 start server/dist/index.js --name ewars-backend --env production
```

### Database Connection Pooling

Edit `server/src/config/database.ts` to optimize connection pooling:
```typescript
max: 20,        // Maximum connections
min: 2,         // Minimum connections
idle: 10000,    // Close idle connections after 10s
acquire: 30000  // Max time to acquire connection
```

---

## Monitoring and Alerts

### Setup PM2 Monitoring

```bash
# Link PM2 to Keymetrics (optional)
pm2 link <secret_key> <public_key>

# Or use PM2 Plus
pm2 plus
```

### Custom Health Check Script

Create `health-check.sh`:
```bash
#!/bin/bash
HEALTH=$(curl -s http://localhost/api/health | grep -o "healthy" || echo "")
if [ "$HEALTH" != "healthy" ]; then
    echo "Health check failed! Restarting services..."
    pm2 restart all
    # Send alert (email, SMS, etc.)
fi
```

Schedule with cron:
```bash
crontab -e
# Add line:
*/5 * * * * /home/ubuntu/slewars/health-check.sh
```

---

## Common Maintenance Tasks

### Clear Logs and Free Space

```bash
# Clear PM2 logs
pm2 flush

# Clear Nginx logs
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log

# Clear apt cache
sudo apt-get clean
sudo apt-get autoclean

# Remove old kernels
sudo apt-get autoremove -y

# Check disk usage
df -h
du -sh ~/.pm2/logs/*
```

### Restart After Configuration Changes

```bash
# After .env changes
pm2 restart all

# After Nginx config changes
sudo nginx -t
sudo systemctl reload nginx

# After code changes
npm run build:full
pm2 restart all
```

---

## Support and Resources

**Log Locations:**
- PM2 Logs: `~/.pm2/logs/`
- Nginx Access: `/var/log/nginx/access.log`
- Nginx Errors: `/var/log/nginx/error.log`
- System Logs: `/var/log/syslog`

**Quick Diagnostic Commands:**
```bash
# Full system check
pm2 status && \
sudo systemctl status nginx && \
curl -s http://localhost/api/health && \
echo "All systems operational"

# View recent errors
pm2 logs --lines 100 --nostream | grep -i error
sudo tail -50 /var/log/nginx/error.log
```

**Common Issues Summary:**
| Issue | Quick Fix |
|-------|-----------|
| Backend not starting | Check `.env` database credentials |
| 403 Forbidden | Fix permissions: `chmod +x /home/ubuntu && chmod -R 755 dist` |
| Synthetic data showing | Set `DASHBOARD_DATA_SOURCE=postgres` in `.env` |
| Services die after reboot | Run `pm2 startup` and `pm2 save` |
| Port 4000 in use | `sudo lsof -i :4000` then kill process |

**Need Help?**
1. Check logs: `pm2 logs --lines 100`
2. Verify configuration: `cat .env`
3. Test database: `psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB`
4. Review this guide's Troubleshooting section

---

## Production Deployment Checklist

Before going live:

- [ ] Lightsail instance created and running
- [ ] Static IP attached and noted
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] SSH access working
- [ ] Repository cloned successfully
- [ ] `.env` file created with production credentials
- [ ] Database connection tested and verified
- [ ] Setup script ran successfully
- [ ] Both PM2 services online (backend + ML)
- [ ] Frontend accessible via browser
- [ ] API health check responding
- [ ] All dashboard pages loading real data
- [ ] PM2 auto-start configured
- [ ] System firewall enabled (UFW)
- [ ] SSL certificate installed (if using domain)
- [ ] Monitoring setup
- [ ] Backup strategy in place
- [ ] Documentation updated with production URLs

---

**Deployment Status:** ✅ Production Ready

Your EWARS platform is now deployed on AWS Lightsail with real DHIS2 data!

For technical details and lessons learned, see `DEPLOYMENT_LEARNINGS.md`
