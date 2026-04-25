# British Auction RFQ System - System Design Document

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [High-Level Design (HLD)](#high-level-design-hld)
3. [Low-Level Design (LLD)](#low-level-design-lld)
4. [Database Schema](#database-schema)
5. [API Documentation](#api-documentation)
6. [Role-Based Access Control](#role-based-access-control)
7. [Auction Extension Logic](#auction-extension-logic)
8. [Validation Rules](#validation-rules)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)

---

## Architecture Overview

### Technology Stack

**Backend:**
- Node.js (Runtime)
- Express.js (Web Framework)
- MongoDB (Database)
- Mongoose (ODM)
- Socket.IO (Real-time)
- JWT (Authentication)
- bcryptjs (Password Hashing)

**Frontend:**
- React.js (UI Library)
- Vite (Build Tool)
- Tailwind CSS (Styling)
- React Router (Navigation)
- Axios (HTTP Client)
- Socket.IO Client (Real-time)

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Buyer UI   │  │ Supplier UI │  │  Admin UI   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP/WebSocket
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway (Express)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Auth Routes │  │  RFQ Routes │  │  Bid Routes │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Auction     │  │  Ranking    │  │  Activity   │        │
│  │ Engine      │  │  Engine     │  │  Logger     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Data Access Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ RFQ Model   │  │  Bid Model  │  │  User Model │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  MongoDB Database                            │
└─────────────────────────────────────────────────────────────┘
```

---

## High-Level Design (HLD)

### Component Overview

#### 1. Authentication Module
- JWT-based authentication
- Role-based access control (Buyer, Supplier, Admin)
- Password hashing with bcrypt
- Token refresh mechanism

#### 2. RFQ Management Module
- RFQ CRUD operations
- Status calculation (dynamic based on time)
- British Auction configuration
- Supplier invitation management

#### 3. Bidding Module
- Bid submission with validation
- Auction engine for bid processing
- Ranking calculation (L1, L2, L3)
- Automatic auction extension logic

#### 4. Dashboard Module
- Role-specific statistics
- Real-time data aggregation
- Activity monitoring

#### 5. Real-time Module
- Socket.IO integration
- Live bid updates
- Auction extension notifications
- Activity log streaming

---

## Low-Level Design (LLD)

### 1. Status Calculation Engine

**Location:** `backend/src/utils/auctionStatus.js`

**Function:** `getAuctionStatus(rfq, now)`

**Logic:**
```
IF rfq.status === DRAFT OR CANCELLED:
  RETURN rfq.status

IF now < bidStartTime:
  RETURN UPCOMING

IF now >= bidStartTime AND now <= currentCloseTime:
  RETURN ACTIVE

IF now > currentCloseTime:
  IF forcedCloseTime exists AND now < forcedCloseTime:
    RETURN CLOSED
  ELSE:
    RETURN FORCE_CLOSED

RETURN rfq.status (fallback)
```

**Usage:** Called in all GET requests to ensure dynamic status calculation

---

### 2. Auction Engine

**Location:** `backend/src/controllers/bidController.js`

**Function:** `auctionEngine(rfqId, supplierId, bidData, io)`

**Validation Steps:**
1. Auction must be enabled
2. Current status must be ACTIVE (using getAuctionStatus)
3. Current time must be within bid window
4. Supplier must be invited OR RFQ must be PUBLIC
5. New bid must be lower than previous bid

**Extension Logic:**
```
IF bid received within trigger window:
  Calculate trigger condition based on triggerType:
    - BID_RECEIVED: Always extend
    - ANY_RANK_CHANGE: Extend if any rank changes
    - L1_CHANGE: Extend only if L1 supplier changes
  
  IF extension condition met:
    newCloseTime = currentCloseTime + extensionDurationMinutes
    
    IF newCloseTime > forcedCloseTime:
      newCloseTime = forcedCloseTime (hard limit)
    
    Update RFQ with newCloseTime
    Increment extensionCount
    Log AUCTION_EXTENDED event
    Emit real-time notification
```

---

### 3. Ranking Engine

**Location:** `backend/src/controllers/bidController.js`

**Function:** `calculateRanking(rfqId)`

**Logic:**
```
1. Aggregate bids by supplierId:
   - Get lowest totalAmount per supplier
   - Get earliest timestamp for tie-breaking

2. Sort by:
   - totalAmount (ascending)
   - firstBidTime (ascending)

3. Assign ranks:
   - Index 0 = L1
   - Index 1 = L2
   - Index 2 = L3

4. Return ranking array with supplier details
```

---

### 4. Activity Logger

**Location:** `backend/src/controllers/bidController.js`

**Events Logged:**
- RFQ_CREATED
- RFQ_UPDATED
- RFQ_CANCELLED
- BID_SUBMITTED (with amount, rank)
- BID_REJECTED (with reason)
- RANK_CHANGED
- L1_CHANGED
- AUCTION_EXTENDED (with new close time, extension count)
- AUCTION_CLOSED
- AUCTION_FORCE_CLOSED
- WINNER_SELECTED

**Log Structure:**
```javascript
{
  rfqId: ObjectId,
  actorId: ObjectId,
  actorRole: String,
  actionType: String,
  message: String,
  reason: String,
  metadata: Object,
  createdAt: Date
}
```

---

## Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique, indexed),
  passwordHash: String,
  role: Enum['buyer', 'supplier', 'admin'],
  companyName: String,
  phone: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- email (unique)
- role

---

### RFQ Collection
```javascript
{
  _id: ObjectId,
  rfqName: String,
  referenceId: String (unique, indexed),
  description: String,
  serviceType: Enum['FCL', 'LCL', 'AIR', 'ROAD', 'RAIL'],
  pickupLocation: String,
  deliveryLocation: String,
  pickupDate: Date,
  
  // Auction Timing
  bidStartTime: Date,
  originalCloseTime: Date,
  currentCloseTime: Date,
  forcedCloseTime: Date,
  
  // British Auction Configuration
  triggerWindowMinutes: Number (default: 10),
  extensionDurationMinutes: Number (default: 10),
  triggerType: Enum['BID_RECEIVED', 'ANY_RANK_CHANGE', 'L1_CHANGE'],
  auctionEnabled: Boolean (default: true),
  extensionCount: Number (default: 0),
  
  // Status
  status: Enum['DRAFT', 'UPCOMING', 'ACTIVE', 'CLOSED', 'FORCE_CLOSED', 'CANCELLED'],
  
  // Visibility
  visibility: Enum['PUBLIC', 'PRIVATE'],
  
  // Relationships
  createdBy: ObjectId (ref: User, indexed),
  invitedSuppliers: [ObjectId] (ref: User),
  winnerSupplier: ObjectId (ref: User),
  
  // Additional
  estimatedValue: Number,
  currency: String (default: 'USD'),
  
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- referenceId (unique)
- status
- currentCloseTime
- createdBy
- visibility

---

### Bid Collection
```javascript
{
  _id: ObjectId,
  rfqId: ObjectId (ref: RFQ, indexed),
  supplierId: ObjectId (ref: User, indexed),
  carrierName: String,
  freightCharges: Number,
  originCharges: Number,
  destinationCharges: Number,
  taxes: Number,
  discount: Number,
  totalAmount: Number (indexed),
  transitTime: Number,
  quoteValidity: Date,
  remarks: String,
  isRejected: Boolean (default: false),
  rejectionReason: String,
  createdAt: Date (indexed)
}
```

**Indexes:**
- rfqId
- supplierId
- totalAmount
- createdAt

---

### ActivityLog Collection
```javascript
{
  _id: ObjectId,
  rfqId: ObjectId (ref: RFQ, indexed),
  actorId: ObjectId (ref: User),
  actorRole: String,
  actionType: String (indexed),
  message: String,
  reason: String,
  metadata: Object,
  createdAt: Date (indexed)
}
```

**Indexes:**
- rfqId
- actionType
- createdAt

---

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
**Description:** Register a new user

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "buyer",
  "companyName": "Acme Corp",
  "phone": "1234567890"
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

---

#### POST /api/auth/login
**Description:** Login user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "jwt_token_here"
  }
}
```

---

### RFQ Endpoints

#### POST /api/rfqs
**Description:** Create new RFQ (Buyer only)

**Request Body:**
```json
{
  "rfqName": "Shanghai to Los Angeles Freight",
  "description": "Container shipping required",
  "serviceType": "FCL",
  "pickupLocation": "Shanghai Port",
  "deliveryLocation": "Los Angeles Port",
  "pickupDate": "2024-06-01T00:00:00Z",
  "bidStartTime": "2024-05-15T10:00:00Z",
  "originalCloseTime": "2024-05-15T18:00:00Z",
  "forcedCloseTime": "2024-05-15T20:00:00Z",
  "triggerWindowMinutes": 5,
  "extensionDurationMinutes": 2,
  "triggerType": "BID_RECEIVED",
  "auctionEnabled": true,
  "visibility": "PUBLIC",
  "invitedSuppliers": [],
  "estimatedValue": 50000
}
```

**Response:** 201 Created

---

#### GET /api/rfqs
**Description:** Get all RFQs (role-based filtering)

**Query Parameters:**
- `status`: Filter by status (optional)

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "rfqs": [
      {
        "_id": "...",
        "rfqName": "...",
        "referenceId": "RFQ-XXX",
        "status": "ACTIVE",
        ...
      }
    ]
  }
}
```

**Role-Based Filtering:**
- **Buyer:** Only sees RFQs where `createdBy` = own ID
- **Supplier:** Sees PUBLIC RFQs OR RFQs where `invitedSuppliers` includes own ID
- **Admin:** Sees all RFQs

---

#### GET /api/rfqs/:id
**Description:** Get single RFQ by ID

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "rfq": {
      "_id": "...",
      "rfqName": "...",
      "status": "ACTIVE",
      "bidCount": 5,
      "supplierCount": 3,
      ...
    }
  }
}
```

**Access Control:**
- **Buyer:** Can only view own RFQs
- **Supplier:** Can view PUBLIC RFQs OR invited RFQs
- **Admin:** Can view all RFQs

---

### Bid Endpoints

#### POST /api/bids/:rfqId/bids
**Description:** Submit bid (Supplier only)

**Request Body:**
```json
{
  "carrierName": "Maersk",
  "freightCharges": 25000,
  "originCharges": 5000,
  "destinationCharges": 3000,
  "taxes": 1000,
  "discount": 500,
  "transitTime": 15,
  "quoteValidity": "2024-05-20T00:00:00Z",
  "remarks": "All-inclusive rate"
}
```

**Validation:**
- User must be Supplier
- User cannot be RFQ creator
- Auction must be ACTIVE
- Current time must be within bid window
- New bid must be lower than previous bid

**Response:** 201 Created
```json
{
  "success": true,
  "message": "Bid submitted successfully",
  "data": {
    "bid": { ... },
    "ranking": [...],
    "extensionApplied": false,
    "newCloseTime": "..."
  }
}
```

---

#### GET /api/bids/:rfqId/bids
**Description:** Get all bids for RFQ

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "bids": [...],
    "ranking": [...]
  }
}
```

**Access Control:** Same as GET /api/rfqs/:id

---

#### GET /api/bids/:rfqId/rankings
**Description:** Get current rankings for RFQ

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "ranking": [
      {
        "rank": 1,
        "supplierId": "...",
        "supplier": { ... },
        "lowestAmount": 25000
      }
    ]
  }
}
```

---

### Dashboard Endpoints

#### GET /api/dashboard/buyer
**Description:** Get buyer dashboard statistics

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalRFQs": 10,
      "activeAuctions": 3,
      "closedAuctions": 5,
      "upcomingAuctions": 2,
      "totalSavings": 15000
    },
    "recentRFQs": [...]
  }
}
```

---

#### GET /api/dashboard/supplier
**Description:** Get supplier dashboard statistics

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "stats": {
      "availableAuctions": 15,
      "participatedAuctions": 8,
      "l1Count": 3
    },
    "myBids": [...]
  }
}
```

---

#### GET /api/dashboard/admin
**Description:** Get admin dashboard statistics

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalRFQs": 50,
      "activeAuctions": 12,
      "totalUsers": 25,
      "totalBids": 200
    },
    "rfqsByStatus": { ... },
    "usersByRole": [...]
  }
}
```

---

## Role-Based Access Control

### Buyer Permissions

**Can:**
- Create RFQ
- View own RFQs
- Update own RFQs (only in DRAFT status)
- Cancel own RFQs
- Monitor bids on own RFQs
- View rankings for own RFQs
- View activity logs for own RFQs
- Select winner for own RFQs (after auction closes)

**Cannot:**
- Submit bids
- Bid on own RFQs
- View other buyers' RFQs
- Update RFQs in ACTIVE/CLOSED status

---

### Supplier Permissions

**Can:**
- View PUBLIC RFQs
- View invited RFQs
- Submit bids on ACTIVE auctions
- Lower previous bids
- View own bid history
- View rankings for accessible RFQs
- View activity logs for accessible RFQs

**Cannot:**
- Create RFQs
- Bid on UPCOMING auctions
- Bid on CLOSED/FORCE_CLOSED auctions
- Bid after currentCloseTime
- Bid after forcedCloseTime
- Bid higher than previous bid
- Bid on own created RFQs

---

### Admin Permissions

**Can:**
- View all RFQs
- View all users
- View all bids
- View all activity logs
- Monitor platform statistics

**Cannot:**
- Submit bids (unless explicitly designed)
- Modify user data (future feature)
- Delete RFQs (future feature)

---

## Auction Extension Logic

### Trigger Window Calculation

```
triggerWindowStart = currentCloseTime - (triggerWindowMinutes * 60 * 1000)
triggerWindowEnd = currentCloseTime
```

### Extension Conditions

**1. BID_RECEIVED:**
- Extends on ANY bid received within trigger window

**2. ANY_RANK_CHANGE:**
- Extends only if ANY supplier's rank changes after bid

**3. L1_CHANGE:**
- Extends only if the L1 supplier changes after bid

### Extension Algorithm

```
IF bidTime >= triggerWindowStart AND bidTime <= triggerWindowEnd:
  Calculate trigger condition based on triggerType
  
  IF trigger condition is TRUE:
    newCloseTime = currentCloseTime + (extensionDurationMinutes * 60 * 1000)
    
    IF forcedCloseTime exists AND newCloseTime > forcedCloseTime:
      newCloseTime = forcedCloseTime (hard limit)
    
    Update RFQ:
      - currentCloseTime = newCloseTime
      - extensionCount = extensionCount + 1
    
    Log AUCTION_EXTENDED event with:
      - reason = triggerType
      - newCloseTime
      - extensionCount
    
    Emit real-time notification to all connected clients
```

### Forced Close Time Enforcement

```
IF forcedCloseTime exists:
  IF now >= forcedCloseTime:
    Set status = FORCE_CLOSED
    Reject all new bids
    Log AUCTION_FORCE_CLOSED event
```

---

## Validation Rules

### RFQ Creation Validation

1. **Timing Validation:**
   - `bidStartTime < originalCloseTime` (required)
   - `originalCloseTime < forcedCloseTime` (if provided)
   - All dates must be in the future

2. **Field Validation:**
   - `rfqName` required, max 200 chars
   - `serviceType` must be valid enum value
   - `pickupLocation` required
   - `deliveryLocation` required
   - `pickupDate` required

3. **Auction Configuration:**
   - `triggerWindowMinutes` must be >= 1
   - `extensionDurationMinutes` must be >= 1
   - `triggerType` must be valid enum value

---

### Bid Submission Validation

1. **Authorization Validation:**
   - User must be Supplier
   - User cannot be RFQ creator

2. **Timing Validation:**
   - Auction must be ACTIVE
   - Current time >= bidStartTime
   - Current time <= currentCloseTime
   - Current time <= forcedCloseTime (if set)

3. **Access Validation:**
   - User must be invited OR RFQ must be PUBLIC

4. **Bid Amount Validation:**
   - New bid must be lower than previous bid (if exists)
   - All charge fields must be numeric
   - Total amount must be positive

---

### RFQ Update Validation

1. **Authorization Validation:**
   - Only creator can update

2. **Status Validation:**
   - Cannot update if ACTIVE or CLOSED
   - Can only update in DRAFT status

3. **Field Validation:**
   - Same as creation validation

---

## Error Handling

### Backend Error Handling

**HTTP Status Codes:**
- 200 OK - Successful request
- 201 Created - Resource created
- 400 Bad Request - Validation error
- 403 Forbidden - Access denied
- 404 Not Found - Resource not found
- 500 Internal Server Error - Server error

**Error Response Format:**
```json
{
  "success": false,
  "message": "Human-readable error message"
}
```

**Common Error Scenarios:**
1. Invalid ObjectId → 400 Bad Request
2. RFQ not found → 404 Not Found
3. Access denied → 403 Forbidden
4. Auction not active → 400 Bad Request
5. Bid too high → 400 Bad Request
6. Timing validation failed → 400 Bad Request

---

### Frontend Error Handling

**Loading States:**
- All pages have loading indicators
- Skeleton screens or spinners during API calls

**Error States:**
- Try-catch blocks in all async functions
- Toast notifications for errors
- "RFQ not found" message with navigation option
- Empty state messages for no data

**Fallback UI:**
- AuctionDetails: Shows "RFQ not found" with "Go to Dashboard" button
- SubmitBid: Shows "Only suppliers can submit bids" message
- All pages have proper error boundaries

---

## Security Considerations

### Authentication & Authorization

1. **JWT Token:**
   - Stored in localStorage
   - Sent in Authorization header
   - Expires after configurable time

2. **Password Security:**
   - Hashed with bcrypt (10 rounds)
   - Never stored in plain text
   - Minimum length validation

3. **Role-Based Access:**
   - Middleware checks role on protected routes
   - Controller-level validation for critical operations
   - Frontend role-based UI rendering

### API Security

1. **CORS:**
   - Configured for specific frontend URL
   - Credentials allowed for cookies

2. **Helmet:**
   - Security headers enabled
   - XSS protection
   - No-sniff headers

3. **Rate Limiting:**
   - Can be implemented (future enhancement)

### Data Validation

1. **Input Sanitization:**
   - Mongoose schema validation
   - Custom validation in controllers
   - Type coercion for numeric fields

2. **SQL Injection Prevention:**
   - MongoDB parameterized queries
   - No raw query construction

3. **XSS Prevention:**
   - React automatically escapes JSX
   - No dangerouslySetInnerHTML used

---

## Conclusion

This system implements a production-grade British Auction RFQ platform with:
- Dynamic status calculation
- Role-based access control
- Automatic auction extension
- Comprehensive activity logging
- Real-time updates
- Robust error handling
- Security best practices

All assignment requirements have been met and the system is ready for deployment.
