import 'dotenv/config';
import mongoose from 'mongoose';
import Service from '../models/Service.js';
import connectDB from '../config/db.js';

const listServices = async () => {
  await connectDB();
  const services = await Service.find({}, 'title category slug');
  console.log('Total services:', services.length);
  services.forEach(s => console.log(`[${s.category}] ${s.title} (${s.slug})`));
  process.exit();
};

listServices();
