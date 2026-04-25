# Database Schema Design - Auction Connect Platform

## 1. Database Overview

The Auction Connect Platform uses MongoDB as the primary database due to its flexible schema design, scalability, and suitability for auction/bidding systems with complex, evolving data structures.

### 1.1 Database Name
`auction_connect_db`

### 1.2 Collections
- `users` - User accounts and profiles
- `rfqs` - Request for Quotations
- `bids` - Bid submissions
- `activity_logs` - Audit trail and activity tracking

---

## 2. Collection Schemas

### 2.1 Users Collection

#### Purpose
Store user account information, authentication credentials, and profile data for all user roles (buyer, supplier, admin).

#### Schema Definition

```javascript
{
  _id: ObjectId,
  name: String,                    // Full name of the user
  email: String,                   // Unique email address (indexed)
  passwordHash: String,            // Bcrypt hashed password
  role: String,                    // 'buyer' | 'supplier' | 'admin'
  companyName: String,             // Company name
  phone: String,                   // Contact phone number
  isActive: Boolean,               // Account status (default: true)
  createdAt: Date,                 // Account creation timestamp
  updatedAt: Date                  // Last update timestamp
}
```

#### Indexes
- `email` (unique, ascending) - Fast login lookups
- `role` (ascending) - Role-based queries
- `companyName` (ascending) - Company searches
- `isActive` (ascending) - Active user filtering

#### Relationships
- One-to-Many with RFQs (createdBy)
- One-to-Many with Bids (supplierId)
- One-to-Many with Activity Logs (actorId)

#### Validation Rules
- `email`: Required, unique, valid email format
- `passwordHash`: Required, minimum 6 characters
- `role`: Required, enum: ['buyer', 'supplier', 'admin']
- `phone`: Optional, valid phone format

---

### 2.2 RFQs Collection

#### Purpose
Store Request for Quotation details including auction parameters, timeline, and supplier invitations.

#### Schema Definition

```javascript
{
  _id: ObjectId,
  rfqName: String,                 // Human-readable RFQ name
  referenceId: String,             // Unique RFQ reference (indexed)
  description: String,             // Detailed description
  serviceType: String,             // 'FCL' | 'ROAD' | 'AIR' | 'LCL' | 'WAREHOUSE'
  pickupLocation: String,          // Origin location
  deliveryLocation: String,        // Destination location
  pickupDate: Date,                // Pickup/delivery date
  bidStartTime: Date,              // When bidding starts
  originalCloseTime: Date,         // Initial auction close time
  currentCloseTime: Date,          // Current auction close time (may be extended)
  forcedCloseTime: Date,           // Hard deadline (cannot extend beyond)
  triggerWindowMinutes: Number,    // Time window for auction extension triggers
  extensionDurationMinutes: Number, // Duration to extend auction when triggered
  triggerType: String,             // 'BID_RECEIVED' | 'L1_CHANGE' | 'MANUAL'
  auctionEnabled: Boolean,         // Whether auction mechanics are enabled
  status: String,                  // 'DRAFT' | 'UPCOMING' | 'ACTIVE' | 'CLOSED' | 'CANCELLED'
  createdBy: ObjectId,             // User ID (buyer who created RFQ) (indexed)
  invitedSuppliers: [ObjectId],    // Array of supplier user IDs
  estimatedValue: Number,          // Estimated value for budgeting
  currency: String,                // Currency code (default: 'USD')
  createdAt: Date,                 // RFQ creation timestamp
  updatedAt: Date                  // Last update timestamp
}
```

#### Indexes
- `referenceId` (unique, ascending) - Unique RFQ identifier
- `createdBy` (ascending) - Buyer's RFQs
- `status` (ascending) - Status filtering
- `bidStartTime` (ascending) - Upcoming RFQs
- `currentCloseTime` (ascending) - Active/closing auctions
- `invitedSuppliers` (ascending) - Supplier's accessible RFQs
- Compound: `status + currentCloseTime` - Active auctions by time

#### Relationships
- Many-to-One with Users (createdBy → buyer)
- Many-to-Many with Users (invitedSuppliers → suppliers)
- One-to-Many with Bids (rfqId)
- One-to-Many with Activity Logs (rfqId)

#### Validation Rules
- `rfqName`: Required, min 3 characters
- `referenceId`: Required, unique, format: RFQ-{CODE}-{NUM}
- `serviceType`: Required, enum: ['FCL', 'ROAD', 'AIR', 'LCL', 'WAREHOUSE']
- `triggerType`: Required, enum: ['BID_RECEIVED', 'L1_CHANGE', 'MANUAL']
- `status`: Required, enum: ['DRAFT', 'UPCOMING', 'ACTIVE', 'CLOSED', 'CANCELLED']
- `bidStartTime`: Required, must be <= currentCloseTime
- `currentCloseTime`: Required, must be <= forcedCloseTime
- `triggerWindowMinutes`: Required, positive integer
- `extensionDurationMinutes`: Required, positive integer

---

### 2.3 Bids Collection

#### Purpose
Store bid submissions from suppliers including pricing details, transit time, and ranking information.

#### Schema Definition

```javascript
{
  _id: ObjectId,
  rfqId: ObjectId,                 // RFQ ID (indexed)
  supplierId: ObjectId,           // Supplier user ID (indexed)
  carrierName: String,            // Freight carrier name
  freightCharges: Number,         // Base freight cost
  originCharges: Number,          // Charges at origin
  destinationCharges: Number,     // Charges at destination
  taxes: Number,                  // Applicable taxes
  discount: Number,               // Discount amount
  totalAmount: Number,            // Final bid amount (indexed)
  transitTime: Number,            // Transit time in days
  quoteValidity: Date,            // Quote expiration date
  remarks: String,                // Additional notes
  rankAtSubmission: Number,       // L1, L2, L3 position at submission
  rankAtClose: Number,            // Final rank when auction closed
  winner: Boolean,                // Whether this bid was selected as winner
  createdAt: Date,                // Bid submission timestamp
  updatedAt: Date                 // Last update timestamp
}
```

#### Indexes
- `rfqId` (ascending) - All bids for an RFQ
- `supplierId` (ascending) - Supplier's bid history
- `totalAmount` (ascending) - Bid ranking
- Compound: `rfqId + totalAmount` - Bids sorted by amount per RFQ
- Compound: `rfqId + supplierId` - Unique bid per supplier per RFQ

#### Relationships
- Many-to-One with RFQs (rfqId)
- Many-to-One with Users (supplierId)

#### Validation Rules
- `rfqId`: Required, must reference valid RFQ
- `supplierId`: Required, must reference valid supplier
- `totalAmount`: Required, positive number
- `transitTime`: Required, positive integer
- `rankAtSubmission`: Required, positive integer (1 = L1)
- `quoteValidity`: Required, future date

#### Computed Fields
- `totalAmount` = freightCharges + originCharges + destinationCharges + taxes - discount

---

### 2.4 Activity Logs Collection

#### Purpose
Track all user actions and system events for audit trails, analytics, and compliance requirements.

#### Schema Definition

```javascript
{
  _id: ObjectId,
  rfqId: ObjectId,                 // Related RFQ ID (indexed)
  actorId: ObjectId,               // User who performed action (indexed)
  actorRole: String,               // Role of actor ('buyer' | 'supplier' | 'admin')
  actionType: String,              // 'RFQ_CREATED' | 'BID_SUBMITTED' | 'AUCTION_EXTENDED' | 'WINNER_SELECTED' | 'RFQ_CANCELLED'
  message: String,                 // Human-readable action description
  metadata: Object,                // Additional context (flexible schema)
  createdAt: Date                  // Action timestamp (indexed)
}
```

#### Indexes
- `rfqId` (ascending) - Activity log per RFQ
- `actorId` (ascending) - User's activity history
- `actionType` (ascending) - Filter by action type
- `createdAt` (descending) - Chronological order
- Compound: `rfqId + createdAt` - RFQ timeline
- Compound: `actorId + createdAt` - User timeline

#### Relationships
- Many-to-One with RFQs (rfqId)
- Many-to-One with Users (actorId)

#### Validation Rules
- `actorId`: Required, must reference valid user
- `actorRole`: Required, enum: ['buyer', 'supplier', 'admin']
- `actionType`: Required, enum: ['RFQ_CREATED', 'BID_SUBMITTED', 'AUCTION_EXTENDED', 'WINNER_SELECTED', 'RFQ_CANCELLED', 'RFQ_UPDATED', 'BID_UPDATED']
- `message`: Required, min 1 character

#### Metadata Schema (Flexible)
```javascript
// RFQ_CREATED
{
  referenceId: String,
  rfqName: String
}

// BID_SUBMITTED
{
  bidId: ObjectId,
  totalAmount: Number,
  rank: Number,
  supplierName: String
}

// AUCTION_EXTENDED
{
  previousCloseTime: Date,
  newCloseTime: Date,
  extensionCount: Number,
  triggerReason: String
}

// WINNER_SELECTED
{
  winningBidId: ObjectId,
  winningSupplierId: ObjectId,
  winningAmount: Number
}
```

---

## 3. Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│     Users       │
│─────────────────│
│ _id (PK)        │
│ name            │
│ email           │
│ passwordHash    │
│ role            │
│ companyName     │
│ phone           │
│ isActive        │
│ createdAt       │
│ updatedAt       │
└────────┬────────┘
         │
         │ 1
         │
         │ N
         │
┌────────▼────────┐         ┌─────────────────┐
│     RFQs        │         │   Activity Logs │
│─────────────────│         │─────────────────│
│ _id (PK)        │         │ _id (PK)        │
│ rfqName         │◄────────│ rfqId (FK)      │
│ referenceId     │         │ actorId (FK)    │
│ description     │         │ actorRole       │
│ serviceType     │         │ actionType      │
│ pickupLocation  │         │ message         │
│ deliveryLocation│         │ metadata        │
│ pickupDate      │         │ createdAt       │
│ bidStartTime    │         └─────────────────┘
│ originalCloseTime│
│ currentCloseTime│
│ forcedCloseTime │
│ triggerWindowMin│
│ extensionDurMin │
│ triggerType     │
│ auctionEnabled  │
│ status          │
│ createdBy (FK)──┼─────────┐
│ invitedSuppliers│         │
│ estimatedValue  │         │
│ currency        │         │
│ createdAt       │         │
│ updatedAt       │         │
└────────┬────────┘         │
         │                  │
         │ 1                │
         │                  │
         │ N                │
         │                  │
┌────────▼────────┐         │
│     Bids        │         │
│─────────────────│         │
│ _id (PK)        │         │
│ rfqId (FK)──────┘         │
│ supplierId (FK)───────────┘
│ carrierName     │
│ freightCharges  │
│ originCharges   │
│ destinationCharges│
│ taxes           │
│ discount        │
│ totalAmount     │
│ transitTime     │
│ quoteValidity   │
│ remarks         │
│ rankAtSubmission│
│ rankAtClose     │
│ winner          │
│ createdAt       │
│ updatedAt       │
└─────────────────┘

Legend:
PK = Primary Key
FK = Foreign Key
1 = One
N = Many
```

---

## 4. Data Access Patterns

### 4.1 User Queries

#### Get User by Email (Login)
```javascript
db.users.findOne({ email: "user@example.com" })
```

#### Get User Profile
```javascript
db.users.findOne(
  { _id: ObjectId("...") },
  { projection: { passwordHash: 0 } }
)
```

#### Get All Suppliers
```javascript
db.users.find(
  { role: "supplier", isActive: true },
  { projection: { passwordHash: 0 } }
).sort({ name: 1 })
```

#### Get Buyer's RFQs
```javascript
db.rfqs.find({ createdBy: ObjectId("...") })
  .sort({ createdAt: -1 })
```

### 4.2 RFQ Queries

#### Get RFQ by Reference ID
```javascript
db.rfqs.findOne({ referenceId: "RFQ-SHA-LAX-001" })
```

#### Get Active RFQs for Supplier
```javascript
db.rfqs.find({
  status: "ACTIVE",
  invitedSuppliers: ObjectId("supplier_id")
}).sort({ currentCloseTime: 1 })
```

#### Get RFQ with Bids
```javascript
db.rfqs.aggregate([
  { $match: { _id: ObjectId("...") } },
  {
    $lookup: {
      from: "bids",
      localField: "_id",
      foreignField: "rfqId",
      as: "bids"
    }
  },
  {
    $addFields: {
      bidCount: { $size: "$bids" },
      lowestBid: { $min: "$bids.totalAmount" }
    }
  }
])
```

### 4.3 Bid Queries

#### Get Bids for RFQ (Sorted by Amount)
```javascript
db.bids.find({ rfqId: ObjectId("...") })
  .sort({ totalAmount: 1 })
```

#### Get Supplier's Bid History
```javascript
db.bids.find({ supplierId: ObjectId("...") })
  .sort({ createdAt: -1 })
```

#### Get L1 Bid for RFQ
```javascript
db.bids.findOne(
  { rfqId: ObjectId("...") },
  { sort: { totalAmount: 1 } }
)
```

### 4.4 Activity Log Queries

#### Get RFQ Timeline
```javascript
db.activity_logs.find({ rfqId: ObjectId("...") })
  .sort({ createdAt: 1 })
```

#### Get User Activity
```javascript
db.activity_logs.find({ actorId: ObjectId("...") })
  .sort({ createdAt: -1 })
  .limit(50)
```

---

## 5. Data Integrity Constraints

### 5.1 Referential Integrity
- `bids.rfqId` must reference existing RFQ
- `bids.supplierId` must reference existing supplier user
- `rfqs.createdBy` must reference existing buyer user
- `rfqs.invitedSuppliers` must reference existing supplier users
- `activity_logs.rfqId` must reference existing RFQ (optional)
- `activity_logs.actorId` must reference existing user

### 5.2 Business Rules
- Supplier can submit only one bid per RFQ (enforced at application level)
- RFQ status transition: DRAFT → UPCOMING → ACTIVE → CLOSED (or CANCELLED)
- Bids can only be submitted when RFQ status is ACTIVE
- Auction can only be extended if currentCloseTime < forcedCloseTime
- Winner can only be selected when RFQ status is CLOSED

### 5.3 Data Consistency
- `totalAmount` in bids must equal sum of charges minus discount
- `rankAtSubmission` must be recalculated on each bid submission
- `currentCloseTime` must be updated when auction is extended
- `updatedAt` must be updated on any document modification

---

## 6. Performance Optimization

### 6.1 Indexing Strategy

#### Critical Indexes
```javascript
// Users collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })
db.users.createIndex({ companyName: 1 })
db.users.createIndex({ isActive: 1 })

// RFQs collection
db.rfqs.createIndex({ referenceId: 1 }, { unique: true })
db.rfqs.createIndex({ createdBy: 1 })
db.rfqs.createIndex({ status: 1 })
db.rfqs.createIndex({ bidStartTime: 1 })
db.rfqs.createIndex({ currentCloseTime: 1 })
db.rfqs.createIndex({ invitedSuppliers: 1 })
db.rfqs.createIndex({ status: 1, currentCloseTime: 1 })

// Bids collection
db.bids.createIndex({ rfqId: 1 })
db.bids.createIndex({ supplierId: 1 })
db.bids.createIndex({ totalAmount: 1 })
db.bids.createIndex({ rfqId: 1, totalAmount: 1 })
db.bids.createIndex({ rfqId: 1, supplierId: 1 }, { unique: true })

// Activity Logs collection
db.activity_logs.createIndex({ rfqId: 1 })
db.activity_logs.createIndex({ actorId: 1 })
db.activity_logs.createIndex({ actionType: 1 })
db.activity_logs.createIndex({ createdAt: -1 })
db.activity_logs.createIndex({ rfqId: 1, createdAt: 1 })
db.activity_logs.createIndex({ actorId: 1, createdAt: 1 })
```

### 6.2 Query Optimization
- Use projection to limit returned fields
- Use `lean()` for read-only queries
- Implement pagination for large result sets
- Use aggregation for complex queries
- Cache frequently accessed data (future: Redis)

### 6.3 Sharding Strategy (Future)
- Shard by `createdBy` for RFQs (buyer-based distribution)
- Shard by `supplierId` for Bids (supplier-based distribution)
- Use hashed sharding for Activity Logs (even distribution)

---

## 7. Backup & Recovery

### 7.1 Backup Strategy
- Continuous backups via MongoDB Atlas
- Point-in-time recovery (up to 35 days)
- Cross-region replication for disaster recovery
- Manual snapshots before major changes

### 7.2 Recovery Procedures
- Automated failover to secondary replica
- Point-in-time recovery for data corruption
- Restore from snapshot for catastrophic failure
- Data integrity verification after restore

---

## 8. Security & Compliance

### 8.1 Data Encryption
- Encryption at rest (MongoDB Atlas default)
- Encryption in transit (TLS 1.2+)
- Field-level encryption for sensitive data (future)

### 8.2 Access Control
- Role-based access at application level
- Database user with least privilege
- IP whitelisting for MongoDB Atlas
- Audit logging for all database operations

### 8.3 Data Retention
- Activity logs: 1 year
- Closed RFQs: 3 years
- Cancelled RFQs: 1 year
- User accounts: 5 years after last activity

### 8.4 GDPR Compliance
- Right to access (user can request data export)
- Right to deletion (user account deletion)
- Data portability (export in standard format)
- Consent management (user consent tracking)

---

## 9. Migration Strategy

### 9.1 Schema Versioning
- Use Mongoose schema versioning
- Maintain backward compatibility
- Document breaking changes
- Provide migration scripts

### 9.2 Data Migration
- Zero-downtime migrations where possible
- Rollback procedures for failed migrations
- Testing in staging environment first
- Monitor performance post-migration

---

## 10. Monitoring & Maintenance

### 10.1 Database Monitoring
- Query performance monitoring
- Index usage statistics
- Connection pool monitoring
- Storage growth tracking
- Slow query logging

### 10.2 Maintenance Tasks
- Index rebuild (as needed)
- Statistics collection
- Compaction (for large collections)
- TTL index cleanup for expired data
- Regular health checks

---

## 11. Schema Evolution

### 11.1 Planned Enhancements
- Add `documents` array to RFQs (file attachments)
- Add `tags` array to RFQs (categorization)
- Add `rating` field to Users (supplier rating)
- Add `paymentStatus` to RFQs (payment tracking)
- Add `revisionHistory` array to RFQs (change tracking)

### 11.2 Future Collections
- `notifications` - In-app notifications
- `messages` - Chat/messaging between users
- `documents` - File metadata and storage references
- `payments` - Payment transaction records
- `reviews` - Supplier reviews and ratings
