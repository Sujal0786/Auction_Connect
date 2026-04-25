# High-Level Design (HLD) - Auction Connect Platform

## 1. System Overview

The Auction Connect Platform is a B2B logistics auction platform that connects buyers (shippers) with suppliers (freight forwarders/carriers) through a reverse auction bidding system for RFQ (Request for Quotation) management.

### 1.1 Purpose
Enable buyers to create RFQs, invite suppliers, and receive competitive bids through real-time auction mechanisms with automatic bid ranking and auction extension features.

### 1.2 Scope
- Multi-role user management (Buyer, Supplier, Admin)
- RFQ creation and management
- Real-time bid submission and ranking
- Auction mechanics (L1 change trigger, bid received trigger)
- Activity logging and audit trails
- Real-time notifications via Socket.IO

---

## 2. Architecture Overview

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Web App    │  │  Mobile App  │  │   Admin UI   │             │
│  │  (React/Vite) │  │   (Future)   │  │   (Future)   │             │
│  └──────┬───────┘  └──────────────┘  └──────────────┘             │
│         │                                                               │
└─────────┼───────────────────────────────────────────────────────────────┘
          │ HTTPS/REST/WebSocket
┌─────────┴───────────────────────────────────────────────────────────────┐
│                      Presentation Layer (CDN)                           │
│                    Vercel Edge Network (Frontend)                      │
└─────────┬───────────────────────────────────────────────────────────────┘
          │
┌─────────┴───────────────────────────────────────────────────────────────┐
│                      API Gateway / Load Balancer                        │
│                    (Render/Railway Load Balancer)                      │
└─────────┬───────────────────────────────────────────────────────────────┘
          │
┌─────────┴───────────────────────────────────────────────────────────────┐
│                      Application Layer                                  │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │                    Backend API Server                          │     │
│  │                   (Express.js + Node.js)                       │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │     │
│  │  │ Auth     │  │ RFQ      │  │ Bid      │  │Dashboard │     │     │
│  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │     │     │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │     │
│  │  ┌──────────┐  ┌──────────┐                                    │     │
│  │  │ Socket   │  │ Activity │                                    │     │
│  │  │ IO Server│  │ Logger   │                                    │     │
│  │  └──────────┘  └──────────┘                                    │     │
│  └──────────────────────────────────────────────────────────────┘     │
└─────────┬───────────────────────────────────────────────────────────────┘
          │
┌─────────┴───────────────────────────────────────────────────────────────┐
│                      Data Layer                                         │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │                    MongoDB Atlas                               │     │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │     │
│  │  │ Users    │  │ RFQs     │  │ Bids     │  │ Activity │     │     │
│  │  │ Collection│ Collection│ Collection│ Logs     │     │     │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │     │
│  └──────────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

#### Frontend (Vercel)
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: React Context API
- **UI Components**: Custom components with Tailwind CSS
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client

#### Backend (Render/Railway)
- **Runtime**: Node.js 24.x
- **Framework**: Express.js 5.x
- **Real-time**: Socket.IO Server
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express middleware
- **Security**: Helmet.js, CORS

#### Database (MongoDB Atlas)
- **Database**: MongoDB (NoSQL)
- **ODM**: Mongoose 9.x
- **Hosting**: MongoDB Atlas (Cloud)
- **Indexing**: Optimized for RFQ and bid queries

#### DevOps & Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render/Railway
- **Database**: MongoDB Atlas
- **Version Control**: Git/GitHub
- **CI/CD**: Vercel/Render automatic deployments

---

## 3. System Components

### 3.1 Frontend Components

#### 3.1.1 Authentication Module
- Login Page
- Register Page
- Protected Route Wrapper
- Auth Context Provider

#### 3.1.2 Dashboard Module
- Buyer Dashboard
- Supplier Dashboard
- Admin Dashboard
- Role-based navigation

#### 3.1.3 RFQ Management Module
- RFQ List View
- RFQ Detail View
- Create RFQ Form
- RFQ Status Management
- Auction Timeline Display

#### 3.1.4 Bidding Module
- Bid Submission Form
- Bid History View
- Real-time Bid Rankings
- L1 Position Indicator

#### 3.1.5 Settings Module
- Profile Management
- Notification Preferences
- Security Settings

### 3.2 Backend Services

#### 3.2.1 Authentication Service
- User Registration
- User Login
- Token Generation & Validation
- Password Hashing (bcrypt)
- Session Management

#### 3.2.2 RFQ Service
- RFQ Creation
- RFQ Retrieval (by ID, by User)
- RFQ Update (status, close time)
- Supplier Invitation Management
- Auction Logic (trigger mechanisms)

#### 3.2.3 Bid Service
- Bid Submission
- Bid Ranking (L1, L2, L3 calculation)
- Bid History Retrieval
- Bid Validation
- Winner Selection

#### 3.2.4 Dashboard Service
- Buyer Statistics (total RFQs, active auctions)
- Supplier Statistics (bids submitted, win rate)
- Admin Statistics (platform overview)

#### 3.2.5 Activity Log Service
- Activity Recording
- Audit Trail Generation
- Activity Retrieval (by RFQ, by User)

#### 3.2.6 Socket.IO Service
- Real-time Bid Broadcasting
- Auction Extension Notifications
- RFQ Status Updates
- Connection Management

---

## 4. Data Flow

### 4.1 Authentication Flow

```
User → Login Form → POST /api/auth/login
                      ↓
               Validate Credentials
                      ↓
               Generate JWT Token
                      ↓
               Return Token + User Data
                      ↓
          Store in localStorage
                      ↓
         Attach token to subsequent requests
```

### 4.2 RFQ Creation Flow

```
Buyer → Create RFQ Form → POST /api/rfqs
                         ↓
                  Validate RFQ Data
                         ↓
                  Create RFQ in MongoDB
                         ↓
         Invite Suppliers (if specified)
                         ↓
         Trigger Socket.IO Event (new RFQ)
                         ↓
            Notify Invited Suppliers
```

### 4.3 Bid Submission Flow

```
Supplier → Bid Form → POST /api/bids
                      ↓
              Validate Bid Data
                      ↓
              Create Bid in MongoDB
                      ↓
              Recalculate Rankings (L1, L2, L3)
                      ↓
      Check Auction Trigger Conditions
                      ↓
         If Trigger Met → Extend Auction
                      ↓
         Broadcast Bid via Socket.IO
                      ↓
      Update All Connected Clients
```

### 4.4 Auction Extension Flow

```
Bid Submitted → Check Trigger Type
                      ↓
        ┌───────────┴───────────┐
        ↓                       ↓
  BID_RECEIVED              L1_CHANGE
        ↓                       ↓
  Any bid submitted         L1 position changed
        ↓                       ↓
  Within trigger window?    Within trigger window?
        ↓                       ↓
    Yes → Extend Auction    Yes → Extend Auction
```

---

## 5. Security Architecture

### 5.1 Authentication & Authorization
- JWT-based stateless authentication
- Token expiration: 7 days
- Role-based access control (RBAC)
- Protected routes with middleware

### 5.2 Data Security
- Password hashing with bcrypt (salt rounds: 10)
- HTTPS/TLS encryption in transit
- MongoDB Atlas encryption at rest
- Environment variable management
- CORS configuration for allowed origins

### 5.3 API Security
- Rate limiting (future implementation)
- Input validation and sanitization
- SQL injection prevention (NoSQL injection prevention)
- Helmet.js for HTTP header security
- Request size limits

---

## 6. Scalability Considerations

### 6.1 Horizontal Scaling
- Stateless API design for easy scaling
- Socket.IO with Redis adapter for multi-instance scaling
- MongoDB Atlas auto-scaling
- CDN for static assets (Vercel)

### 6.2 Performance Optimization
- Database indexing on frequently queried fields
- Connection pooling for MongoDB
- Caching strategy (Redis for future implementation)
- Lazy loading of RFQ data
- Pagination for large datasets

### 6.3 Monitoring & Logging
- Application logging with Morgan
- Activity logging for audit trails
- Error tracking (Sentry for future)
- Performance monitoring (APM for future)

---

## 7. Deployment Architecture

### 7.1 Production Environment

```
┌─────────────────────────────────────────────┐
│           Vercel (Frontend)                 │
│  - Static React build                       │
│  - Edge caching                             │
│  - Automatic HTTPS                          │
└──────────────┬──────────────────────────────┘
               │ API Calls (HTTPS)
┌──────────────┴──────────────────────────────┐
│         Render/Railway (Backend)             │
│  - Express.js server                        │
│  - Socket.IO server                         │
│  - Auto-scaling                             │
└──────────────┬──────────────────────────────┘
               │ MongoDB Connection
┌──────────────┴──────────────────────────────┐
│         MongoDB Atlas (Database)            │
│  - Multi-region replication                  │
│  - Automatic backups                        │
│  - Connection pooling                       │
└─────────────────────────────────────────────┘
```

### 7.2 Development Environment
- Local development with Docker Compose (future)
- Hot-reload for frontend (Vite)
- Nodemon for backend
- Local MongoDB instance or Atlas sandbox

---

## 8. External Integrations

### 8.1 Current Integrations
- None (standalone platform)

### 8.2 Future Integrations
- Payment Gateway (Stripe)
- Email Service (SendGrid)
- SMS Service (Twilio)
- Third-party Logistics APIs
- Document Management (AWS S3)
- Analytics (Google Analytics)

---

## 9. Non-Functional Requirements

### 9.1 Performance
- API response time: < 500ms (p95)
- Frontend load time: < 2 seconds
- WebSocket latency: < 100ms
- Database query time: < 200ms

### 9.2 Availability
- Target uptime: 99.5%
- Frontend: Vercel (99.99% SLA)
- Backend: Render/Railway (99.5% SLA)
- Database: MongoDB Atlas (99.99% SLA)

### 9.3 Scalability
- Support 1000+ concurrent users
- Handle 10,000+ RFQs
- Support 100,000+ bids
- 50+ concurrent WebSocket connections

### 9.4 Reliability
- Automatic failover
- Data backup (daily)
- Error handling and logging
- Graceful degradation

---

## 10. Technology Rationale

### 10.1 Why React + Vite?
- Fast development with hot module replacement
- Large ecosystem and community support
- Component-based architecture
- Excellent performance with Vite's build optimization

### 10.2 Why Express.js?
- Minimal and flexible framework
- Large middleware ecosystem
- Easy to learn and maintain
- Good for RESTful APIs

### 10.3 Why MongoDB?
- Flexible schema for evolving requirements
- Good fit for auction/bidding data structures
- Horizontal scaling capabilities
- Rich query capabilities

### 10.4 Why Socket.IO?
- Real-time bid updates
- Automatic reconnection
- Room-based broadcasting
- Fallback to HTTP polling

### 10.5 Why Vercel + Render?
- Vercel: Excellent frontend hosting with zero-config
- Render: Good for Node.js backends with WebSocket support
- Separate deployment for better isolation
- Cost-effective for MVP stage

---

## 11. Future Enhancements

### 11.1 Phase 2 Features
- Multi-currency support
- Geographic routing
- Advanced analytics dashboard
- Document upload/management
- Chat/messaging system
- Mobile app (React Native)

### 11.2 Phase 3 Features
- AI-powered bid recommendations
- Blockchain for bid verification
- Integration with freight tracking APIs
- Automated invoice generation
- Multi-language support
- Advanced reporting

---

## 12. Risk Assessment

### 12.1 Technical Risks
- WebSocket connection stability
- Database performance at scale
- Real-time synchronization issues
- Security vulnerabilities

### 12.2 Mitigation Strategies
- Socket.IO with Redis adapter
- Database indexing and sharding
- Event sourcing pattern
- Regular security audits
- Comprehensive testing

---

## 13. Compliance & Legal

### 13.1 Data Privacy
- GDPR compliance (for EU users)
- Data retention policies
- User consent management
- Right to deletion

### 13.2 Terms of Service
- Platform usage terms
- Bid acceptance terms
- Dispute resolution process
- Liability limitations
