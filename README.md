# Store X - Modern Marketplace

A Next.js-based marketplace application with dark theme and modern features.

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd store-x
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**

   Copy `.env.example` to `.env` and fill in your values:

   ```bash
   cp .env.example .env
   ```

   Required environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Secret key for JWT tokens
   - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
   - `CLOUDINARY_API_KEY`: Your Cloudinary API key
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API secret

4. **Database Setup**

   Run the database migration:
   ```bash
   node run-migration.js
   ```

5. **Development Server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the app.

## Features

- User authentication and profiles
- Posts with images/videos
- Chat messaging
- Stories
- Follow/unfollow users
- Comments and likes
- File uploads via Cloudinary

## Deployment

This app is designed to deploy on Vercel with:

- PostgreSQL database (Neon recommended)
- Cloudinary for file storage
- Serverless functions for API routes

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **File Storage**: Cloudinary
- **Authentication**: JWT
