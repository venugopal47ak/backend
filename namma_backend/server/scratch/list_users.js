import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/db.js';

const listUsers = async () => {
  await connectDB();
  const users = await User.find({}, 'name email role').limit(10);
  console.log('Total users:', await User.countDocuments());
  console.log('Sample users:', users);
  process.exit();
};

listUsers();
