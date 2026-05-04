import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Provider from "../models/Provider.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import {
  buildProviderLocation,
  buildServiceAreas,
  buildServiceAssignments
} from "../utils/providerProfile.js";

const demoProviderSeeds = [
  {
    name: "Gokul Smart Electricians",
    email: "gokul.katpadi@nammaserve.in",
    phone: "919840100111",
    city: "Vellore",
    area: "Katpadi",
    provider: {
      headline: "Fast-response electrician for homes, shops, and hostels in Katpadi",
      bio: "Handles power trips, rewiring, switchboards, fans, and inverter issues across Vellore west.",
      serviceCategories: ["Electrician"],
      addressText: "Katpadi, Vellore",
      whatsappNumber: "919840100111",
      experienceYears: 9,
      responseTimeMinutes: 18,
      ratingAvg: 4.9,
      reviewCount: 142,
      jobsCompleted: 510,
      isFeatured: true,
      availableNow: true,
      coverImage:
        "https://images.unsplash.com/photo-1621905252472-e8bd5eb9f14e?auto=format&fit=crop&w=1200&q=80",
      badges: ["Verified", "Top Rated"]
    }
  },
  {
    name: "Northline Electricals",
    email: "northline.anna@nammaserve.in",
    phone: "919840100166",
    city: "Chennai",
    area: "Anna Nagar",
    provider: {
      headline: "Licensed electrician for apartments, villas, and small offices in Anna Nagar",
      bio: "Popular for DB board fixes, fan installation, lighting upgrades, and emergency visits.",
      serviceCategories: ["Electrician"],
      addressText: "Anna Nagar, Chennai",
      whatsappNumber: "919840100166",
      experienceYears: 12,
      responseTimeMinutes: 16,
      ratingAvg: 4.9,
      reviewCount: 214,
      jobsCompleted: 710,
      isFeatured: true,
      availableNow: true,
      coverImage:
        "https://images.unsplash.com/photo-1621905252472-e8bd5eb9f14e?auto=format&fit=crop&w=1200&q=80",
      badges: ["Fastest Nearby", "Verified"]
    }
  }
];

const syncUser = async ({ name, email, phone, city, area }) => {
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name,
      email,
      password: process.env.DEMO_PROVIDER_PASSWORD || "Provider@123",
      phone,
      role: "PROVIDER",
      city,
      area
    });

    return user;
  }

  user.name = name;
  user.phone = phone;
  user.role = "PROVIDER";
  user.city = city;
  user.area = area;
  await user.save();

  return user;
};

const syncProvider = async (seed, services) => {
  const user = await syncUser(seed);
  const serviceAssignments = buildServiceAssignments(
    { serviceCategories: seed.provider.serviceCategories },
    services
  );

  const providerPayload = {
    ...seed.provider,
    ...serviceAssignments,
    user: user._id,
    city: seed.city,
    area: seed.area,
    approved: true,
    status: "approved",
    serviceAreas: buildServiceAreas({
      city: seed.city,
      area: seed.area
    }),
    location: buildProviderLocation({
      city: seed.city,
      area: seed.area
    })
  };

  let provider = await Provider.findOne({ user: user._id });

  if (!provider) {
    provider = await Provider.create(providerPayload);
  } else {
    Object.assign(provider, providerPayload);
    provider = await provider.save();
  }

  if (String(user.providerProfile || "") !== String(provider._id)) {
    user.providerProfile = provider._id;
    await user.save();
  }

  return provider;
};

const initProviders = async () => {
  await connectDB();

  const services = await Service.find();

  for (const seed of demoProviderSeeds) {
    await syncProvider(seed, services);
  }

  const electricianProviders = await Provider.find({
    approved: true,
    status: "approved",
    serviceCategories: "Electrician"
  }).populate({ path: "user", select: "name email phone" });

  console.log("Demo provider initialization completed.");
  electricianProviders.forEach((provider) => {
    console.log(`- ${provider.user?.name} | ${provider.city}, ${provider.area}`);
  });
};

initProviders()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
