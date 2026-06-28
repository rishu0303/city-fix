import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

// --- IMPORT ROUTES ---
import authRoutes from './routes/authRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import { startEscalationEngine } from './jobs/escalationJob.js';

// Load environment variables
dotenv.config();

// Initialize Express App
const app = express();

// --- MIDDLEWARE ---
// Enable CORS for frontend communication
app.use(cors());
// Parse incoming JSON requests
app.use(express.json());
// Parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Initialize Pinecone Client
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Initialize the index by explicitly passing the host URL
// This is critical for Serverless Pinecone indexes
export const index = pc.index(
  process.env.PINECONE_INDEX, 
  process.env.PINECONE_HOST
);

console.log("🚀 Pinecone Index initialized at:", process.env.PINECONE_HOST);

// --- DATABASE CONNECTION ---
const connectDB = async () => {
  try {
    console.log("🔄 Starting MongoDB connection...");
    mongoose.set("strictQuery", false);
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB Connected:", conn.connection.host);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:");
    console.error(error);
    process.exit(1);
  }
};

// --- LOGGING MIDDLEWARE ---
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// --- MOUNT ROUTES ---
// Home Route
app.get("/", (req, res) => {
  res.send("🚀 CityFix API is running smoothly.");
});

// Test Route for Pinecone
app.get("/api/pinecone-test", async (req,res)=>{
  try{
      const stats = await index.describeIndexStats();

      console.log(stats);

      res.json(stats);
  }
  catch(err){
      console.error(err);
      res.status(500).json(err);
  }
});

// Link the auth routes to the /api/auth path
app.use('/api/auth', authRoutes);
// Link the complaint routes to the /api/complaints path
app.use('/api/complaints', complaintRoutes);

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// --- SERVER INITIALIZATION ---
const PORT = process.env.PORT || 5000;

// Connect to DB before listening
connectDB().then(() => {
  // 🔥 START THE BACKGROUND CRON JOB
  startEscalationEngine();

  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});