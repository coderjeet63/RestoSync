# Scalable POS Backend

A scalable Point of Sale (POS) backend system built with Node.js.

## Project Structure

```
scalable-pos-backend/
├── docs/
│   ├── 01_official_specs/       # Company Standards
│   │   ├── PRDs/                # Product Requirement Documents 
│   │   ├── API_Contracts/       # Swagger/Postman API definitions
│   │   └── Architecture/        # Database Schemas & System flow diagrams
│   │
│   └── 02_engineering_journal/  # Engineering Documentation
│       ├── why_we_chose_it/     # Technical trade-offs (e.g., Why RabbitMQ over Kafka?)
│       ├── interview_qa/        # Scalability questions & cross-questioning
│       └── crash_reports/       # Load testing failures and solutions
│
├── src/                         # Source Code
│   ├── api/                     # API endpoints and routes
│   ├── workers/                 # Background workers and job processors
│   └── config/                  # Configuration files
│
├── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_uri
UPSTASH_REDIS_URL=your_redis_url
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
```

### Running the Application

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## Documentation

- **Official Specs**: Located in `docs/01_official_specs/` - Contains PRDs, API contracts, and architecture diagrams
- **Engineering Journal**: Located in `docs/02_engineering_journal/` - Contains technical decisions, interview Q&A, and crash reports

## License

ISC
