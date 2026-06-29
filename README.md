# Supersite Citizens Backend

Supersite Citizens Backend is the REST API for the Supersite Citizens platform. It powers authentication, role-based access control, dashboards, resources, academy content, attendance, deployments, reports, assignments, leader forums, applications, notifications, uploads, and administrative workflows.

## Tech Stack

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- JWT authentication
- Zod validation
- Multer uploads
- Cloudinary or local file storage
- Helmet, CORS, Morgan

## Key Features

- JWT access and refresh token authentication.
- Role-based authorization for Cluster Members, Cluster Leaders, Cluster Supervisors, Registered Partners, and Field Evangelists.
- Modular API structure organized by domain.
- MongoDB persistence with Mongoose models.
- Validated request bodies and route params with Zod.
- Paginated list endpoints with shared query helpers.
- Resource uploads with local storage for development or Cloudinary for production.
- Leader-only reports, assignments, and private forum threads.
- Attendance check-in constrained by meeting time windows.
- Admin overview, audit logs, and upload signing support.

## Project Structure

```txt
src/
  app.ts                         Express app setup, middleware, health route
  server.ts                      Database connection and server bootstrap
  config/                        Environment parsing and validation
  constants/                     Shared role constants
  db/                            MongoDB connection helpers
  middlewares/                   Auth, validation, upload, and error handlers
  modules/                       Domain modules, routes, and models
  routes/                        API route registration
  types/                         Express request type augmentation
  utils/                         API response, errors, JWT, pagination, storage
```

Important modules:

```txt
academy/                         Lessons, manuals, quizzes, exams, certificates
admin/                           Admin overview, audit logs, signed uploads
announcements/                   Movement announcements
applications/                    Partner and leader applications
assignments/                     Leader-created assignments
attendance/                      Meeting attendance and check-in
auth/                            Register, login, refresh, logout, current user
cluster-centers/                 Cluster center records
communication/                   Prayer networks and project updates
deployments/                     Outreach and community projects
leader-forums/                   Private leader discussions
meetings/                        Meeting scheduling and check-in windows
resources/                       Role-visible files and media
skills/                          Member skill profiles
social-links/                    Public social media links
users/                           User management and role assignment
```

## Requirements

- Node.js 20 or newer recommended
- npm
- MongoDB running locally or hosted
- Cloudinary account if using Cloudinary storage

## Environment Variables

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Required and common variables:

```env
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
MONGODB_URI=mongodb://127.0.0.1:27017/super-citizens
JWT_ACCESS_SECRET=replace-with-a-long-access-secret
JWT_REFRESH_SECRET=replace-with-a-long-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
UPLOAD_BASE_URL=http://localhost:5000/uploads
LOCAL_UPLOAD_DIR=uploads
STORAGE_PROVIDER=local
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Use long, random JWT secrets in production.

## CORS

`CORS_ORIGIN` supports a single origin, multiple comma-separated origins, or `*`.

```env
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,https://yourdomain.com
```

## File Storage

The backend supports two storage modes.

Local development:

```env
STORAGE_PROVIDER=local
UPLOAD_BASE_URL=http://localhost:5000/uploads
LOCAL_UPLOAD_DIR=uploads
```

Cloudinary:

```env
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

When Cloudinary is enabled, file uploads through resource and upload endpoints are stored in Cloudinary and returned as secure URLs.

## Getting Started

Install dependencies:

```bash
npm install
```

Start MongoDB, then run the development server:

```bash
npm run dev
```

The API will listen on:

```txt
http://localhost:5000
```

Health check:

```txt
GET http://localhost:5000/health
```

API base URL:

```txt
http://localhost:5000/api/v1
```

## Scripts

```bash
npm run dev        # Start the API with tsx watch
npm run typecheck  # Run TypeScript without emitting files
npm run build      # Compile TypeScript into dist/
npm run start      # Run the compiled production server
```

## Authentication

Auth routes live under `/api/v1/auth`.

```txt
GET  /auth/seed-admin
POST /auth/seed-admin
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

Protected endpoints require:

```txt
Authorization: Bearer <accessToken>
```

Default registered users receive the `Cluster Member` role. Administrative access is tied to `Cluster Supervisor`.

Local development seed accounts are disabled when `NODE_ENV=production`.

```txt
Seed admin browser URL:  http://localhost:5000/api/v1/auth/seed-admin
Seed admin login:        admin@example.com / Admin123!
Seed leader browser URL: http://localhost:5000/api/v1/leader-applications/seed-leader
Seed leader login:       leader@example.com / Leader123!
```

## API Domains

Registered route groups:

```txt
/auth
/users
/roles
/clusters
/cluster-centers
/resources
/attendance
/academy
/quizzes
/exams
/certificates
/meetings
/deployments
/skills
/certification-levels
/reports
/announcements
/partner-applications
/leader-applications
/applications
/assignments
/communication
/prayer-networks
/project-updates
/leader-forums
/social-links
/notifications
/admin
/uploads
```

Most list endpoints support pagination query parameters:

```txt
page
limit
search
sort
order
```

## Response Shape

Successful responses use the shared API response helper:

```json
{
  "success": true,
  "message": "Resource loaded.",
  "data": {}
}
```

Paginated responses return:

```json
{
  "success": true,
  "message": "Resources loaded.",
  "data": {
    "data": [],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

Errors are handled centrally and include status-specific messages and codes.

## Frontend Integration

The frontend should use:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

For local development, configure the backend:

```env
CORS_ORIGIN=http://localhost:3000
```

After login or registration, the frontend stores the access token and sends it on protected dashboard requests.

## Production Notes

- Use a managed MongoDB instance or a properly secured MongoDB server.
- Set strong JWT secrets.
- Use `NODE_ENV=production`.
- Configure `CORS_ORIGIN` with exact frontend origins.
- Use `STORAGE_PROVIDER=cloudinary` for durable file storage.
- Keep Cloudinary and JWT secrets out of version control.
- Build before deployment with `npm run build`, then run `npm run start`.

## API Contract

The frontend repository contains a detailed API contract at:

```txt
docs/api-endpoints.md
```
