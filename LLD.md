# Low-Level Design (LLD) - Auction Connect Platform

## 1. Component Architecture

### 1.1 Frontend Component Hierarchy

```
App
├── AuthProvider
│   ├── AuthContext
│   └── ProtectedRoute
├── ToastProvider
│   └── ToastContext
├── Router
│   ├── LoginPage
│   ├── RegisterPage
│   ├── Dashboard
│   │   ├── Sidebar
│   │   ├── BuyerDashboard
│   │   ├── SupplierDashboard
│   │   └── AdminDashboard
│   ├── RFQList
│   ├── RFQDetail
│   ├── CreateRFQ
│   ├── BidForm
│   └── Settings
└── Common Components
    ├── Card
    ├── Button
    ├── Input
    ├── Modal
    └── Badge
```

### 1.2 Backend Module Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── db.js           # MongoDB connection
│   │   └── socket.js       # Socket.IO configuration
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── rfqController.js
│   │   ├── bidController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── RFQ.js
│   │   ├── Bid.js
│   │   └── ActivityLog.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── rfqRoutes.js
│   │   ├── bidRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── logRoutes.js
│   ├── utils/
│   │   └── seed.js         # Database seeding
│   └── server.js           # Main entry point
└── package.json
```

---

## 2. Class Diagrams

### 2.1 Frontend Classes/Components

#### AuthContext
```javascript
class AuthProvider {
  state: {
    user: User | null
    loading: boolean
    isAuthenticated: boolean
  }
  
  methods:
    - login(email: string, password: string): Promise<AuthResult>
    - register(userData: RegisterData): Promise<AuthResult>
    - logout(): void
    - checkAuth(): Promise<void>
}
```

#### RFQ Component
```javascript
class RFQList {
  props: {
    user: User
  }
  state: {
    rfqs: RFQ[]
    loading: boolean
    filter: RFQFilter
  }
  
  methods:
    - fetchRFQs(): Promise<void>
    - handleFilterChange(filter: RFQFilter): void
    - handleRFQClick(rfqId: string): void
}
```

#### Bid Component
```javascript
class BidForm {
  props: {
    rfq: RFQ
    user: User
  }
  state: {
    bidData: BidFormData
    loading: boolean
    submitted: boolean
  }
  
  methods:
    - handleSubmit(): Promise<void>
    - calculateTotal(): number
    - validateForm(): boolean
}
```

### 2.2 Backend Classes

#### User Model
```javascript
class User extends mongoose.Document {
  fields:
    - name: String
    - email: String
    - passwordHash: String
    - role: 'buyer' | 'supplier' | 'admin'
    - companyName: String
    - phone: String
    - isActive: Boolean
    - createdAt: Date
    - updatedAt: Date
  
  methods:
    - comparePassword(candidatePassword: string): Promise<boolean>
    - toJSON(): Object (exclude passwordHash)
}
```

#### RFQ Model
```javascript
class RFQ extends mongoose.Document {
  fields:
    - rfqName: String
    - referenceId: String
    - description: String
    - serviceType: String
    - pickupLocation: String
    - deliveryLocation: String
    - pickupDate: Date
    - bidStartTime: Date
    - originalCloseTime: Date
    - currentCloseTime: Date
    - forcedCloseTime: Date
    - triggerWindowMinutes: Number
    - extensionDurationMinutes: Number
    - triggerType: String
    - auctionEnabled: Boolean
    - status: String
    - createdBy: ObjectId
    - invitedSuppliers: ObjectId[]
    - estimatedValue: Number
    - currency: String
    - createdAt: Date
    - updatedAt: Date
  
  methods:
    - canExtend(): boolean
    - extendAuction(): void
    - calculateRemainingTime(): number
    - isAuctionActive(): boolean
}
```

#### Bid Model
```javascript
class Bid extends mongoose.Document {
  fields:
    - rfqId: ObjectId
    - supplierId: ObjectId
    - carrierName: String
    - freightCharges: Number
    - originCharges: Number
    - destinationCharges: Number
    - taxes: Number
    - discount: Number
    - totalAmount: Number
    - transitTime: Number
    - quoteValidity: Date
    - remarks: String
    - rankAtSubmission: Number
    - rankAtClose: Number
    - winner: Boolean
    - createdAt: Date
    - updatedAt: Date
  
  methods:
    - calculateTotal(): number
    - getRank(bids: Bid[]): number
}
```

---

## 3. Sequence Diagrams

### 3.1 User Registration Flow

```
User          Frontend          Backend          Database
 │                │                │                │
 ├─Register──────>│                │                │
 │                │                │                │
 │                ├─POST /api/auth/register───────>│
 │                │                │                │
 │                │                │←Check if email exists
 │                │                │                │
 │                │                │←Hash password
 │                │                │                │
 │                │                │├─Create user───>│
 │                │                │                │
 │                │                │←─User created──│
 │                │                │                │
 │                │                │←Generate token │
 │                │                │                │
 │                │←─Token + user──│                │
 │                │                │                │
 │←─Success───────│                │                │
 │                │                │                │
 │                │─Store token in localStorage    │
 │                │                │                │
```

### 3.2 RFQ Creation Flow

```
Buyer         Frontend          Backend          Database        Socket.IO
  │               │                │                │              │
  ├─Create RFQ───>│                │                │              │
  │               │                │                │              │
  │               ├─POST /api/rfqs────────────────>│              │
  │               │                │                │              │
  │               │                │←Validate data                │
  │               │                │                │              │
  │               │                │├─Generate referenceId        │
  │               │                │                │              │
  │               │                │├─Create RFQ────>│              │
  │               │                │                │              │
  │               │                │←─RFQ created───│              │
  │               │                │                │              │
  │               │                │├─Log activity─>│              │
  │               │                │                │              │
  │               │                │←─Success──────│              │
  │               │                │                │              │
  │               │                │├─Emit new RFQ────────────────>│
  │               │                │                │              │
  │               │←─RFQ data──────│                │              │
  │               │                │                │              │
  │←─Success──────│                │                │              │
  │               │                │                │              │
  │               │                │                │              │
Supplier        │                │                │              │
  │               │                │                │              │
  │<─Notification◄────────────────────────────────┼──────────────│
  │               │                │                │              │
```

### 3.3 Bid Submission Flow

```
Supplier       Frontend          Backend          Database        Socket.IO
    │               │                │                │              │
    ├─Submit Bid───>│                │                │              │
    │               │                │                │              │
    │               ├─POST /api/bids────────────────>│              │
    │               │                │                │              │
    │               │                │←Validate bid                │
    │               │                │                │              │
    │               │                │├─Create bid───>│              │
    │               │                │                │              │
    │               │                │←─Bid created───│              │
    │               │                │                │              │
    │               │                │├─Get all bids──>│              │
    │               │                │                │              │
    │               │                │←─Bids data─────│              │
    │               │                │                │              │
    │               │                │←─Calculate ranks              │
    │               │                │                │              │
    │               │                │←─Check trigger                │
    │               │                │                │              │
    │               │                │├─If trigger met              │
    │               │                ││  ├─Extend auction─>│          │
    │               │                ││  └─Log activity─>│          │
    │               │                │                │              │
    │               │                │├─Log activity─>│              │
    │               │                │                │              │
    │               │                │←─Success──────│              │
    │               │                │                │              │
    │               │                │├─Emit bid update─────────────>│
    │               │                │                │              │
    │               │                │├─Emit auction extension──────>│
    │               │                │                │              │
    │               │←─Bid data──────│                │              │
    │               │                │                │              │
    │←─Success──────│                │                │              │
    │               │                │                │              │
Buyer           │                │                │              │
    │<─Notification◄────────────────────────────────┼──────────────│
    │               │                │                │              │
Other Suppliers  │                │                │              │
    │<─Notification◄────────────────────────────────┼──────────────│
    │               │                │                │              │
```

### 3.4 Auction Extension Flow

```
Backend          Database        Socket.IO         Buyer        Suppliers
  │                │                │              │              │
  ├─Check trigger──>│                │              │              │
  │                │                │              │              │
  │←─Trigger met──│                │              │              │
  │                │                │              │              │
  ├─Update close time──────>│                │              │              │
  │                │                │              │              │
  │←─Updated───────│                │              │              │
  │                │                │              │              │
  ├─Log extension────────────>│                │              │              │
  │                │                │              │              │
  │←─Logged────────│                │              │              │
  │                │                │              │              │
  ├─Emit extension──────────────────────────────>│              │
  │                │                │              │              │
  │                │                │              ├─Alert───────>│
  │                │                │              │              │
  │                │                │              │              │
  │                │                │              │              │
  │                │                │              │              │
  │                │                │              │              │
```

---

## 4. API Specifications

### 4.1 Authentication API

#### POST /api/auth/register
**Description**: Register a new user

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "buyer",
  "companyName": "Acme Logistics",
  "phone": "+1-555-0100"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "buyer",
      "companyName": "Acme Logistics",
      "phone": "+1-555-0100"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response** (400):
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

#### POST /api/auth/login
**Description**: Login user

**Request Body**:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "buyer",
      "companyName": "Acme Logistics",
      "phone": "+1-555-0100"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### GET /api/auth/me
**Description**: Get current user

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "buyer",
      "companyName": "Acme Logistics",
      "phone": "+1-555-0100",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  }
}
```

#### PUT /api/auth/profile
**Description**: Update user profile

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "name": "John Updated",
  "companyName": "Acme Logistics Inc",
  "phone": "+1-555-0101"
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Updated",
      "email": "john@example.com",
      "role": "buyer",
      "companyName": "Acme Logistics Inc",
      "phone": "+1-555-0101",
      "isActive": true
    }
  }
}
```

### 4.2 RFQ API

#### POST /api/rfqs
**Description**: Create new RFQ

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "rfqName": "Shanghai to Los Angeles Freight",
  "description": "20ft container shipment",
  "serviceType": "FCL",
  "pickupLocation": "Shanghai, China",
  "deliveryLocation": "Los Angeles, USA",
  "pickupDate": "2024-02-01T00:00:00Z",
  "bidStartTime": "2024-01-15T00:00:00Z",
  "originalCloseTime": "2024-01-16T00:00:00Z",
  "forcedCloseTime": "2024-01-18T00:00:00Z",
  "triggerWindowMinutes": 10,
  "extensionDurationMinutes": 10,
  "triggerType": "BID_RECEIVED",
  "auctionEnabled": true,
  "invitedSuppliers": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  "estimatedValue": 5000,
  "currency": "USD"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "RFQ created successfully",
  "data": {
    "rfq": {
      "id": "507f1f77bcf86cd799439020",
      "rfqName": "Shanghai to Los Angeles Freight",
      "referenceId": "RFQ-SHA-LAX-001",
      "description": "20ft container shipment",
      "serviceType": "FCL",
      "status": "UPCOMING",
      "createdAt": "2024-01-15T00:00:00Z"
    }
  }
}
```

#### GET /api/rfqs
**Description**: Get RFQs (filtered by user role)

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `status`: Filter by status (optional)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "rfqs": [
      {
        "id": "507f1f77bcf86cd799439020",
        "rfqName": "Shanghai to Los Angeles Freight",
        "referenceId": "RFQ-SHA-LAX-001",
        "status": "ACTIVE",
        "currentCloseTime": "2024-01-16T00:00:00Z",
        "bidCount": 3,
        "lowestBid": 4100
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25
    }
  }
}
```

#### GET /api/rfqs/:id
**Description**: Get RFQ by ID

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "rfq": {
      "id": "507f1f77bcf86cd799439020",
      "rfqName": "Shanghai to Los Angeles Freight",
      "referenceId": "RFQ-SHA-LAX-001",
      "description": "20ft container shipment",
      "serviceType": "FCL",
      "pickupLocation": "Shanghai, China",
      "deliveryLocation": "Los Angeles, USA",
      "status": "ACTIVE",
      "currentCloseTime": "2024-01-16T00:00:00Z",
      "bids": [
        {
          "id": "507f1f77bcf86cd799439030",
          "supplierName": "Fast Freight Services",
          "totalAmount": 4100,
          "rank": 1,
          "transitTime": 15
        }
      ]
    }
  }
}
```

### 4.3 Bid API

#### POST /api/bids
**Description**: Submit bid for RFQ

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "rfqId": "507f1f77bcf86cd799439020",
  "carrierName": "Maersk",
  "freightCharges": 3500,
  "originCharges": 200,
  "destinationCharges": 300,
  "taxes": 150,
  "discount": 50,
  "transitTime": 15,
  "quoteValidity": "2024-01-20T00:00:00Z",
  "remarks": "Direct shipment"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Bid submitted successfully",
  "data": {
    "bid": {
      "id": "507f1f77bcf86cd799439030",
      "rfqId": "507f1f77bcf86cd799439020",
      "totalAmount": 4100,
      "rank": 1,
      "rankAtSubmission": 1,
      "createdAt": "2024-01-15T12:00:00Z"
    },
    "auctionExtended": false
  }
}
```

#### GET /api/bids/rfq/:rfqId
**Description**: Get all bids for RFQ

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "bids": [
      {
        "id": "507f1f77bcf86cd799439030",
        "supplierName": "Fast Freight Services",
        "carrierName": "Maersk",
        "totalAmount": 4100,
        "rank": 1,
        "transitTime": 15,
        "remarks": "Direct shipment"
      }
    ]
  }
}
```

### 4.4 Dashboard API

#### GET /api/dashboard/buyer
**Description**: Get buyer dashboard statistics

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "totalRFQs": 25,
    "activeAuctions": 5,
    "closedAuctions": 15,
    "draftRFQs": 5,
    "totalBids": 75,
    "avgSavings": 12.5,
    "recentRFQs": [...]
  }
}
```

#### GET /api/dashboard/supplier
**Description**: Get supplier dashboard statistics

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "totalBids": 50,
    "wonBids": 15,
    "winRate": 30,
    "activeAuctions": 10,
    "recentBids": [...]
  }
}
```

---

## 5. Socket.IO Events

### 5.1 Server to Client Events

#### rfq:created
Emitted when a new RFQ is created.

**Payload**:
```json
{
  "rfq": {
    "id": "507f1f77bcf86cd799439020",
    "rfqName": "Shanghai to Los Angeles Freight",
    "referenceId": "RFQ-SHA-LAX-001",
    "status": "UPCOMING"
  }
}
```

#### bid:submitted
Emitted when a new bid is submitted.

**Payload**:
```json
{
  "rfqId": "507f1f77bcf86cd799439020",
  "bid": {
    "id": "507f1f77bcf86cd799439030",
    "supplierName": "Fast Freight Services",
    "totalAmount": 4100,
    "rank": 1
  },
  "rankings": [
    {
      "rank": 1,
      "supplierId": "...",
      "totalAmount": 4100
    }
  ]
}
```

#### auction:extended
Emitted when auction is extended.

**Payload**:
```json
{
  "rfqId": "507f1f77bcf86cd799439020",
  "previousCloseTime": "2024-01-16T00:00:00Z",
  "newCloseTime": "2024-01-16T00:10:00Z",
  "extensionCount": 1,
  "reason": "BID_RECEIVED"
}
```

#### rfq:status_changed
Emitted when RFQ status changes.

**Payload**:
```json
{
  "rfqId": "507f1f77bcf86cd799439020",
  "oldStatus": "ACTIVE",
  "newStatus": "CLOSED"
}
```

### 5.2 Client to Server Events

#### join:rfq
Join a room for a specific RFQ.

**Payload**:
```json
{
  "rfqId": "507f1f77bcf86cd799439020"
}
```

#### leave:rfq
Leave a room for a specific RFQ.

**Payload**:
```json
{
  "rfqId": "507f1f77bcf86cd799439020"
}
```

---

## 6. Error Handling

### 6.1 Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| AUTH_001 | Invalid credentials | 401 |
| AUTH_002 | Token expired | 401 |
| AUTH_003 | User not found | 404 |
| AUTH_004 | Email already exists | 400 |
| RFQ_001 | RFQ not found | 404 |
| RFQ_002 | Invalid RFQ data | 400 |
| RFQ_003 | RFQ not active | 400 |
| RFQ_004 | Not authorized to access RFQ | 403 |
| BID_001 | RFQ not found | 404 |
| BID_002 | Bid already submitted | 400 |
| BID_003 | Invalid bid data | 400 |
| BID_004 | Auction closed | 400 |
| SRV_001 | Internal server error | 500 |
| SRV_002 | Database error | 500 |

### 6.2 Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific error details"
  }
}
```

---

## 7. Security Implementation

### 7.1 Authentication Middleware

```javascript
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or inactive user'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};
```

### 7.2 Input Validation

```javascript
const validateRFQ = (req, res, next) => {
  const { rfqName, serviceType, pickupLocation, deliveryLocation } = req.body;
  
  if (!rfqName || rfqName.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'RFQ name must be at least 3 characters'
    });
  }
  
  const validServiceTypes = ['FCL', 'ROAD', 'AIR', 'LCL', 'WAREHOUSE'];
  if (!validServiceTypes.includes(serviceType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid service type'
    });
  }
  
  next();
};
```

### 7.3 Rate Limiting (Future)

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', apiLimiter);
```

---

## 8. Caching Strategy (Future)

### 8.1 Redis Cache Implementation

```javascript
const redis = require('redis');
const client = redis.createClient();

// Cache user profile
const cacheUserProfile = async (userId, userData) => {
  await client.setEx(`user:${userId}`, 3600, JSON.stringify(userData));
};

const getCachedUserProfile = async (userId) => {
  const cached = await client.get(`user:${userId}`);
  return cached ? JSON.parse(cached) : null;
};

// Cache RFQ details
const cacheRFQ = async (rfqId, rfqData) => {
  await client.setEx(`rfq:${rfqId}`, 300, JSON.stringify(rfqData));
};
```

### 8.2 Cache Invalidation

- Invalidate user cache on profile update
- Invalidate RFQ cache on bid submission
- Invalidate RFQ cache on auction extension
- TTL-based expiration for safety

---

## 9. Logging Strategy

### 9.1 Application Logging

```javascript
const morgan = require('morgan');

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Production logging (structured JSON)
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => {
        logger.info(message.trim());
      }
    }
  }));
}
```

### 9.2 Activity Logging

```javascript
const logActivity = async (data) => {
  await ActivityLog.create({
    rfqId: data.rfqId,
    actorId: data.actorId,
    actorRole: data.actorRole,
    actionType: data.actionType,
    message: data.message,
    metadata: data.metadata
  });
};
```

---

## 10. Testing Strategy

### 10.1 Unit Testing

```javascript
// User Model Test
describe('User Model', () => {
  test('should hash password before saving', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    
    await user.save();
    
    expect(user.passwordHash).not.toBe('password123');
    expect(user.passwordHash).toBeDefined();
  });
  
  test('should compare password correctly', async () => {
    const user = await User.findOne({ email: 'test@example.com' });
    const isMatch = await user.comparePassword('password123');
    
    expect(isMatch).toBe(true);
  });
});
```

### 10.2 Integration Testing

```javascript
// RFQ API Test
describe('RFQ API', () => {
  test('should create RFQ', async () => {
    const response = await request(app)
      .post('/api/rfqs')
      .set('Authorization', `Bearer ${token}`)
      .send(rfqData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rfq).toHaveProperty('referenceId');
  });
  
  test('should get RFQs', async () => {
    const response = await request(app)
      .get('/api/rfqs')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.rfqs).toBeInstanceOf(Array);
  });
});
```

### 10.3 E2E Testing

```javascript
// Cypress Test
describe('RFQ Flow', () => {
  it('should create RFQ and receive bids', () => {
    cy.login('buyer@example.com', 'password123');
    cy.visit('/rfqs/create');
    
    cy.get('[name="rfqName"]').type('Test RFQ');
    cy.get('[name="serviceType"]').select('FCL');
    cy.get('[name="pickupLocation"]').type('Shanghai');
    cy.get('[name="deliveryLocation"]').type('Los Angeles');
    cy.get('button[type="submit"]').click();
    
    cy.url().should('include('/rfqs/'));
    cy.contains('Test RFQ').should('exist');
  });
});
```

---

## 11. Deployment Configuration

### 11.1 Environment Variables

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://auction-connect.vercel.app

# Socket.IO
SOCKET_IO_CORS_ORIGIN=https://auction-connect.vercel.app

# Rate Limiting (future)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 11.2 Docker Configuration (Future)

```dockerfile
# Dockerfile
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongo:27017/auction_connect
      - NODE_ENV=production
    depends_on:
      - mongo
  
  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

---

## 12. Performance Metrics

### 12.1 Key Performance Indicators (KPIs)

- **API Response Time**: < 500ms (p95)
- **Database Query Time**: < 200ms (p95)
- **WebSocket Latency**: < 100ms (p95)
- **Page Load Time**: < 2 seconds
- **Time to Interactive**: < 3 seconds
- **Error Rate**: < 0.1%
- **Uptime**: > 99.5%

### 12.2 Monitoring Tools

- Application Performance Monitoring (APM): New Relic / Datadog
- Error Tracking: Sentry
- Log Aggregation: Loggly / Papertrail
- Uptime Monitoring: UptimeRobot / Pingdom
- Database Monitoring: MongoDB Atlas Insights

---

## 13. Scalability Architecture

### 13.1 Horizontal Scaling

```
                    Load Balancer
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   Backend Instance 1  Backend Instance 2  Backend Instance 3
        │                │                │
        └────────────────┼────────────────┘
                         │
                    Redis Cluster
                         │
                    MongoDB Atlas
              (Primary + 2 Secondaries)
```

### 13.2 Database Scaling

- **Read Replicas**: Distribute read operations
- **Sharding**: Distribute data across multiple shards
- **Index Optimization**: Regular index analysis and optimization
- **Connection Pooling**: Reuse database connections

### 13.3 WebSocket Scaling

```javascript
// Socket.IO Redis Adapter
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const io = new Server(server, {
  adapter: createAdapter(
    createClient({ host: 'redis', port: 6379 }),
    createClient({ host: 'redis', port: 6379 })
  )
});
```

---

## 14. Disaster Recovery

### 14.1 Backup Strategy

- **Automated Backups**: Daily snapshots
- **Point-in-Time Recovery**: Up to 35 days
- **Cross-Region Replication**: Primary in US, Secondary in EU
- **Backup Verification**: Weekly restore tests

### 14.2 Failover Procedure

1. Detect primary failure (automatic monitoring)
2. Promote secondary to primary (automatic)
3. Update DNS records (TTL: 60 seconds)
4. Notify stakeholders (automated alerts)
5. Investigate root cause
6. Restore failed primary
7. Switch back when safe

---

## 15. Maintenance Schedule

### 15.1 Regular Tasks

- **Daily**: Monitor logs and metrics
- **Weekly**: Review performance reports
- **Monthly**: Security audits and updates
- **Quarterly**: Database optimization and index review
- **Annually**: Disaster recovery drill

### 15.2 Update Deployment

- **Hotfixes**: Deploy immediately with testing
- **Minor Updates**: Deploy during off-peak hours
- **Major Updates**: Deploy with feature flags and rollback plan
- **Database Migrations**: Deploy with zero-downtime strategy
