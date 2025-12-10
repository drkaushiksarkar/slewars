# AWS Lightsail Deployment Guide

Clean, straightforward deployment guide for EWARS Platform on AWS Lightsail.

**Time Required:** 30 minutes
**Cost:** $10-20/month (Lightsail only)
**Tested:** Ubuntu 22.04 LTS, Node.js 18, Python 3.10

---

## Prerequisites

✓ AWS Account with Lightsail access
✓ DHIS2 PostgreSQL database (host, credentials)
✓ GitHub access to repository
✓ Basic terminal/SSH knowledge

---

## Quick Start

### 1. Create Lightsail Instance

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com/)
2. Click **"Create instance"**
3. Select:
   - **Platform:** Linux/Unix
   - **Blueprint:** Ubuntu 22.04 LTS
   - **Plan:** $20/month (4 GB RAM, 2 vCPU) recommended
4. Name: `ewars-production`
5. Click **"Create instance"**

### 2. Configure Networking

**Firewall:**
- Instance → Networking → IPv4 Firewall
- Add rule: HTTP (port 80)

**Static IP (Recommended):**
- Networking tab → Create static IP
- Attach to your instance
- Note the IP address

**Database Access (if using RDS):**
- RDS Console → Your database → Security groups
- Add inbound rule: PostgreSQL (5432) from `your-lightsail-ip/32`

### 3. Connect to Instance

```bash
# SSH from local machine
ssh -i YourKey.pem ubuntu@YOUR_STATIC_IP

# Or use browser-based SSH from Lightsail console
```

### 4. Clone Repository

```bash
# For public repos
git clone https://github.com/your-org/slewars.git
cd slewars

# For private repos (setup SSH key first)
ssh-keygen -t ed25519 -C "your@email.com"  # Press Enter for all prompts
cat ~/.ssh/id_ed25519.pub  # Add to GitHub Settings > SSH Keys
git clone git@github.com:your-org/slewars.git
cd slewars
```

### 5. Run Automated Setup

```bash
chmod +x lightsail-setup.sh
./lightsail-setup.sh
```

**This script installs:**
- Node.js 18
- PostgreSQL client
- Python 3 + pip
- PM2 (process manager)
- Nginx (web server)
- All application dependencies
- Builds frontend and backend
- Configures Nginx reverse proxy
- Sets up PM2 to auto-start on boot

**⏱️ Takes 10-15 minutes**

### 6. Configure Environment

After setup completes, **edit the `.env` file**:

```bash
nano .env
```

**Update these critical values:**

```bash
# Production mode
NODE_ENV=production

# Data source - MUST be postgres for DHIS2 data
DASHBOARD_DATA_SOURCE=postgres

# Your DHIS2 Database Credentials
POSTGRES_HOST=your-dhis2-db.region.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=your_dhis2_database_name
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password
```

Save (Ctrl+X, Y, Enter)

### 7. Restart Services

```bash
pm2 restart all
pm2 logs ewars-backend --lines 30
```

**Look for:**
- ✓ Database connection successful
- ✓ API server listening on port 4000
- ✗ NO module errors

### 8. Access Application

Open browser: `http://YOUR_STATIC_IP`

You should see the EWARS dashboard loading real DHIS2 data.

---

## Verification Checklist

After deployment, verify:

```bash
# 1. Services running
pm2 status
# Should show: ewars-backend (online), ewars-ml (online)

# 2. Backend responding
curl http://localhost:4000/api/health
# Should return: {"status":"healthy"}

# 3. API working through Nginx
curl http://localhost/api/health
# Should return: {"status":"healthy"}

# 4. Database connection
pm2 logs ewars-backend | grep -i "database"
# Should show successful connection

# 5. No errors
pm2 logs --lines 50 --nostream
# Should be clean, no module errors
```

**Browser checks:**
- [ ] Overview page loads with data
- [ ] Disease Analysis page shows disease data
- [ ] Location Analysis displays map
- [ ] Climate page shows trends
- [ ] Forecast page generates predictions

---

## Troubleshooting

### Backend Won't Start

**Check logs:**
```bash
pm2 logs ewars-backend --lines 50
```

**Common issues:**

1. **Database connection failed**
   ```bash
   # Test connectivity
   psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB
   ```
   - Verify credentials in `.env`
   - Check security groups allow Lightsail IP
   - Confirm database is accessible

2. **Port already in use**
   ```bash
   sudo lsof -i :4000
   sudo kill -9 <PID>
   pm2 restart ewars-backend
   ```

3. **Module system errors**
   ```bash
   # Verify correct configuration
   cat server/dist/package.json
   # Should show: {"type":"commonjs"}

   # If missing, rebuild
   npm run server:build
   pm2 restart all
   ```

### Pages Not Loading

1. **Check Nginx**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

2. **Check frontend built**
   ```bash
   ls -la dist/index.html
   # Should exist
   ```

3. **Rebuild if needed**
   ```bash
   npm run build:full
   sudo systemctl reload nginx
   ```

### Still Showing Synthetic Data

```bash
# Check .env
grep DASHBOARD_DATA_SOURCE .env
# Must show: DASHBOARD_DATA_SOURCE=postgres

# If not, edit and restart
nano .env  # Change to postgres
pm2 restart all
```

---

## Maintenance

### Update Application

```bash
cd ~/slewars
git pull
npm install
npm run build:full
pm2 restart all
pm2 logs --lines 30
```

### View Logs

```bash
# All logs
pm2 logs

# Specific service
pm2 logs ewars-backend
pm2 logs ewars-ml

# Last N lines
pm2 logs --lines 100 --nostream

# Clear old logs
pm2 flush
```

### PM2 Commands

```bash
pm2 status          # View all processes
pm2 restart all     # Restart all services
pm2 stop all        # Stop all services
pm2 start all       # Start all services
pm2 delete all      # Remove all processes
pm2 monit           # Real-time monitoring
pm2 save            # Save current process list
```

### System Monitoring

```bash
# Resource usage
htop

# Disk space
df -h

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Database queries
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB
```

---

## Security

### 1. Enable Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. SSL Certificate (Optional)

If you have a domain:

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

### 3. Secure Database

- Use strong passwords
- Restrict access to specific IPs
- Enable SSL connections
- Regular backups

### 4. Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo reboot  # If kernel updated
```

---

## Performance

### Enable Nginx Gzip

Edit `/etc/nginx/nginx.conf`:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### PM2 Cluster Mode

For high traffic:
```bash
pm2 delete ewars-backend
pm2 start server/dist/index.js -i max --name ewars-backend
pm2 save
```

---

## Backup

### Database

```bash
# Backup
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB > backup-$(date +%Y%m%d).sql

# Restore
psql -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB < backup.sql
```

### Application

```bash
# Backup configuration
cp .env .env.backup
pm2 save

# Create snapshot in Lightsail Console
# Instance → Snapshots → Create snapshot
```

---

## Support

**Logs Location:**
- PM2: `~/.pm2/logs/`
- Nginx: `/var/log/nginx/`
- System: `/var/log/syslog`

**Common Commands:**
```bash
pm2 logs --lines 200          # Application logs
sudo tail -100 /var/log/nginx/error.log  # Nginx errors
journalctl -u pm2-ubuntu -f   # PM2 service logs
```

**Need Help?**
- Check `DEPLOYMENT_LEARNINGS.md` for technical details
- Review PM2 logs for specific errors
- Verify database connectivity
- Ensure `.env` is configured correctly

---

## Production Checklist

Before going live:

- [ ] Static IP configured
- [ ] Firewall rules set (ports 22, 80, 443)
- [ ] Database accessible and tested
- [ ] `.env` configured with production values
- [ ] DASHBOARD_DATA_SOURCE=postgres
- [ ] SSL certificate installed (if using domain)
- [ ] All pages load correctly in browser
- [ ] PM2 auto-start enabled
- [ ] Monitoring set up
- [ ] Backup strategy in place
- [ ] Security updates applied

---

**Deployment complete!** Your EWARS platform is now running on AWS Lightsail with real DHIS2 data.

For technical details and architecture decisions, see `DEPLOYMENT_LEARNINGS.md`.
