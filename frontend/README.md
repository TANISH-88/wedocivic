# We Do Civic - Frontend

## 🏗️ Part 1: Core Infrastructure

Foundation layer for the We Do Civic civic engagement platform built with Next.js 14, TypeScript, and Tailwind CSS.

## 📦 What Was Committed

### Configuration Files
- All Next.js, TypeScript, Tailwind, and ESLint configs
- package.json with all dependencies

### Core Folders Included
- **`src/lib/`** - API clients (api.ts, adminApi.ts), utilities, validations
- **`src/hooks/`** - Custom React hooks (useDebounce, useRequireAuth)
- **`src/store/`** - State management stores (auth.store.ts, chat.store.ts)
- **`src/services/`** - Complete API service layer (auth, user, post, event, group, chat, notification, social, admin services)
- **`src/components/ui/`** - Avatar component
- **`src/components/layout/`** - Navbar and Sidebar
- **`src/components/providers/`** - AuthProvider
- **`src/app/`** - Root layout.tsx and globals.css only



```bash
npm install
