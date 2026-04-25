# System Design - British Auction RFQ Platform

## 1. Overview

This document provides detailed technical specifications for the British Auction RFQ Platform, including high-level architecture, low-level design, database schema, API design, and auction flow.

## 2. High-Level Architecture (HLD)

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  React Router│  │  Tailwind CSS│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  AuthContext │  │  API Layer   │  │ Socket.IO    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      Backend Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Express    │  │  Socket.IO    │  │  Middleware  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Controllers │  │   Services   │  │  Validators  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │ Auction Engine│  │ Ranking Engine│                          │
│  └──────────────┘  └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                              ↓ Mongoose
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   MongoDB    │  │   Indexes    │  │   Models     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities

#### Frontend Components
- **React UI**: Component-based architecture with reusable UI elements
- **React Router**: Client-side routing with protected routes
- **AuthContext**: Global authentication state management
- **API Layer**: Axios-based HTTP client with interceptors
- **Socket.IO Client**: Real-time event handling

#### Backend Components
- **Express Server**: HTTP server and API routing
- **Controllers**: Request handling and business logic coordination
- **Services**: Complex business logic (Auction Engine, Ranking Engine)
- **Middleware**: Authentication, authorization, error handling
- **Mongoose Models**: Data validation and database interaction

## 3. Low-Level Design (LLD)

### 3.1 Backend Layer Structure

#### Controllers Layer
```
controllers/
├── authController.js
│   ├── register() - User registration
│   ├── login() - User authentication
│   └── getMe() - Get current user
├── rfqController.js
│   ├── createRFQ() - Create new RFQ
│   ├── getAllRFQs() - Get RFQs (role-based)
│   ├── getRFQById() - Get single RFQ
│   ├── updateRFQ() - Update RFQ
│   ├── cancelRFQ() - Cancel RFQ
│   └── selectWinner() - Select auction winner
├── bidController.js
│   ├── submitBid() - Submit bid with auction engine
│   ├── getBidsForRFQ() - Get bids for RFQ
│   ├── getRankings() - Get supplier rankings
│   └── getMyBids() - Get supplier's bids
└── dashboardController.js
    ├── getBuyerDashboard() - Buyer statistics
    ├── getSupplierDashboard() - Supplier statistics
    └── getAdminDashboard() - Admin statistics
```

#### Services Layer
```
services/ (embedded in controllers)
├── Auction Engine
│   ├── validateBidTiming()
│   ├── validateSupplierInvitation()
│   ├── validateBidAmount()
│   ├── calculateTotalAmount()
│   ├── applyAuctionExtension()
│   └── logActivity()
└── Ranking Engine
    ├── calculateRanking()
    ├── detectRankChange()
    └── detectL1Change()
```

#### Middleware Layer
```
middleware/
├── authMiddleware.js
│   └── verify JWT token
└── roleMiddleware.js
    └── check user role permissions
```

### 3.2 Frontend Layer Structure

#### API Layer
```
api/
├── axiosInstance.js
│   ├── Request interceptor (add JWT)
│   └── Response interceptor (handle 401)
├── authApi.js
│   ├── register()
│   ├── login()
│   └── getMe()
├── rfqApi.js
│   ├── getAll()
│   ├── getById()
│   ├── create()
│   ├── update()
│   ├── cancel()
│   └── selectWinner()
├── bidApi.js
│   ├── submitBid()
│   ├── getBidsForRFQ()
│   ├── getRankings()
│   └── getMyBids()
└── dashboardApi.js
    ├── getBuyerDashboard()
    ├── getSupplierDashboard()
    └── getAdminDashboard()
```

#### Context Layer
```
context/
└── AuthContext.jsx
    ├── user state
    ├── isAuthenticated state
    ├── login()
    ├── register()
    └── logout()
```

## 4. Database Schema Details

### 4.1 Indexes for Performance

#### User Collection
```javascript
{ email: 1 } - Unique index for login
{ role: 1 } - For role-based queries
```

#### RFQ Collection
```javascript
{ status: 1 } - For filtering by status
{ currentCloseTime: 1 } - For auction timing queries
{ createdBy: 1 } - For buyer's RFQs
{ referenceId: 1 } - Unique index for lookups
```

#### Bid Collection
```javascript
{ rfqId: 1, totalAmount: 1 } - For ranking queries
{ supplierId: 1 } - For supplier's bids
{ rfqId: 1, supplierId: 1 } - For supplier's bids in RFQ
```

#### ActivityLog Collection
```javascript
{ rfqId: 1, createdAt: -1 } - For activity timeline
{ actorId: 1 } - For user activity
```

### 4.2 Relationships

```
User (1) ──────< (N) RFQ (createdBy)
User (N) ──────< (N) RFQ (invitedSuppliers)
User (N) ──────< (N) Bid (supplierId)
RFQ (1) ──────< (N) Bid (rfqId)
RFQ (1) ──────< (N) ActivityLog (rfqId)
RFQ (1) ──────< (1) User (winnerSupplier)
User (1) ──────< (N) ActivityLog (actorId)
```

## 5. API Design Specifications

### 5.1 Authentication API

#### POST /api/auth/register
**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "supplier",
  "companyName": "ABC Logistics",
  "phone": "+1-555-0100"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "supplier"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /api/auth/login
**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 5.2 RFQ API

#### POST /api/rfqs
**Request:**
```json
{
  "rfqName": "Shanghai to LA Freight",
  "description": "20ft container shipment",
  "serviceType": "FREIGHT",
  "pickupLocation": "Shanghai, China",
  "deliveryLocation": "Los Angeles, USA",
  "pickupDate": "2024-05-01",
  "bidStartTime": "2024-04-25T10:00:00Z",
  "originalCloseTime": "2024-04-26T10:00:00Z",
  "forcedCloseTime": "2024-04-26T12:00:00Z",
  "triggerWindowMinutes": 10,
  "extensionDurationMinutes": 10,
  "triggerType": "BID_RECEIVED",
  "auctionEnabled": true,
  "estimatedValue": 5000
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "RFQ created successfully",
  "data": {
    "rfq": {
      "_id": "507f1f77bcf86cd799439012",
      "referenceId": "RFQ-SHA-LAX-001",
      "status": "DRAFT",
      ...
    }
  }
}
```

### 5.3 Bid API

#### POST /api/bids/:rfqId/bids
**Request:**
```json
{
  "carrierName": "Maersk",
  "freightCharges": 3500,
  "originCharges": 200,
  "destinationCharges": 300,
  "taxes": 150,
  "discount": 50,
  "transitTime": 15,
  "quoteValidity": "2024-05-15",
  "remarks": "Direct shipment"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Bid submitted successfully",
  "data": {
    "bid": { ... },
    "ranking": [
      {
        "supplierId": "507f1f77bcf86cd799439013",
        "rank": 1,
        "lowestAmount": 4100
      }
    ],
    "extensionApplied": false,
    "newCloseTime": "2024-04-26T10:00:00Z"
  }
}
```

## 6. Auction Flow Design

### 6.1 Auction Lifecycle

```
┌─────────────┐
│  DRAFT      │
└──────┬──────┘
       │ Start auction
       ↓
┌─────────────┐
│  UPCOMING   │ ← Waiting for bidStartTime
└──────┬──────┘
       │ bidStartTime reached
       ↓
┌─────────────┐
│   ACTIVE    │ ← Accepting bids
└──────┬──────┘
       │ currentCloseTime reached OR force close
       ↓
┌─────────────┐
│   CLOSED    │ ← Normal close
└─────────────┘
       │ OR
┌─────────────┐
│ FORCE_CLOSED │ ← Forced close
└─────────────┘
```

### 6.2 Bid Submission Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Bid Submission Request                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Validation Layer (Auction Engine)                │
│  1. Check RFQ exists                                        │
│  2. Check auction enabled                                   │
│  3. Check auction status = ACTIVE                           │
│  4. Check current time >= bidStartTime                      │
│  5. Check current time <= currentCloseTime                   │
│  6. Check current time <= forcedCloseTime (if set)          │
│  7. Check supplier invited                                 │
│  8. Check new bid < previous bid (if exists)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Bid Processing                              │
│  1. Calculate totalAmount                                   │
│  2. Get old ranking before bid                             │
│  3. Save bid to database                                   │
│  4. Get new ranking after bid                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Change Detection                            │
│  1. Detect rank change                                     │
│  2. Detect L1 change                                       │
│  3. Check if bid in trigger window                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Extension Logic (if in trigger window)           │
│  1. Check trigger type                                      │
│  2. Apply extension if condition met                       │
│  3. Never extend beyond forcedCloseTime                     │
│  4. Update extensionCount                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Activity Logging                            │
│  1. Log bid submitted                                      │
│  2. Log auction extension (if applied)                      │
│  3. Log L1 change (if occurred)                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Real-time Notification                           │
│  1. Emit Socket.IO event to RFQ room                       │
│  2. Send bid_submitted event                               │
│  3. Send ranking_updated event                              │
│  4. Send auction_extended event (if applied)                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Response                                  │
│  Return bid, ranking, extension status, new close time       │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Ranking Algorithm

```
Input: RFQ ID
Process:
  1. Aggregate bids by supplierId
  2. Find minimum totalAmount per supplier
  3. Find earliest timestamp for equal amounts
  4. Sort by (totalAmount ASC, firstBidTime ASC)
  5. Assign ranks (L1, L2, L3, ...)
  6. Compare with previous ranking
  7. Calculate rank movements
Output: Ranked supplier list with changes
```

## 7. Security Design

### 7.1 Authentication Flow
```
┌─────────────┐
│   Login     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Verify      │
│ Credentials │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Generate    │
│ JWT Token   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Return Token│
│ + User Data │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Store in    │
│ localStorage│
└─────────────┘
```

### 7.2 Authorization Flow
```
┌─────────────┐
│ API Request │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Extract     │
│ JWT Token   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Verify      │
│ Token       │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Get User    │
│ from DB     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Check Role  │
│ Permissions │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Allow/Deny  │
│ Request     │
└─────────────┘
```

## 8. Error Handling Strategy

### 8.1 Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Optional validation errors
}
```

### 8.2 Error Types
- **400 Bad Request**: Invalid input, validation errors
- **401 Unauthorized**: Missing/invalid token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server-side errors

## 9. Performance Considerations

### 9.1 Database Optimization
- Compound indexes for frequent queries
- Pagination for large result sets
- Projection to limit returned fields
- Aggregation pipelines for complex queries

### 9.2 API Optimization
- Response compression
- Caching static data
- Connection pooling
- Async/await for non-blocking operations

### 9.3 Frontend Optimization
- Lazy loading routes
- Component memoization
- Debouncing search inputs
- Optimistic UI updates

## 10. Scalability Considerations

### 10.1 Horizontal Scaling
- Stateless API design
- Session-less authentication (JWT)
- Database connection pooling
- Load balancer ready

### 10.2 Vertical Scaling
- Efficient indexing
- Query optimization
- Memory management
- CPU utilization

## 11. Monitoring & Logging

### 11.1 Application Logging
- HTTP request logging (morgan)
- Error logging
- Activity logging (business events)
- Audit trail for compliance

### 11.2 Metrics to Track
- API response times
- Bid submission rates
- Auction extension frequency
- User engagement metrics
- Error rates

## 12. Deployment Architecture

### 12.1 Development Environment
```
Frontend: Vite dev server (localhost:5173)
Backend: Node.js server (localhost:5000)
Database: MongoDB (localhost:27017)
```

### 12.2 Production Environment
```
Frontend: Nginx + Static files
Backend: Node.js + PM2
Database: MongoDB Atlas / Replica Set
Reverse Proxy: Nginx
SSL: Let's Encrypt
```

## 13. Backup & Recovery

### 13.1 Database Backup
- Daily automated backups
- Point-in-time recovery
- Replica set for high availability

### 13.2 Application Backup
- Source code version control (Git)
- Environment variables secure storage
- Configuration backup

## 14. Compliance & Audit

### 14.1 Audit Trail
- All user actions logged
- Bid submission history
- Auction modification history
- Winner selection records

### 14.2 Data Privacy
- Password hashing (bcrypt)
- JWT token expiration
- No sensitive data in logs
- GDPR compliance ready

## 15. Future Enhancements

### 15.1 Planned Features
- WebSocket reconnection handling
- Advanced analytics dashboard
- Email notifications
- Document management
- Supplier performance ratings
- Multi-currency support
- API rate limiting
- Caching layer (Redis)

### 15.2 Technical Debt
- Add comprehensive unit tests
- Add integration tests
- Implement CI/CD pipeline
- Add monitoring (Prometheus/Grafana)
- Add centralized logging (ELK stack)
