import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/db.js';

const checkUser = async () => {
  await connectDB();
  const email = 'provider3@gmail.com';
  const user = await User.findOne({ email });
  if (user) {
    console.log('User found:');
    console.log({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    });
  } else {
    console.log(`User with email ${email} not found.`);
  }
  process.exit();
};

checkUser();
