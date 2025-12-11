# AWS Lightsail Deployment - Technical Learnings

## Project Context
EWARS (Early Warning and Response System) Platform deployed on AWS Lightsail connecting to DHIS2 PostgreSQL database for disease surveillance data.

---

## Critical Learning: Module System Configuration

### The Confusion
Initial error logs showed:
```
SyntaxError: Cannot use import statement outside a module
```

This led to incorrect assumption that we needed to change to ES modules.

### The Reality

**TypeScript Compilation Process:**
1. **Source Code** (`server/src/`): Written in ES module syntax
   ```typescript
   import { app } from "./app.js";  // ES module syntax
   ```

2. **TypeScript Configuration** (`server/tsconfig.json`):
   ```json
   {
     "compilerOptions": {
       "module": "commonjs",  // ← Compiles TO CommonJS
       "target": "ES2020"
     }
   }
   ```

3. **Compiled Code** (`server/dist/`): Output is CommonJS
   ```javascript
   const app_1 = require("./app.js");  // CommonJS syntax
   ```

4. **Package Configuration** (`server/package.json`): Must match output
   ```json
   {"type": "commonjs"}  // ← CORRECT for this setup
   ```

### The Mistake
Changing `server/package.json` to `{"type":"module"}` broke the deployment because:
- Compiled code is CommonJS (uses `require`)
- Node.js was told to expect ES modules (uses `import`)
- Result: Type mismatch error

### The Correct Configuration
```
Source (ES modules) → TypeScript → Output (CommonJS) → Node.js (CommonJS)
                     [compiles]                      [executes]
```

**Key Files:**
- `server/tsconfig.json`: `"module": "commonjs"` ✓
- `server/package.json`: `{"type":"commonjs"}` ✓
- `server/dist/package.json`: `{"type":"commonjs"}` ✓

---

## Data Source Configuration

### Issue
Application was showing synthetic/demo data instead of real DHIS2 data.

### Root Cause
Environment variable `DASHBOARD_DATA_SOURCE` has multiple options:
- `synthetic`: Uses generated demo data
- `postgres`: Connects to DHIS2 PostgreSQL database directly
- `dhis2`: Uses DHIS2 REST API
- `hybrid`: Mix of sources

The setup script was defaulting to `synthetic`.

### Solution
Set in `.env`:
```bash
DASHBOARD_DATA_SOURCE=postgres
```

This requires PostgreSQL connection details:
```bash
POSTGRES_HOST=your-dhis2-db-host
POSTGRES_PORT=5432
POSTGRES_DB=dhis2_database_name
POSTGRES_USER=username
POSTGRES_PASSWORD=password
```

---

## PM2 Log Management

### Issue
Old error logs persisted even after fixes were applied, causing confusion about current state.

### Solution
Always flush PM2 logs after major changes:
```bash
pm2 flush          # Clear all logs
pm2 restart all    # Restart services
pm2 logs --lines 30  # View fresh logs
```

### Best Practice
When troubleshooting:
1. Make configuration change
2. Restart service: `pm2 restart <service>`
3. Clear logs: `pm2 flush`
4. View fresh logs: `pm2 logs <service> --lines 50`

This ensures you're seeing current state, not old errors.

---

## Nginx Configuration

### Reverse Proxy Setup
Frontend (static files) and backend (API) run on same domain:

```nginx
server {
    listen 80;
    server_name your-ip-or-domain;

    # Serve frontend static files
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;  # SPA routing
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Why This Works
- Frontend makes relative requests: `fetch('/api/disease-data')`
- Nginx routes `/api/*` to backend on port 4000
- Frontend and backend share same origin (no CORS issues)

---

## Database Connection Verification

### Before Deployment
Test database connectivity from Lightsail instance:

```bash
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;"
```

### Common Issues

1. **Connection Timeout**
   - Check security groups allow Lightsail IP
   - Verify database firewall rules

2. **Authentication Failed**
   - Verify credentials in `.env`
   - Check user permissions in PostgreSQL

3. **Database Not Found**
   - Confirm database name is correct
   - Use exact case-sensitive name

### DHIS2 Database Validation
Verify it's a DHIS2 database:
```bash
psql -h $HOST -U $USER -d $DB -c "\dt" | grep datavalue
```

Should show DHIS2 tables like:
- `datavalue`
- `organisationunit`
- `dataelement`
- `period`

---

## Build Process

### Correct Order
```bash
1. npm install              # Install dependencies
2. npm run server:build     # Compile TypeScript to CommonJS
3. npm run build            # Build frontend (Vite)
```

Combined:
```bash
npm run build:full  # Runs both backend and frontend builds
```

### What Happens
1. **Backend Build**: `tsc -p server/tsconfig.json`
   - Reads `server/tsconfig.json`
   - Compiles `server/src/*.ts` → `server/dist/*.js`
   - Respects `"module": "commonjs"` setting

2. **Frontend Build**: `vite build`
   - Bundles React application
   - Creates optimized static files in `dist/`

### Verification
```bash
# Backend compiled correctly
ls -la server/dist/index.js

# Frontend built correctly
ls -la dist/index.html

# Module system correct
cat server/dist/package.json  # Should be commonjs
```

---

## Environment Variables

### Critical Variables

**Server Configuration:**
```bash
NODE_ENV=production
PORT=4000
```

**Data Source:**
```bash
DASHBOARD_DATA_SOURCE=postgres  # Use DHIS2 database
```

**Database Connection:**
```bash
POSTGRES_HOST=your-db-host
POSTGRES_PORT=5432
POSTGRES_DB=dhis2_database
POSTGRES_USER=username
POSTGRES_PASSWORD=password
```

**ML Service:**
```bash
ML_SERVICE_URL=http://localhost:8000
```

### Frontend Variables
Must have `VITE_` prefix to be available in browser:
```bash
VITE_OPENWEATHER_API_KEY=key
VITE_MAPBOX_TOKEN=token
VITE_PEXELS_API_KEY=key
```

---

## Troubleshooting Methodology

### 1. Check Service Status
```bash
pm2 status
```

### 2. View Logs
```bash
pm2 logs ewars-backend --lines 50
pm2 logs ewars-ml --lines 50
```

### 3. Test Backend Directly
```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/disease-data/overview
```

### 4. Check Nginx
```bash
sudo nginx -t
sudo systemctl status nginx
curl http://localhost/api/health
```

### 5. Verify Database Connection
```bash
# From .env
source .env
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT COUNT(*) FROM datavalue;"
```

### 6. Check File Permissions
```bash
ls -la server/dist/
ls -la dist/
```

---

## Common Pitfalls

### 1. Module System Mismatch
❌ **Wrong**: Changing package.json without understanding compilation
✓ **Right**: Match package.json to compiled output (CommonJS)

### 2. Stale Logs
❌ **Wrong**: Debugging based on old error logs
✓ **Right**: Always flush logs after changes

### 3. Wrong Data Source
❌ **Wrong**: Leaving `DASHBOARD_DATA_SOURCE=synthetic`
✓ **Right**: Set to `postgres` for real DHIS2 data

### 4. Database Connectivity
❌ **Wrong**: Assuming database is accessible
✓ **Right**: Test connection before deployment

### 5. Build Order
❌ **Wrong**: Starting services without building first
✓ **Right**: Build → Verify → Start services

---

## Security Best Practices

### 1. Environment Variables
- Never commit `.env` to git
- Use strong database passwords
- Rotate credentials regularly

### 2. Firewall Configuration
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 3. Database Access
- Restrict to specific IP addresses
- Use read-only user if possible
- Enable SSL connections

### 4. Nginx Security Headers
```nginx
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
```

### 5. PM2 Process Isolation
```bash
pm2 start app.js --user ubuntu  # Run as non-root
```

---

## Performance Optimization

### 1. PM2 Cluster Mode
For high traffic:
```bash
pm2 start server/dist/index.js -i max --name ewars-backend
```

### 2. Nginx Caching
```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. PostgreSQL Connection Pool
Already configured in application:
```typescript
pool: {
  max: 20,
  min: 5,
  idle: 10000
}
```

### 4. Enable Gzip
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

---

## Monitoring

### Essential Metrics

**1. Service Health**
```bash
pm2 monit  # Real-time monitoring
```

**2. Resource Usage**
```bash
htop       # CPU, memory
df -h      # Disk space
```

**3. Nginx Logs**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**4. Application Logs**
```bash
pm2 logs --lines 100
```

---

## Backup and Recovery

### Database Backups
```bash
# Dump DHIS2 data
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB > backup.sql

# Restore if needed
psql -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB < backup.sql
```

### Application Backups
```bash
# Backup .env and PM2 config
cp .env .env.backup
pm2 save
```

### Rollback Procedure
```bash
git checkout <previous-commit>
npm install
npm run build:full
pm2 restart all
```

---

## Key Takeaways

1. **Understand Your Build System**: Know what TypeScript compiles to
2. **Verify Before Assuming**: Test database connectivity before deployment
3. **Fresh Logs Matter**: Always clear old logs when troubleshooting
4. **Environment First**: Set correct environment variables before starting
5. **Test Each Layer**: Backend → Nginx → Browser
6. **Document Working State**: Save known-good configurations

---

**Summary**: The deployment works perfectly when you respect the TypeScript compilation settings (CommonJS output), set correct environment variables (postgres data source), and verify database connectivity upfront. The errors encountered were due to incorrect assumptions about the module system, not actual bugs in the application code.
