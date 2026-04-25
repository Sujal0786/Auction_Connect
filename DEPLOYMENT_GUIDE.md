# Deployment Guide - British Auction RFQ System

This guide will help you deploy the British Auction RFQ System to Vercel.

---

## Architecture Overview

The system consists of:
- **Frontend:** React + Vite (deployed to Vercel)
- **Backend:** Node.js + Express (deployed to Vercel as Serverless Functions)
- **Database:** MongoDB Atlas (cloud database)
- **Real-time:** Socket.IO (will need adaptation for serverless)

---

## Prerequisites

1. **Vercel Account** - Create account at [vercel.com](https://vercel.com)
2. **MongoDB Atlas Account** - Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
3. **Git Repository** - Push your code to GitHub/GitLab/Bitbucket
4. **Node.js** - v18 or higher installed locally

---

## Step 1: Set Up MongoDB Atlas

### 1.1 Create MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up / Sign in
3. Click "Build a Database"
4. Choose "FREE" tier (M0 Sandbox)
5. Select a cloud provider and region (choose closest to your users)
6. Name your cluster (e.g., `rfq-auction-db`)
7. Click "Create"
8. Wait for cluster to be created (2-5 minutes)

### 1.2 Configure Database Access

1. Go to "Database Access" in left sidebar
2. Click "Add New Database User"
3. Authentication Method: "Password"
4. Username: `rfq-admin` (or your preferred username)
5. Password: Generate a strong password (save it securely)
6. Click "Add User"

### 1.3 Configure Network Access

1. Go to "Network Access" in left sidebar
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0) for development
4. For production, add Vercel's IP ranges
5. Click "Confirm"

### 1.4 Get Connection String

1. Go to "Database" in left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: "Node.js"
5. Version: "4.1 or later"
6. Copy the connection string
7. Replace `<password>` with your actual password
8. Save this string for later

**Example connection string:**
```
mongodb+srv://rfq-admin:your-password@rfq-auction-db.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

---

## Step 2: Prepare Backend for Vercel

### 2.1 Restructure Backend for Serverless

Vercel requires serverless functions. Restructure your backend:

```bash
# Create vercel directory structure
backend/
├── api/
│   ├── auth/
│   │   ├── register.js
│   │   ├── login.js
│   │   ├── me.js
│   │   └── suppliers.js
│   ├── rfqs/
│   │   ├── index.js
│   │   ├── [id].js
│   │   ├── my-rfqs.js
│   │   ├── [id]/cancel.js
│   │   └── [id]/select-winner.js
│   ├── bids/
│   │   ├── [rfqId]/bids.js
│   │   ├── [rfqId]/rankings.js
│   │   └── my-bids.js
│   ├── dashboard/
│   │   ├── buyer.js
│   │   ├── supplier.js
│   │   └── admin.js
│   └── logs/
│       └── [rfqId]/logs.js
├── lib/
│   ├── db.js
│   ├── models/
│   │   ├── RFQ.js
│   │   ├── Bid.js
│   │   ├── User.js
│   │   └── ActivityLog.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   ├── utils/
│   │   └── auctionStatus.js
│   ├── constants/
│   │   └── auctionConstants.js
│   └── config/
│       └── socket.js
└── package.json
```

### 2.2 Create Database Connection Pool

Create `backend/api/lib/db.js`:

```javascript
const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectToDatabase;
```

### 2.3 Convert Controllers to Serverless Functions

Example: `backend/api/api/rfqs/index.js`:

```javascript
const connectToDatabase = require('../lib/db');
const RFQ = require('../lib/models/RFQ');
const { RFQ_STATUS } = require('../lib/constants/auctionConstants');
const { getAuctionStatus } = require('../lib/utils/auctionStatus');

module.exports = async (req, res) => {
  try {
    await connectToDatabase();

    if (req.method === 'GET') {
      // Your getAllRFQs logic here
      const { status } = req.query;
      const user = req.user; // From auth middleware
      // ... rest of your logic
    } else if (req.method === 'POST') {
      // Your createRFQ logic here
      // ... rest of your logic
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### 2.4 Create Vercel Configuration

Create `backend/vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

### 2.5 Update Backend package.json

```json
{
  "name": "rfq-backend",
  "version": "1.0.0",
  "description": "RFQ Backend API",
  "main": "api/index.js",
  "scripts": {
    "dev": "node server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.0.3",
    "socket.io": "^4.6.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 2.6 Create .env.example for Backend

Create `backend/.env.example`:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

---

## Step 3: Prepare Frontend for Vercel

### 3.1 Update Environment Variables

Create `frontend/.env.production`:

```
VITE_API_URL=https://your-backend.vercel.app/api
```

### 3.2 Update Vite Config

Create or update `frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
```

### 3.3 Update Frontend package.json

Ensure your `frontend/package.json` has:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "framer-motion": "^10.16.16",
    "lucide-react": "^0.303.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1"
  }
}
```

---

## Step 4: Deploy Backend to Vercel

### 4.1 Push Code to GitHub

```bash
cd c:\Users\sujal\Downloads\rfq
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/rfq-auction.git
git push -u origin main
```

### 4.2 Import Backend Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the `backend` folder as root directory
5. Configure environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Generate a secure random string (use: `openssl rand -base64 32`)
   - `NODE_ENV`: `production`
6. Click "Deploy"

### 4.3 Get Backend URL

After deployment, Vercel will provide a URL like:
```
https://rfq-backend-xyz.vercel.app
```

Save this URL for frontend configuration.

---

## Step 5: Deploy Frontend to Vercel

### 5.1 Import Frontend Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the `frontend` folder as root directory
5. Configure environment variables:
   - `VITE_API_URL`: Your backend URL from Step 4.3
6. Click "Deploy"

### 5.2 Get Frontend URL

After deployment, Vercel will provide a URL like:
```
https://rfq-frontend-xyz.vercel.app
```

---

## Step 6: Handle Socket.IO (Real-time Features)

**Note:** Socket.IO doesn't work natively with serverless functions. You have two options:

### Option A: Use a Separate Socket Server

Deploy Socket.IO server to Render/Railway:

1. Create a separate Socket.IO server
2. Deploy to [Render](https://render.com) or [Railway](https://railway.app)
3. Update frontend to connect to this separate server

### Option B: Use Polling Fallback (Simpler)

For now, use HTTP polling instead of Socket.IO:

1. Remove Socket.IO dependencies
2. Use `setInterval` to poll for updates
3. This is simpler but less efficient

### Option C: Use Vercel Edge Functions (Advanced)

Use Vercel Edge Functions with WebSockets support (experimental).

---

## Step 7: Post-Deployment Configuration

### 7.1 Update CORS Settings

If you encounter CORS errors, update your backend:

In your middleware or server setup:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-frontend.vercel.app'
  ],
  credentials: true
}));
```

### 7.2 Test Endpoints

Test your deployed backend:
```bash
# Test health endpoint (if you have one)
curl https://your-backend.vercel.app/api/health

# Test auth endpoint
curl -X POST https://your-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 7.3 Test Frontend

1. Open your frontend URL
2. Try logging in with demo credentials
3. Test creating an RFQ
4. Test submitting a bid

---

## Step 8: Monitor and Debug

### 8.1 Vercel Logs

1. Go to Vercel Dashboard
2. Select your project
3. Click "Logs" tab
4. View real-time logs

### 8.2 MongoDB Atlas Monitoring

1. Go to MongoDB Atlas Dashboard
2. Select your cluster
3. View metrics and logs

### 8.3 Common Issues

**Issue: Database connection timeout**
- Solution: Check IP whitelist in MongoDB Atlas
- Ensure 0.0.0.0/0 is added for development

**Issue: Environment variables not working**
- Solution: Redeploy after adding environment variables
- Check variable names match exactly

**Issue: CORS errors**
- Solution: Update CORS origin list in backend
- Ensure frontend URL is allowed

**Issue: 504 Gateway Timeout**
- Solution: Vercel serverless functions have 10-60s timeout
- Optimize your database queries
- Consider using background jobs for long operations

---

## Alternative: Deploy Everything on Render

If Vercel serverless is too complex, deploy to Render:

### Backend on Render

1. Create `Procfile` in backend root:
```
web: node server.js
```

2. Push to GitHub
3. Import to Render
4. Add environment variables
5. Deploy

### Frontend on Vercel

Follow Step 5 above, but use Render backend URL.

---

## Security Checklist

- [ ] Change default JWT_SECRET to a secure random string
- [ ] Enable MongoDB Atlas IP whitelist for production
- [ ] Use HTTPS only (Vercel provides this automatically)
- [ ] Remove console.log statements from production code
- [ ] Implement rate limiting on API endpoints
- [ ] Add request validation
- [ ] Enable MongoDB Atlas encryption at rest
- [ ] Regularly update dependencies

---

## Cost Estimate

**Free Tier:**
- Vercel: Free (100GB bandwidth/month)
- MongoDB Atlas: Free (512MB storage)
- Render: Free (750 hours/month)

**Estimated Monthly Cost:** $0 (Free tier sufficient for development/small projects)

---

## Troubleshooting

### Backend not responding
- Check Vercel logs
- Verify MongoDB connection string
- Ensure all environment variables are set

### Frontend not loading
- Check browser console for errors
- Verify API URL is correct
- Check CORS configuration

### Database connection failed
- Verify MongoDB Atlas cluster is running
- Check IP whitelist
- Verify username and password

---

## Next Steps

1. Deploy backend to Vercel
2. Deploy frontend to Vercel
3. Test all functionality
4. Monitor logs and performance
5. Set up custom domain (optional)
6. Configure SSL certificates (automatic on Vercel)

---

## Support

- Vercel Docs: https://vercel.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- React Docs: https://react.dev
- Express Docs: https://expressjs.com

---

**Last Updated:** April 25, 2026
