# Backend Deployment Guide - Render

## Deploy Backend to Render

### 1. Create Render Account
- Go to [render.com](https://render.com)
- Sign up / Sign in

### 2. Create New Web Service
1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Select the repository

### 3. Configure Web Service

**Basic Settings:**
- **Name**: `auction-connect-backend` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main`

**Build & Deploy:**
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `node src/server.js`

**Environment Variables:**
Add these in the "Environment" section:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://auction-connect.vercel.app
```

### 4. Deploy
- Click "Create Web Service"
- Wait for deployment (2-5 minutes)
- Render will provide a URL like: `https://auction-connect-backend.onrender.com`

### 5. Update Frontend Environment Variable

After backend is deployed, update `frontend/.env.production`:

```
VITE_API_URL=https://your-render-backend-url.onrender.com/api
```

### 6. Redeploy Frontend

```bash
git add frontend/.env.production
git commit -m "Update backend URL for production"
git push origin main
```

Vercel will automatically redeploy the frontend with the new backend URL.

### 7. Test

- Visit `https://auction-connect.vercel.app`
- Try registering/logging in
- API calls should work with the Render backend

### Notes

- **Socket.IO**: Real-time features will work on Render (supports WebSockets)
- **Free Tier**: Render offers a free tier with some limitations
- **Database**: Make sure MongoDB Atlas allows connections from Render's IP (whitelist `0.0.0.0/0`)
- **Logs**: Check Render logs for any errors in the dashboard
