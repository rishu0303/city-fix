import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const requiredEnv = ['MONGO_URI', 'SUPERADMIN_EMAIL', 'SUPERADMIN_PASS'];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const seedSuperAdmin = async () => {
  const email = process.env.SUPERADMIN_EMAIL.trim().toLowerCase();
  const name = process.env.SUPERADMIN_NAME?.trim() || 'Super Admin';
  const hashedPassword = await bcrypt.hash(process.env.SUPERADMIN_PASS, 10);

  await mongoose.connect(process.env.MONGO_URI);

  const superAdmin = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name,
        email,
        password: hashedPassword,
        role: 'SuperAdmin',
        isApproved: true
      },
      $unset: {
        departmentAssigned: ''
      }
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  ).select('-password');

  console.log('SuperAdmin seed completed successfully.');
  console.log({
    id: superAdmin._id.toString(),
    name: superAdmin.name,
    email: superAdmin.email,
    role: superAdmin.role,
    isApproved: superAdmin.isApproved
  });
};

seedSuperAdmin()
  .catch((error) => {
    console.error('SuperAdmin seed failed.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
