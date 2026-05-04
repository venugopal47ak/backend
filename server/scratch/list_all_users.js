import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import connectDB from '../config/db.js';

const listUsers = async () => {
  await connectDB();
  const users = await User.find({}, 'name email role createdAt').sort({ createdAt: -1 });
  console.log('Total users:', users.length);
  users.forEach(u => console.log(`${u.createdAt.toISOString()} | ${u.role} | ${u.email} | ${u.name}`));
  process.exit();
};

listUsers();
