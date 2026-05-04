import mongoose from "mongoose";
import Service from "../models/Service.js";

const defaultServiceSeeds = [
  {
    title: "Electrician Visit",
    slug: "electrician-visit",
    category: "Electrician",
    description: "Switchboard, wiring, fan, and urgent power fault fixes.",
    basePrice: 249,
    featured: true,
    active: true,
    icon: "Zap"
  },
  {
    title: "Plumber Repair",
    slug: "plumber-repair",
    category: "Plumber",
    description: "Leak repair, taps, pipelines, bathroom fittings, and motors.",
    basePrice: 299,
    featured: true,
    active: true,
    icon: "Wrench"
  },
  {
    title: "Bike & Car Mechanic",
    slug: "bike-car-mechanic",
    category: "Mechanic",
    description: "Battery jump start, puncture help, doorstep diagnostics.",
    basePrice: 399,
    featured: true,
    active: true,
    icon: "CarFront"
  },
  {
    title: "AC Service",
    slug: "ac-service",
    category: "AC Repair",
    description: "Cooling issues, gas check, wash, and seasonal maintenance.",
    basePrice: 599,
    featured: true,
    active: true,
    icon: "Wind"
  },
  {
    title: "Deep Home Cleaning",
    slug: "deep-home-cleaning",
    category: "Cleaning",
    description: "Kitchen, sofa, bathroom, and move-in deep cleaning.",
    basePrice: 799,
    featured: true,
    active: true,
    icon: "Sparkles"
  }
];

const seedDefaultServices = async () => {
  const count = await Service.countDocuments();

  if (count === 0) {
    await Service.insertMany(defaultServiceSeeds);
    console.log("Default services seeded into database.");
  }
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${connection.connection.host}`);
    await seedDefaultServices();
    return connection;
  } catch (error) {
    console.error("MongoDB connection failed", error.message);
    process.exit(1);
  }
};

export default connectDB;

