import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

console.log("☁️  Checking Cloudinary Config...");
console.log("   Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "✅ Found" : "❌ MISSING");
console.log("   API Key:", process.env.CLOUDINARY_API_KEY ? "✅ Found" : "❌ MISSING");
console.log("   API Secret:", process.env.CLOUDINARY_API_SECRET ? "✅ Found" : "❌ MISSING");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;