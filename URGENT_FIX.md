# URGENT: Fix Backend Module Error

## The Problem

Your backend is crashing with:
```
SyntaxError: Cannot use import statement outside a module
```

This is because TypeScript is compiling to ES modules but Node.js is trying to run it as CommonJS.

## Quick Fix - Run These Commands on Lightsail

### Option 1: Use the Fix Script (Recommended)

```bash
# SSH into your Lightsail instance
ssh -i your-key.pem ubuntu@YOUR_LIGHTSAIL_IP

# Pull the latest changes (includes fix script)
cd ~/slewars
git pull origin main

# Run the fix script
chmod +x fix-backend-modules.sh
./fix-backend-modules.sh
```

### Option 2: Manual Fix (If script doesn't work)

```bash
# SSH into your Lightsail instance
cd ~/slewars

# Stop backend
pm2 stop ewars-backend

# Clean and rebuild
rm -rf server/dist

# Create package.json files to force CommonJS
echo '{"type":"commonjs"}' > server/package.json

# Rebuild
npm run server:build

# CRITICAL: Create this file AFTER build
echo '{"type":"commonjs"}' > server/dist/package.json

# Restart backend
pm2 delete ewars-backend
pm2 start npm --name "ewars-backend" -- run server:start

# Check logs
pm2 logs ewars-backend --lines 30
```

### Option 3: Alternative - Use Node with ES Module Flag

If the above doesn't work, modify the start script:

```bash
cd ~/slewars

# Edit package.json on Lightsail
nano package.json

# Change this line:
# "server:start": "npm run db:init && node server/dist/index.js",
# To this:
# "server:start": "npm run db:init && node --input-type=module server/dist/index.js",

# Or use this sed command:
sed -i 's|node server/dist/index.js|node --input-type=module server/dist/index.js|g' package.json

# Restart
pm2 restart ewars-backend
```

## What to Expect

### Success Output:
```
✓ Database connection successful
✓ Database initialization completed successfully
{"level":30,"time":...,"msg":"API server listening","port":4000}
{"level":30,"time":...,"msg":"Trained outbreak risk model"}
```

### If Still Failing:

Check the actual error:
```bash
pm2 logs ewars-backend --lines 50
```

And share the output so I can provide the next fix.

## Why This Happens

1. Root `package.json` has `"type": "module"` (needed for Vite frontend)
2. TypeScript sees this and compiles backend to ES modules
3. Node.js tries to run it as CommonJS (default)
4. Result: SyntaxError

## The Fix

Add `server/dist/package.json` with `{"type":"commonjs"}` which tells Node.js to use CommonJS module resolution for the compiled code, regardless of what the root says.

## Verification

After fixing, test the API:
```bash
# Should return JSON
curl http://localhost:4000/api/health
curl http://localhost:4000/api/diseases
```

Then test in browser - the 502 Bad Gateway error should be gone!
