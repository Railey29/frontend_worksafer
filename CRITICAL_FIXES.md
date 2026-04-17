# Critical Fixes - Implementation Guide

This document provides step-by-step fixes for the critical issues found in the code review.

## Fix #1: Add Authentication Headers to API Calls ⭐ HIGH PRIORITY

### Location: `src/components/lib/she-api.ts`

The API calls currently don't include JWT authentication. This needs to be fixed so protected endpoints work.

### Current Issue:
```typescript
export async function fetchReports(filters?: {...}): Promise<SHEReportsResponse> {
  const res = await fetch(url);  // ❌ NO AUTH HEADER
  if (!res.ok) {
    throw new Error(`Failed to fetch reports (${res.status})`);
  }
  return res.json();
}
```

### Fix:
Replace the entire file with this version that includes auth headers:

```typescript
// ============================================================
// EEI SHE Incident Analysis API — Service Layer
// Base URL: http://localhost:8000/api
// ============================================================

import type {
  SHEReport,
  SHEReportsResponse,
  SHEDepartments,
} from "./she-api-types";

const SHE_API_BASE = "http://localhost:8000/api";

/**
 * Get authorization headers for API requests
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found. Please log in.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Get headers for multipart form data (file uploads)
 */
function getAuthHeadersMultipart(): HeadersInit {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No authentication token found. Please log in.");
  }
  return {
    Authorization: `Bearer ${token}`,
    // Don't set Content-Type, browser will handle it with boundary
  };
}

// ---- POST /api/analyze ----
export async function analyzeIncidentImage(
  file: File,
  department: string = "field"
): Promise<SHEReport> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("department", department);

  const res = await fetch(`${SHE_API_BASE}/analyze`, {
    method: "POST",
    headers: getAuthHeadersMultipart(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Analysis failed (${res.status})`);
  }

  return res.json();
}

// ---- GET /api/reports ----
export async function fetchReports(filters?: {
  department?: string;
  risk_level?: string;
}): Promise<SHEReportsResponse> {
  const params = new URLSearchParams();
  if (filters?.department) params.set("department", filters.department);
  if (filters?.risk_level) params.set("risk_level", filters.risk_level);

  const qs = params.toString();
  const url = `${SHE_API_BASE}/reports${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to fetch reports (${res.status})`);
  }

  return res.json();
}

// ---- GET /api/reports/{id} ----
export async function fetchReportById(id: string): Promise<SHEReport> {
  const res = await fetch(`${SHE_API_BASE}/reports/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Report not found (${res.status})`);
  }

  return res.json();
}

// ---- DELETE /api/reports/{id} ----
export async function deleteReport(
  id: string
): Promise<{ message: string; id: string }> {
  const res = await fetch(`${SHE_API_BASE}/reports/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Delete failed (${res.status})`);
  }

  return res.json();
}

// ---- GET /api/departments ----
export async function fetchDepartments(): Promise<SHEDepartments> {
  const res = await fetch(`${SHE_API_BASE}/departments`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Failed to fetch departments (${res.status})`);
  }

  return res.json();
}
```

---

## Fix #2: Move Hardcoded Google Client ID

### Location: `src/App.tsx` - Line 82

### Current:
```tsx
<GoogleOAuthProvider clientId="609775986703-3mdih863emnqm8qc7utkfb3jkdoghgg4.apps.googleusercontent.com">
```

### Fix:
Replace with environment variable:

```tsx
function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!googleClientId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-center">
          <p className="font-bold">Configuration Error</p>
          <p>Google Client ID is not configured</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
```

---

## Fix #3: Remove QueryClient Duplication

### Location: `src/main.tsx`

### Current:
```tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

### Fix:
```tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./components/lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

Then update `src/App.tsx` to remove the QueryClientProvider:

```tsx
// Remove this import:
// import { QueryClientProvider } from "@tanstack/react-query";

// Remove this wrapper (keep only the GoogleOAuthProvider and TooltipProvider)
function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  
  if (!googleClientId) {
    return <div>Configuration Error: Google Client ID not found</div>;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </GoogleOAuthProvider>
  );
}
```

---

## Fix #4: Backend - Require JWT Secret

### Location: `backend/server.js` - Line 26

### Current:
```javascript
const JWT_SECRET = process.env.JWT_SECRET || "secret123";
```

### Fix:
```javascript
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error(
    "❌ FATAL: JWT_SECRET environment variable is not set.\n" +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n" +
    "Then set it in your .env file"
  );
  process.exit(1);
}
```

---

## Fix #5: Add JWT Verification to Dashboard Endpoint

### Location: `backend/server.js` 

Add this middleware before the `/api/incidents` route (if it exists):

```javascript
// Middleware to verify JWT before incident routes
app.get("/api/incidents", verifyToken, async (req, res) => {
  try {
    // Verify user exists
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Determine if user can see all incidents or only their department's
    let incidents;
    if (user.department === "Safety Department") {
      // Safety Department sees all incidents
      incidents = await Incident.find({});
    } else {
      // Other departments see only their incidents
      incidents = await Incident.find({ department: user.department });
    }

    res.json(incidents);
  } catch (error) {
    console.error("Error fetching incidents:", error);
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});
```

---

## Fix #6: Create Frontend .env File

### Create file: `.env` in project root

```
VITE_GOOGLE_CLIENT_ID=609775986703-3mdih863emnqm8qc7utkfb3jkdoghgg4.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:5001
VITE_SHE_API_BASE_URL=http://localhost:8000/api
```

### Create file: `.env.local` (for local development with secrets)

```
# Optional: Override for development
# VITE_API_BASE_URL=http://localhost:5001
```

---

## Testing the Fixes

### 1. Test Backend Startup
```bash
cd backend
npm run dev
```

Expected output:
```
✅ MongoDB connected successfully
🚀 Server running on http://localhost:5001
```

If you see JWT_SECRET error, create `.env` file first.

### 2. Test Frontend Startup
```bash
npm run dev
```

### 3. Test Authentication Flow
1. Open http://localhost:5173
2. Click Register
3. Create a new account
4. Login with the account
5. Should redirect to dashboard

### 4. Test API Calls
Open browser DevTools → Network tab and check:
- Login request should succeed
- Dashboard/Reports should load with auth header
- API responses should include data

---

## Common Issues & Solutions

### Issue: "No authentication token found"
**Cause:** User not logged in or localStorage cleared  
**Solution:** Clear browser cache and login again

### Issue: "401 Unauthorized" on API calls
**Cause:** Token not being sent or expired  
**Solution:** Check that token is in localStorage and not expired

### Issue: "CORS error"
**Cause:** Backend not allowing frontend origin  
**Solution:** Check cors() setup in backend/server.js

### Issue: MongoDB connection fails
**Cause:** Wrong MONGODB_URI or network access  
**Solution:** Check MongoDB Atlas firewall and credentials

---

## Checklist for Implementation

- [ ] Create `backend/.env` from `.env.example`
- [ ] Create `frontend/.env` from `.env.example`
- [ ] Update `src/components/lib/she-api.ts` with auth headers
- [ ] Update `src/App.tsx` to use environment variable for Google Client ID
- [ ] Update `src/main.tsx` to remove QueryClient duplication
- [ ] Update `src/App.tsx` to not have QueryClientProvider
- [ ] Update `backend/server.js` to require JWT_SECRET
- [ ] Add JWT verification to backend endpoints
- [ ] Test all auth flows
- [ ] Test API calls with DevTools

---

Estimated time: **2-3 hours** for all fixes
