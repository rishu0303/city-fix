CityFix: Project Architecture & Implementation Summary

1. High-Level Overview

CityFix is a modern, AI-powered civic operations platform designed to streamline how citizens report municipal issues (potholes, water leaks, etc.) and how city workers resolve them.

Instead of relying on manual sorting, CityFix leverages Google Gemini AI to automatically categorize and prioritize complaints, and Pinecone Vector Database to semantically detect and merge duplicate reports.

Tech Stack:

Backend: Node.js, Express.js

Database: MongoDB (Atlas) with Mongoose

Vector DB: Pinecone

AI Engine: Google Gemini (1.5 Flash & text-embedding-004)

Storage: Cloudinary (via Multer memory streams)

Frontend: React (Vite), Tailwind CSS, React-Map-GL (Mapbox)

2. Core Modules & Functionalities

A. Role-Based Access Control (RBAC)

The system is built on a strict hierarchical security model.

Citizens (Default): Can report issues and view geographically relevant feeds.

Department Admins: Specialized workers (e.g., "Water", "Roads"). They must be explicitly approved by a SuperAdmin before they can log in. They are strictly locked to their department's data.

SuperAdmins: Global overseers who manage the city health, approve staff, and view system-wide analytics.

Implementation: Controlled via authMiddleware.js using JWTs. The middleware actively intercepts requests, validates the token, and checks the user's role and isApproved status before allowing route access.

B. The AI Complaint Engine (The Core Flow)

When a citizen submits a complaint via POST /api/complaints, a highly optimized, parallelized workflow takes over:

Validation: geoValidation.js ensures the GPS coordinates fall strictly within the city's bounding box (preventing spam from other cities).

Parallel Execution: To ensure the API responds instantly, Promise.all() is used to run three heavy tasks at the exact same time:

Cloudinary Upload: The image buffer is streamed directly to Cloudinary.

Gemini Vision Analysis: The image and user text are sent to Gemini. It returns a structured JSON predicting the category (e.g., "Roads") and a severityRating (1-5).

Pinecone Vector Search: The text is embedded and searched against Pinecone.

Smart Deduplication: If Pinecone finds a semantic match > 85%, the backend rejects the new complaint and instead adds an upvote to the existing one.

Database Storage: The processed data is stored in MongoDB as a GeoJSON Point, and the vector is upserted into Pinecone for future duplicate matching.

C. Geospatial Queries & Feeds

The database schema utilizes MongoDB's 2dsphere indexing.

Implementation: The getNearbyComplaints controller uses the $near operator to draw a circle (e.g., 5km radius) around the citizen's GPS coordinates, returning only relevant local issues sorted by priority.

D. Dynamic Analytics Dashboard

Instead of hitting the database with multiple queries to build charts, the application uses a highly advanced MongoDB Aggregation Pipeline.

Implementation: The analyticsController.js uses the $facet operator. In a single database read, it calculates the total count, status breakdown (for pie charts), category breakdown (for bar charts), severity spread, and a 7-day trend.

Dynamic Scoping: The controller looks at req.user.role. It applies a $geoNear filter for citizens, a $match filter for Department Admins (locking them to their department), and no filter for SuperAdmins.

E. Priority Escalation Engine (Automated Cron Job)

To ensure city workers don't ignore issues, a background task runs automatically.

Implementation: escalationJob.js uses node-cron. Every hour, it fetches unresolved complaints.

Algorithm: It calculates a dynamic priorityScore using the formula: (Upvotes * 2) + (Severity * 5) + Hours Pending. If SLAs are breached, it flags the issue as isEscalated: true, visually alerting admins on the frontend.

3. Frontend Implementation (React UI)

The frontend is built as a Single Page Application (SPA) focusing on a "Civic Green" professional aesthetic, avoiding flashy generic UI in favor of operational efficiency.

Key Frontend Features:

API Client & Interceptors: A custom Axios instance (apiClient.js) automatically attaches the JWT to every outgoing request and handles global 401 (Unauthorized) redirects.

Role-Aware Routing: The AppShell and Sidebar dynamically re-render based on the AuthContext. Admins see "Action Queues" and "Analytics", while Citizens see "Radar Maps" and "Local Feeds".

Multi-Step Complaint Modal: A smooth UX guiding citizens through Uploading a Photo -> Picking a Map Location -> Adding Descriptions.

AI Auto-Drafting: An integration on the frontend allowing citizens to type shorthand notes and click an "Auto-Draft" button, which calls Gemini to rewrite it into a formal civic request.

Admin Action Queue: A dedicated interface for city workers to view issues sorted by the backend's priorityScore, allowing them to update statuses (e.g., to "Resolved") and add timeline audit notes.

4. Security & Best Practices Implemented

No Local File Storage: Multer memoryStorage is used, piping buffers straight to Cloudinary, ensuring the Node server's disk doesn't fill up.

Secure Initialization: The seedDatabase.js script allows secure creation of the initial SuperAdmin using .env variables, preventing hackers from exploiting the public registration route.

Cache Headers: The analytics endpoint uses Cache-Control: private, max-age=30 to prevent users from spam-refreshing the dashboard and crashing the database with heavy $facet aggregations.

Zero-Filled Buckets: The analytics pipeline guarantees that all statuses (Open, Resolved, etc.) are returned even if their count is 0, ensuring frontend chart libraries never crash.
