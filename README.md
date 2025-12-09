# EWARS Platform - Early Warning, Alert, and Response System

A modern climate-aware Early Warning, Alert, and Response System with machine learning-powered outbreak prediction, real-time surveillance, and DHIS2 integration.

## Features

- **Real-time Disease Surveillance** - Track disease outbreaks across regions
- **ML-Powered Predictions** - Outbreak risk forecasting using logistic regression and anomaly detection
- **DHIS2 Integration** - Direct integration with DHIS2 health information systems
- **Interactive Maps** - Province-level visualization with Mapbox integration
- **Climate Data Analysis** - Weather and environmental risk factors
- **Configurable Alerts** - Automated outbreak detection and notifications

## Technology Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Radix UI, Mapbox GL
- **Backend:** Node.js, Express, TypeScript, PostgreSQL
- **ML Service:** Python, Flask, scikit-learn, pandas
- **Process Management:** PM2
- **Web Server:** Nginx

---

## Quick Deployment to AWS Lightsail

**Fastest way to deploy to production:**

### 1. Create Lightsail Instance

- Go to AWS Lightsail console
- Create Ubuntu 22.04 LTS instance ($10/month recommended)
- Configure firewall to allow HTTP (port 80)

### 2. Connect and Deploy

SSH into your instance and run:

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Run automated setup (one command!)
./lightsail-setup.sh
```

**That's it!** The script will:
- Install all dependencies (Node.js, PostgreSQL, Python)
- Set up the database
- Build the application
- Configure Nginx reverse proxy
- Start all services with PM2
- Configure auto-restart on reboot

**Access your app:** `http://YOUR_LIGHTSAIL_IP`

**Detailed Guide:** See [LIGHTSAIL_DEPLOYMENT.md](./LIGHTSAIL_DEPLOYMENT.md) for complete step-by-step instructions.

---

## Local Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Python 3.9+
- Git

### Quick Start

```bash
# Install dependencies and setup
npm install
./setup.sh

# Start all services (frontend, backend, ML)
npm run dev:full
```

**Services will be available at:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- ML Service: http://localhost:8000

### Manual Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Setup ML service:**
   ```bash
   cd server/ml-service
   ./setup.sh
   cd ../..
   ```

4. **Run application:**
   ```bash
   npm run dev:full
   ```

---

## Environment Configuration

Create `.env` file with these settings:

```bash
# Server
NODE_ENV=development
PORT=4000

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ewars_db
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password

# Data Source
DASHBOARD_DATA_SOURCE=synthetic  # or 'dhis2' or 'hybrid'

# DHIS2 (Optional)
DHIS2_BASE_URL=https://your-dhis2-instance.org
DHIS2_USERNAME=your_username
DHIS2_PASSWORD=your_password

# API Keys (Optional)
MAPBOX_TOKEN=your_mapbox_token
OPENWEATHER_API_KEY=your_api_key
```

---

## Production Build

```bash
# Build both backend and frontend
npm run build:full

# Start in production mode
npm run production:start
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config/countries` | Get country configurations |
| `GET` | `/api/data/overview` | Get dashboard overview data |
| `GET` | `/api/dhis2/analytics` | DHIS2 analytics proxy |
| `POST` | `/api/ml/predict` | Outbreak risk prediction |
| `POST` | `/api/ml/anomalies` | Anomaly detection |

---

## Deployment Options

### AWS Lightsail (Recommended)
- **Best for:** Production deployment, professional hosting
- **Cost:** $10-20/month
- **Setup time:** 30 minutes
- **Guide:** [LIGHTSAIL_DEPLOYMENT.md](./LIGHTSAIL_DEPLOYMENT.md)

### AWS App Runner
- **Best for:** Auto-scaling applications
- **Cost:** $50-100/month
- **Requires:** Docker configuration, 2 services

### Other Platforms
- **Railway / Render:** Easy deployment, built-in PostgreSQL
- **AWS EC2:** Full control, more complex setup
- **Docker:** Container-based deployment

---

## Project Structure

```
.
├── src/                    # Frontend React application
├── server/
│   ├── src/               # Backend Express server
│   ├── ml-service/        # Python ML service
│   ├── config/            # Configuration files
│   └── scripts/           # Database initialization
├── public/                # Static assets
├── dist/                  # Built frontend (generated)
├── lightsail-setup.sh     # AWS Lightsail deployment script
└── LIGHTSAIL_DEPLOYMENT.md # Detailed deployment guide
```

---

## Management Commands

### PM2 (Production)

```bash
pm2 status              # Check service status
pm2 logs                # View logs
pm2 restart all         # Restart all services
pm2 monit               # Monitor resources
```

### Development

```bash
npm run dev             # Frontend only
npm run server-dev      # Backend only
npm run dev:full        # All services
```

### Database

```bash
npm run db:init         # Initialize database
psql -U ewars_user -d ewars_db  # Connect to database
```

---

## Monitoring and Logs

**Application Logs:**
```bash
pm2 logs ewars-backend
pm2 logs ewars-ml
```

**Nginx Logs:**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**System Resources:**
```bash
pm2 monit
htop
```

---

## Troubleshooting

### Application won't start
```bash
# Check PM2 status
pm2 status
pm2 logs

# Restart services
pm2 restart all
```

### Database connection errors
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify credentials
cat .env | grep POSTGRES
```

### Port already in use
```bash
# Find process using port
lsof -i :4000

# Kill process
kill -9 PID
```

---

## Security

**Production Recommendations:**
- Enable HTTPS with Let's Encrypt SSL certificate
- Use strong database passwords
- Keep system packages updated
- Restrict SSH access to specific IPs
- Enable UFW firewall
- Use environment variables for secrets
- Enable automatic security updates

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

See [LICENSE](./LICENSE) file for details.

---

## Support

For deployment issues, see [LIGHTSAIL_DEPLOYMENT.md](./LIGHTSAIL_DEPLOYMENT.md) troubleshooting section.

For DHIS2 integration questions, ensure your credentials are correct in `.env` file.

---

## Architecture

**Data Flow:**
```
User Browser
    ↓
Nginx (Port 80) → Frontend (Static Files)
    ↓
    → Backend API (Port 4000)
        ↓
        ├─→ PostgreSQL Database
        ├─→ ML Service (Port 8000)
        └─→ DHIS2 (Optional)
```

**Services:**
- **Frontend:** React SPA served by Nginx
- **Backend:** Express API server with PM2
- **ML Service:** Python Flask service with PM2
- **Database:** PostgreSQL for data storage
- **Proxy:** Nginx reverse proxy for routing

---

## Performance

**Recommended Instance Specs:**
- **Minimum:** 2 GB RAM, 1 vCPU (Lightsail $10/month)
- **Recommended:** 4 GB RAM, 2 vCPU (Lightsail $20/month)
- **Storage:** 60 GB SSD minimum

**Optimization Tips:**
- Enable Nginx caching
- Use PM2 cluster mode for backend
- Add swap space if needed
- Monitor with PM2 and system tools

---

## Updates

To update deployed application:

```bash
cd ~/your-repo
git pull origin main
npm install
npm run build:full
pm2 restart all
```

---

**Ready to deploy?** Follow the [LIGHTSAIL_DEPLOYMENT.md](./LIGHTSAIL_DEPLOYMENT.md) guide!
