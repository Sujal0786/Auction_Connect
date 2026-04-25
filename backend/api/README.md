# Backend Serverless Functions - Vercel Deployment

This directory contains the backend API restructured for Vercel serverless functions.

## Structure

```
api/
├── auth/              # Authentication endpoints
│   ├── register.js
│   ├── login.js
│   ├── me.js
│   └── suppliers.js
├── rfqs/              # RFQ endpoints
│   ├── index.js              # GET all, POST create
│   ├── [id].js               # GET by ID, PUT update
│   ├── my-rfqs.js            # GET my invited RFQs
│   ├── [id]/cancel.js        # PATCH cancel
│   └── [id]/select-winner.js # PATCH select winner
├── bids/              # Bid endpoints
│   ├── [rfqId]/bids.js       # POST submit, GET all
│   ├── [rfqId]/rankings.js   # GET rankings
│   └── my-bids.js            # GET my bids
├── dashboard/         # Dashboard endpoints
│   ├── buyer.js
│   ├── supplier.js
│   └── admin.js
├── logs/              # Activity log endpoints
│   └── [rfqId]/logs.js
└── lib/               # Shared libraries
    ├── db.js                  # Database connection pool
    ├── models/                # Mongoose models
    ├── middleware/            # Auth & role middleware
    ├── utils/                 # Utility functions
    └── constants/            # Constants
```

## Environment Variables

Required environment variables for Vercel:

- `MONGODB_URI`: MongoDB Atlas connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `NODE_ENV`: Set to `production`

## Deployment Steps

### 1. Set up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist IP addresses (0.0.0.0/0 for development)
5. Get connection string

### 2. Push to GitHub

```bash
cd backend
git init
git add .
git commit -m "Restructured for Vercel serverless"
git push origin main
```

### 3. Deploy to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Set root directory to `backend`
5. Add environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Generate with `openssl rand -base64 32`
   - `NODE_ENV`: `production`
6. Click "Deploy"

### 4. Get Backend URL

After deployment, Vercel will provide a URL like:
```
https://rfq-backend-xyz.vercel.app
```

Use this URL in your frontend `.env.production`:
```
VITE_API_URL=https://rfq-backend-xyz.vercel.app/api
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/suppliers` - Get all suppliers

### RFQs
- `GET /api/rfqs` - Get all RFQs (filtered by role)
- `POST /api/rfqs` - Create RFQ (buyer/admin only)
- `GET /api/rfqs/:id` - Get RFQ by ID
- `PUT /api/rfqs/:id` - Update RFQ (buyer/admin only)
- `GET /api/rfqs/my-rfqs` - Get invited RFQs (supplier only)
- `PATCH /api/rfqs/:id/cancel` - Cancel RFQ (buyer/admin only)
- `PATCH /api/rfqs/:id/select-winner` - Select winner (buyer/admin only)

### Bids
- `POST /api/bids/:rfqId/bids` - Submit bid (supplier only)
- `GET /api/bids/:rfqId/bids` - Get bids for RFQ
- `GET /api/bids/:rfqId/rankings` - Get rankings for RFQ
- `GET /api/bids/my-bids` - Get my bids (supplier only)

### Dashboard
- `GET /api/dashboard/buyer` - Buyer dashboard stats (buyer/admin)
- `GET /api/dashboard/supplier` - Supplier dashboard stats (supplier/admin)
- `GET /api/dashboard/admin` - Admin dashboard stats (admin only)

### Logs
- `GET /api/logs/:rfqId/logs` - Get activity logs for RFQ

## Notes

- Socket.IO real-time features are not included in serverless deployment
- Use HTTP polling as an alternative for real-time updates
- Serverless functions have execution time limits (10-60 seconds)
- Database connection pooling is handled automatically
