# British Auction RFQ Platform

A production-quality, enterprise-grade SaaS procurement platform featuring British Auction (reverse auction) mechanics for RFQ (Request for Quotation) management. Built with MERN stack (MongoDB, Express, React, Node.js) with real-time bidding capabilities.

## 🎯 Product Vision

This platform enables buyers to create freight/service RFQs and suppliers to compete in British Auctions by continuously lowering quotes. The system handles live bidding, automatic auction extension, forced close, supplier ranking, audit logs, validations, and professional dashboards.

## 🛠 Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database (chosen for flexibility with nested auction data)
- **Mongoose** - ODM for MongoDB
- **Socket.IO** - Real-time bid updates
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **dotenv** - Environment variables
- **cors** - Cross-origin resource sharing
- **helmet** - Security headers
- **morgan** - HTTP request logger

### Frontend
- **React.js** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Axios** - HTTP client
- **Socket.IO Client** - Real-time updates

## 📋 Why MongoDB?

MongoDB was chosen over SQL for this RFQ system because:

- **Flexible Schema**: RFQs can have different configurations and quote fields may vary by service type
- **Document-Oriented**: Activity logs are event-based and naturally fit document structure
- **Nested Data**: Auction settings, bids, and charges contain semi-structured data
- **Faster Development**: Natural JSON format matches frontend/backend data flow
- **Schema Evolution**: Easy to extend for future modules (documents, notes, attachments, analytics)
- **Performance**: Efficient for read-heavy auction operations with proper indexing

*Note: SQL is also valid for strict transactional procurement systems, but MongoDB provides the flexibility needed for this auction-based platform.*

## 🏗 High-Level Design (HLD)

```
React Frontend
    ↓
API Layer (Axios)
    ↓
Express REST APIs
    ↓
Controllers
    ↓
Services (Auction Engine, Ranking Engine)
    ↓
Validation Layer
    ↓
MongoDB (Mongoose)
    ↓
Socket.IO (Real-time Updates)
```

## 📁 Project Structure

### Backend
```
backend/
├── src/
│   ├── config/
│   │   ├── db.js           # MongoDB connection
│   │   └── socket.js       # Socket.IO configuration
│   ├── constants/
│   │   └── auctionConstants.js  # Status, trigger types, actions
│   ├── controllers/
│   │   ├── authController.js    # Authentication logic
│   │   ├── rfqController.js     # RFQ CRUD operations
│   │   ├── bidController.js     # Bid submission & auction engine
│   │   └── dashboardController.js  # Role-based statistics
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification
│   │   └── roleMiddleware.js     # Role-based access control
│   ├── models/
│   │   ├── User.js            # User schema
│   │   ├── RFQ.js             # RFQ schema with auction settings
│   │   ├── Bid.js             # Bid schema
│   │   ├── ActivityLog.js     # Audit trail
│   │   └── Notification.js    # User notifications
│   ├── routes/
│   │   ├── authRoutes.js      # Auth endpoints
│   │   ├── rfqRoutes.js       # RFQ endpoints
│   │   ├── bidRoutes.js       # Bid endpoints
│   │   ├── dashboardRoutes.js # Dashboard endpoints
│   │   └── logRoutes.js       # Activity log endpoints
│   ├── utils/
│   │   └── seed.js            # Demo data seeding
│   └── server.js              # Main server entry point
├── .env                       # Environment variables
└── package.json
```

### Frontend
```
frontend/
├── src/
│   ├── api/
│   │   ├── axiosInstance.js   # Axios configuration
│   │   ├── authApi.js         # Auth API calls
│   │   ├── rfqApi.js          # RFQ API calls
│   │   ├── bidApi.js          # Bid API calls
│   │   └── dashboardApi.js    # Dashboard API calls
│   ├── context/
│   │   └── AuthContext.jsx    # Authentication state
│   ├── pages/
│   │   ├── Login.jsx          # Login page
│   │   ├── Register.jsx       # Registration page
│   │   ├── BuyerDashboard.jsx # Buyer dashboard
│   │   ├── SupplierDashboard.jsx  # Supplier dashboard
│   │   ├── AdminDashboard.jsx  # Admin dashboard
│   │   ├── CreateRFQ.jsx      # RFQ creation form
│   │   ├── AuctionDetails.jsx # Auction details & rankings
│   │   └── SubmitBid.jsx      # Bid submission form
│   ├── App.jsx                # Main app with routing
│   ├── main.jsx               # React entry point
│   └── index.css              # Tailwind CSS directives
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 🗄 Database Schema

### User
```javascript
{
  name: String,
  email: String (unique),
  passwordHash: String,
  role: Enum ['buyer', 'supplier', 'admin'],
  companyName: String,
  phone: String,
  isActive: Boolean,
  createdAt: Date
}
```

### RFQ
```javascript
{
  rfqName: String,
  referenceId: String (unique),
  description: String,
  serviceType: Enum ['FCL', 'LCL', 'AIR', 'ROAD', 'RAIL'],
  pickupLocation: String,
  deliveryLocation: String,
  pickupDate: Date,
  bidStartTime: Date,
  originalCloseTime: Date,
  currentCloseTime: Date,
  forcedCloseTime: Date,
  triggerWindowMinutes: Number,
  extensionDurationMinutes: Number,
  triggerType: Enum ['BID_RECEIVED', 'ANY_RANK_CHANGE', 'L1_CHANGE'],
  auctionEnabled: Boolean,
  extensionCount: Number,
  status: Enum ['DRAFT', 'UPCOMING', 'ACTIVE', 'CLOSED', 'FORCE_CLOSED', 'CANCELLED'],
  visibility: Enum ['PUBLIC', 'PRIVATE'],
  createdBy: ObjectId (ref: User),
  invitedSuppliers: [ObjectId] (ref: User),
  winnerSupplier: ObjectId (ref: User),
  estimatedValue: Number,
  currency: String
}
```

### Bid
```javascript
{
  rfqId: ObjectId (ref: RFQ),
  supplierId: ObjectId (ref: User),
  carrierName: String,
  freightCharges: Number,
  originCharges: Number,
  destinationCharges: Number,
  taxes: Number,
  discount: Number,
  totalAmount: Number,
  transitTime: Number,
  quoteValidity: Date,
  remarks: String,
  rankAtSubmission: Number,
  isRejected: Boolean,
  rejectionReason: String
}
```

### ActivityLog
```javascript
{
  rfqId: ObjectId (ref: RFQ),
  actorId: ObjectId (ref: User),
  actorRole: Enum ['buyer', 'supplier', 'admin'],
  actionType: Enum ['RFQ_CREATED', 'BID_SUBMITTED', 'AUCTION_EXTENDED', ...],
  message: String,
  reason: String,
  metadata: Mixed
}
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### RFQs
- `POST /api/rfqs` - Create RFQ (buyer/admin)
- `GET /api/rfqs` - Get all RFQs (role-based)
- `GET /api/rfqs/:id` - Get single RFQ
- `PUT /api/rfqs/:id` - Update RFQ (buyer/admin)
- `PATCH /api/rfqs/:id/cancel` - Cancel RFQ (buyer/admin)
- `PATCH /api/rfqs/:id/select-winner` - Select winner (buyer/admin)

### Bids
- `POST /api/bids/:rfqId/bids` - Submit bid (supplier)
- `GET /api/bids/:rfqId/bids` - Get bids for RFQ
- `GET /api/bids/:rfqId/rankings` - Get rankings for RFQ
- `GET /api/bids/my-bids` - Get my bids (supplier)

### Dashboard
- `GET /api/dashboard/buyer` - Buyer dashboard stats
- `GET /api/dashboard/supplier` - Supplier dashboard stats
- `GET /api/dashboard/admin` - Admin dashboard stats

### Activity Logs
- `GET /api/logs/:rfqId/logs` - Get activity logs for RFQ

## ⚙ Auction Engine Logic

The auction engine implements British Auction mechanics with the following validation and extension logic:

### Bid Validation
1. Auction must be enabled
2. Auction status must be ACTIVE
3. Current time must be >= bidStartTime
4. Current time must be <= currentCloseTime
5. Current time must be <= forcedCloseTime (if set)
6. Supplier must be invited
7. New bid must be lower than previous bid (if exists)

### Ranking Engine
- Sorts latest valid lowest bid per supplier by totalAmount
- Assigns ranks L1, L2, L3
- Handles equal bids by earlier timestamp priority
- Returns rank movement compared to previous ranking

### Automatic Extension
When a bid is submitted within the trigger window (X minutes before close):
- **BID_RECEIVED**: Extends on any bid
- **ANY_RANK_CHANGE**: Extends only if any rank changes
- **L1_CHANGE**: Extends only if L1 supplier changes
- Never extends beyond forcedCloseTime
- Tracks extension count

### Activity Logging
All significant events are logged:
- RFQ created/updated/cancelled
- Bid submitted/rejected
- Rank changes
- L1 changes
- Auction extensions
- Auction closed/force closed
- Winner selected

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/british-auction-rfq
JWT_SECRET=your_jwt_secret_key_change_in_production
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

4. Seed database with demo data:
```bash
npm run seed
```

5. Start backend server:
```bash
npm start
```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## 👥 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Buyer | buyer@gocomet.test | 123456 |
| Supplier 1 | supplier1@gocomet.test | 123456 |
| Supplier 2 | supplier2@gocomet.test | 123456 |
| Supplier 3 | supplier3@gocomet.test | 123456 |
| Admin | admin@gocomet.test | 123456 |

## 🎮 Usage Guide

### For Buyers
1. Login as buyer
2. View dashboard with RFQ statistics
3. Create new RFQ with auction settings
4. Configure British Auction parameters (trigger window, extension duration, trigger type)
5. Invite suppliers to participate
6. Monitor live bidding and rankings
7. Select winner after auction closes

### For Suppliers
1. Login as supplier
2. View available auctions
3. Submit competitive bids (must be lower than previous bids)
4. Monitor current rank and L1 position
5. Track auction timer and extensions
6. View bid history and performance

### For Admins
1. Login as admin
2. View platform-wide statistics
3. Monitor all RFQs and auctions
4. Review system activity
5. Manage users (future feature)

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Protected API routes
- CORS configuration
- Helmet security headers
- Input validation
- SQL injection prevention (MongoDB sanitization)

## 📊 Real-Time Features

- Socket.IO integration for live bid updates
- Real-time ranking changes
- Auction extension notifications
- Activity log streaming
- Room-based subscriptions per RFQ

## 🧪 Testing

The system includes comprehensive validation and error handling:
- Bid timing validation
- Supplier invitation verification
- Bid amount validation
- Extension boundary checks
- Role-based access control
- API error responses

## 🔮 Future Scope

- Document upload/management
- Advanced analytics and reporting
- Email notifications
- Multi-currency support
- Advanced search and filtering
- Supplier performance ratings
- Contract generation
- Integration with ERP systems
- Mobile app development

## 📝 License

ISC

## 👨‍💻 Development Team

Built as a production-quality MERN application demonstrating enterprise-grade RFQ auction platform with British Auction mechanics.

## 🙏 Acknowledgments

Inspired by GoComet RFQ workflows and modern B2B procurement platforms.
