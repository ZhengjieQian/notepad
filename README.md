# KnowFlow AI

A production-ready document intelligence platform built with Next.js 16, featuring secure authentication, cloud storage, and vector-based semantic search capabilities.

## 🎯 Overview

KnowFlow AI is a full-stack document management system that combines modern web technologies with AI-powered document processing. The platform enables users to upload, store, and intelligently search through documents using advanced embedding techniques and vector databases.

## ✨ Key Features

- **🔐 Secure Authentication**: Multi-provider authentication (Google OAuth + Email/Password) using NextAuth.js
- **📄 Document Management**: Upload, store, and manage PDF documents with AWS S3 integration
- **🧠 AI-Powered Processing**: Automatic text extraction and intelligent chunking using LangChain
- **🔍 Vector Search**: Document embeddings stored in Pinecone for semantic search capabilities
- **💾 Database**: PostgreSQL with Prisma ORM for robust data management
- **🎨 Modern UI**: Responsive interface built with React 19, TypeScript, and Tailwind CSS
- **🚀 Production-Ready**: Implements best practices for security, error handling, and scalability

## 🏗️ Architecture

```
User → Next.js Frontend → API Routes (Backend 1) → External Services
         ↓                      ↓
    NextAuth OAuth         ┌────┴────┬──────────────┬─────────────┐
         ↓                 ↓         ↓              ↓             ↓
    User Data       PostgreSQL  Pinecone     OpenAI API    AWS S3
                    (Metadata)  (Vectors)   (Embeddings)  (Files)
```

### System Flow

1. **Authentication**: Users authenticate via OAuth (Google) or credentials stored in PostgreSQL
2. **Document Upload**: Files are uploaded to AWS S3 with pre-signed URLs for security
3. **Text Processing**: PDF text is extracted and split into semantic chunks (1000 chars, 200 overlap)
4. **Embedding Generation**: OpenAI's text-embedding-ada-002 creates 1536-dimensional vectors
5. **Vector Storage**: Embeddings are stored in Pinecone with document metadata for retrieval
6. **Metadata Management**: Document information and user data stored in PostgreSQL

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** (App Router) - React framework with server-side rendering
- **React 19** - UI library with latest features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Accessible component primitives

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **NextAuth.js** - Authentication and session management
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Relational database
- **Zod** - Runtime type validation

### AI/ML & External Services
- **LangChain** - Document processing and AI orchestration
- **OpenAI API** - Embedding generation (text-embedding-ada-002)
- **Pinecone** - Vector database for semantic search
- **AWS S3** - Cloud object storage
- **PDF Parse** - PDF text extraction

## 📦 Installation

### Prerequisites
- Node.js 20+ 
- PostgreSQL database
- AWS account with S3 bucket
- Pinecone account and index
- OpenAI API key

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/knowflow"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_S3_BUCKET_NAME="your-bucket-name"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"

# Pinecone
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_INDEX_NAME="your-index-name"
```

### Setup

```bash
# Install dependencies
npm install

# Set up database schema
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/              # API routes (backend endpoints)
│   │   ├── auth/         # Authentication endpoints
│   │   ├── documents/    # Document management APIs
│   │   ├── register/     # User registration
│   │   └── user/         # User management
│   ├── (auth)/           # Auth pages (login, register)
│   ├── documents/        # Document listing and detail pages
│   ├── upload/           # File upload interface
│   └── user/             # User profile and settings
├── components/
│   ├── documents/        # Document-related components
│   ├── upload/           # Upload form components
│   └── ui/               # Reusable UI components
├── lib/                  # Utilities and configurations
├── schemas/              # Zod validation schemas
└── types/                # TypeScript type definitions
prisma/
├── schema.prisma         # Database schema
└── migrations/           # Database migrations
```

## 🔑 Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | Authentication handler |
| `/api/documents/upload-url` | POST | Generate S3 pre-signed URL |
| `/api/documents/finalize-upload` | POST | Confirm upload completion |
| `/api/documents/process-text` | POST | Extract and vectorize document |
| `/api/documents/list` | GET | Get user's documents |
| `/api/documents/[id]` | GET/DELETE | Document operations |
| `/api/user/change-password` | POST | Update user password |

## 🔄 Document Processing Pipeline

1. **Upload Request**: Frontend requests pre-signed URL from backend
2. **Direct Upload**: Client uploads file directly to S3 (no server bandwidth)
3. **Finalization**: Backend creates database record with S3 metadata
4. **Text Extraction**: PDF is parsed and text content extracted
5. **Chunking**: Text split into semantic chunks (RecursiveCharacterTextSplitter)
6. **Embedding**: Each chunk converted to 1536-dim vector via OpenAI
7. **Storage**: Vectors stored in Pinecone with metadata (documentId, chunkIndex)
8. **Status Update**: Document status updated to "processed"

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Vercel Deployment
This project is optimized for deployment on Vercel:

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

Ensure your PostgreSQL database is accessible from Vercel (consider using Vercel Postgres, Supabase, or Railway).

## 🔒 Security Features

- **Authentication**: Secure session management with JWT tokens
- **Password Hashing**: bcrypt for credential storage
- **CSRF Protection**: Built-in NextAuth.js protection
- **Pre-signed URLs**: Temporary, secure S3 upload links
- **Database**: Parameterized queries via Prisma (SQL injection prevention)
- **Type Safety**: Full TypeScript coverage
- **Validation**: Zod schemas for runtime data validation

## 📊 Database Schema

**Key Models:**
- `User`: User accounts (OAuth + credentials)
- `Account`: OAuth provider linkage
- `Session`: Active user sessions
- `Document`: Document metadata and processing status

## 🧪 Development

```bash
# Run development server with hot reload
npm run dev

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Database management
npx prisma studio  # Visual database browser
npx prisma migrate dev  # Create new migration
```

## 📝 License

This project is private and confidential.

## 👨‍💻 Author

Built with expertise in full-stack development, AI integration, and cloud architecture.

---

**Note**: This is a demonstration project showcasing modern web development practices, AI integration, and scalable architecture patterns.
