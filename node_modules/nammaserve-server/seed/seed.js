import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import PlatformSetting from "../models/PlatformSetting.js";
import Provider from "../models/Provider.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import AdminProfile from "../models/AdminProfile.js";
import {
  buildProviderLocation,
  buildServiceAreas,
  buildServiceAssignments,
  serviceableCities
} from "../utils/providerProfile.js";

const serviceSeeds = [
  {
    title: "Electrician Visit",
    titleTa: "à®®à®¿à®©à¯à®šà®¾à®° à®šà¯‡à®µà¯ˆ",
    slug: "electrician-visit",
    category: "Electrician",
    description: "Switchboard, wiring, fan, and urgent power fault fixes.",
    image: "/images/services/electrician.png",
    icon: "Zap",
    basePrice: 249,
    featured: true,
    tags: ["Fast response", "Home safety"]
  },
  {
    title: "Plumber Repair",
    titleTa: "à®•à¯à®´à®¾à®¯à¯ à®ªà®´à¯à®¤à¯ à®šà®°à®¿à®šà¯†à®¯à¯à®¤à®²à¯",
    slug: "plumber-repair",
    category: "Plumber",
    description: "Leak repair, taps, pipelines, bathroom fittings, and motors.",
    image: "/images/services/plumber.png",
    icon: "Wrench",
    basePrice: 299,
    featured: true,
    tags: ["No hidden charges", "Local experts"]
  },
  {
    title: "Bike & Car Mechanic",
    titleTa: "à®µà®¾à®•à®© à®®à¯†à®•à¯à®•à®¾à®©à®¿à®•à¯",
    slug: "bike-car-mechanic",
    category: "Mechanic",
    description: "Battery jump start, puncture help, doorstep diagnostics.",
    image: "/images/services/mechanic.png",
    icon: "CarFront",
    basePrice: 399,
    featured: true,
    tags: ["Doorstep help", "Live updates"]
  },
  {
    title: "AC Service",
    titleTa: "à®à®šà®¿ à®šà¯‡à®µà¯ˆ",
    slug: "ac-service",
    category: "AC Repair",
    description: "Cooling issues, gas check, wash, and seasonal maintenance.",
    image: "/images/services/ac-repair.png",
    icon: "Wind",
    basePrice: 599,
    featured: true,
    tags: ["Same-day slots"]
  },
  {
    title: "Appliance Repair",
    titleTa: "à®®à®¿à®©à¯ à®šà®¾à®¤à®© à®ªà®´à¯à®¤à¯",
    slug: "appliance-repair",
    category: "Appliance Repair",
    description: "Washing machine, fridge, microwave, and mixer service.",
    image: "/images/services/appliance.png",
    icon: "Settings2",
    basePrice: 349,
    featured: false,
    tags: ["Skilled technicians"]
  },
  {
    title: "Deep Home Cleaning",
    titleTa: "à®µà¯€à®Ÿà¯à®Ÿà¯ à®šà¯à®¤à¯à®¤à®®à¯",
    slug: "deep-home-cleaning",
    category: "Cleaning",
    description: "Kitchen, sofa, bathroom, and move-in deep cleaning.",
    image: "/images/services/cleaning.png",
    icon: "Sparkles",
    basePrice: 799,
    featured: false,
    tags: ["Affordable packages"]
  }
];

const providerSeeds = [
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
      coverImage: "/images/services/electrician.png",
      badges: ["Verified", "Top Rated"]
    }
  },
  {
    name: "Comfort AC & Appliance Care",
    email: "comfort.vellore@nammaserve.in",
    phone: "919840100122",
    city: "Vellore",
    area: "Sathuvachari",
    provider: {
      headline: "AC service and appliance repair with same-day slots in Vellore",
      bio: "Covers split AC service, washing machine issues, fridge cooling checks, and annual maintenance.",
      serviceCategories: ["AC Repair", "Appliance Repair"],
      addressText: "Sathuvachari, Vellore",
      whatsappNumber: "919840100122",
      experienceYears: 7,
      responseTimeMinutes: 24,
      ratingAvg: 4.8,
      reviewCount: 119,
      jobsCompleted: 390,
      isFeatured: true,
      coverImage: "/images/services/ac-repair.png",
      badges: ["Seasonal Expert", "Multi-brand"]
    }
  },
  {
    name: "Arunachala Plumbing Co.",
    email: "arunachala.plumbing@nammaserve.in",
    phone: "919840100133",
    city: "Tiruvannamalai",
    area: "Gandhi Nagar",
    provider: {
      headline: "Leak repair, motor fitting, and bathroom work across Tiruvannamalai town",
      bio: "Trusted for overhead tank lines, bore motor support, and fast leak isolation.",
      serviceCategories: ["Plumber"],
      addressText: "Gandhi Nagar, Tiruvannamalai",
      whatsappNumber: "919840100133",
      experienceYears: 10,
      responseTimeMinutes: 20,
      ratingAvg: 4.9,
      reviewCount: 133,
      jobsCompleted: 470,
      isFeatured: true,
      coverImage: "/images/services/plumber.png",
      badges: ["Verified", "Low Revisit"]
    }
  },
  {
    name: "Deepam Clean Team",
    email: "deepam.clean@nammaserve.in",
    phone: "919840100144",
    city: "Tiruvannamalai",
    area: "Chengam Road",
    provider: {
      headline: "Apartment move-in and deep cleaning crew near Chengam Road",
      bio: "Handles kitchen degreasing, bathroom cleaning, sofa wash, and post-function cleanup.",
      serviceCategories: ["Cleaning"],
      addressText: "Chengam Road, Tiruvannamalai",
      whatsappNumber: "919840100144",
      experienceYears: 5,
      responseTimeMinutes: 35,
      ratingAvg: 4.7,
      reviewCount: 88,
      jobsCompleted: 260,
      coverImage: "/images/services/cleaning.png",
      badges: ["Move-in Favorite"]
    }
  },
  {
    name: "Metro Appliance Clinic",
    email: "metro.velachery@nammaserve.in",
    phone: "919840100155",
    city: "Chennai",
    area: "Velachery",
    provider: {
      headline: "Fridge, washing machine, and microwave repair across south Chennai",
      bio: "Best for quick diagnosis, spare-part guidance, and apartment-friendly visit slots.",
      serviceCategories: ["Appliance Repair"],
      addressText: "Velachery, Chennai",
      whatsappNumber: "919840100155",
      experienceYears: 8,
      responseTimeMinutes: 19,
      ratingAvg: 4.8,
      reviewCount: 176,
      jobsCompleted: 560,
      isFeatured: true,
      coverImage: "/images/services/appliance.png",
      badges: ["High Repeat Rate"]
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
      coverImage: "/images/services/electrician.png",
      badges: ["Fastest Nearby", "Verified"]
    }
  },
  {
    name: "Arcot Motor Assist",
    email: "arcot.motor@nammaserve.in",
    phone: "919840100177",
    city: "Ranipet",
    area: "Arcot",
    provider: {
      headline: "Doorstep bike and car mechanic for Arcot and Ranipet belt",
      bio: "Covers punctures, battery issues, jump starts, and quick roadside troubleshooting.",
      serviceCategories: ["Mechanic"],
      addressText: "Arcot, Ranipet",
      whatsappNumber: "919840100177",
      availableNow: false,
      experienceYears: 6,
      responseTimeMinutes: 28,
      ratingAvg: 4.7,
      reviewCount: 91,
      jobsCompleted: 315,
      coverImage: "/images/services/mechanic.png",
      badges: ["Roadside Specialist"]
    }
  },
  {
    name: "Tirupattur Power & Pump Works",
    email: "tirupattur.power@nammaserve.in",
    phone: "919840100188",
    city: "Tirupattur",
    area: "Tirupattur Town",
    provider: {
      headline: "Electrician and plumber combo team for homes and stores",
      bio: "Ideal for mixed repair visits involving wiring, motors, taps, and water line checks.",
      serviceCategories: ["Electrician", "Plumber"],
      addressText: "Tirupattur Town",
      whatsappNumber: "919840100188",
      experienceYears: 9,
      responseTimeMinutes: 26,
      ratingAvg: 4.8,
      reviewCount: 104,
      jobsCompleted: 360,
      coverImage: "/images/services/plumber.png",
      badges: ["Combo Visit"]
    }
  },
  {
    name: "Kanchi Comfort Services",
    email: "kanchi.comfort@nammaserve.in",
    phone: "919840100199",
    city: "Kanchipuram",
    area: "Enathur",
    provider: {
      headline: "AC cleaning and cooling checks for homes, hostels, and shops",
      bio: "Strong on preventive maintenance, cooling complaints, and seasonal service plans.",
      serviceCategories: ["AC Repair"],
      addressText: "Enathur, Kanchipuram",
      whatsappNumber: "919840100199",
      experienceYears: 7,
      responseTimeMinutes: 27,
      ratingAvg: 4.8,
      reviewCount: 96,
      jobsCompleted: 308,
      coverImage: "/images/services/ac-repair.png",
      badges: ["Summer Ready"]
    }
  },
  {
    name: "Tiruvallur Water Works",
    email: "tiruvallur.water@nammaserve.in",
    phone: "919840100211",
    city: "Tiruvallur",
    area: "Tiruvallur Town",
    provider: {
      headline: "Plumbing support for homes, bore motors, and tank lines in Tiruvallur",
      bio: "Handles bathroom fittings, overhead tanks, and motor line repair with transparent quotes.",
      serviceCategories: ["Plumber"],
      addressText: "Tiruvallur Town",
      whatsappNumber: "919840100211",
      experienceYears: 8,
      responseTimeMinutes: 25,
      ratingAvg: 4.8,
      reviewCount: 112,
      jobsCompleted: 378,
      coverImage: "/images/services/plumber.png",
      badges: ["Tank Specialist"]
    }
  },
  {
    name: "GST Road Auto Rescue",
    email: "gstroad.auto@nammaserve.in",
    phone: "919840100222",
    city: "Chengalpattu",
    area: "GST Road",
    provider: {
      headline: "Roadside mechanic for Chengalpattu, Maraimalai Nagar, and NH stretches",
      bio: "Known for battery rescue, tyre puncture support, and quick roadside inspections.",
      serviceCategories: ["Mechanic"],
      addressText: "GST Road, Chengalpattu",
      whatsappNumber: "919840100222",
      availableNow: false,
      experienceYears: 5,
      responseTimeMinutes: 30,
      ratingAvg: 4.7,
      reviewCount: 84,
      jobsCompleted: 242,
      coverImage: "/images/services/mechanic.png",
      badges: ["Roadside Rescue"]
    }
  },
  {
    name: "Villupuram Deep Clean Crew",
    email: "villupuram.clean@nammaserve.in",
    phone: "919840100233",
    city: "Villupuram",
    area: "Villupuram Town",
    provider: {
      headline: "Home and office deep cleaning for weekly, move-in, and festive needs",
      bio: "Trusted for kitchen deep cleans, bathroom sanitization, and fast one-day packages.",
      serviceCategories: ["Cleaning"],
      addressText: "Villupuram Town",
      whatsappNumber: "919840100233",
      experienceYears: 6,
      responseTimeMinutes: 34,
      ratingAvg: 4.8,
      reviewCount: 94,
      jobsCompleted: 287,
      coverImage: "/images/services/cleaning.png",
      badges: ["Festival Ready"]
    }
  }
];

const seed = async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();

  const createdServices = await Service.insertMany(serviceSeeds);

  for (const providerSeed of providerSeeds) {
    const user = await User.create({
      name: providerSeed.name,
      email: providerSeed.email,
      password: "Provider@123",
      phone: providerSeed.phone,
      role: "PROVIDER",
      city: providerSeed.city,
      area: providerSeed.area
    });

    const serviceAssignments = buildServiceAssignments(
      { serviceCategories: providerSeed.provider.serviceCategories },
      createdServices
    );

    const provider = await Provider.create({
      ...providerSeed.provider,
      ...serviceAssignments,
      user: user._id,
      city: providerSeed.city,
      area: providerSeed.area,
      serviceAreas: buildServiceAreas({
        city: providerSeed.city,
        area: providerSeed.area
      }),
      location: buildProviderLocation({
        city: providerSeed.city,
        area: providerSeed.area
      }),
      approved: true,
      status: "approved"
    });

    user.providerProfile = provider._id;
    await user.save();
  }

  const superAdmin = await User.create({
    name: "Founder Console",
    email: process.env.SEED_SUPER_ADMIN_EMAIL || "founder@nammaserve.in",
    password: process.env.SEED_SUPER_ADMIN_PASSWORD || "Admin@123",
    phone: "919999999999",
    role: "SUPER_ADMIN",
    city: "Vellore",
    area: "Katpadi"
  });

  await AdminProfile.create({
    user: superAdmin._id,
    scope: "PLATFORM",
    permissions: ["all"]
  });

  await PlatformSetting.create({
    singleton: "default",
    supportPhone: "+91 90000 90000",
    supportEmail: "support@nammaserve.in",
    serviceableCities
  });

  console.log("Seed completed");
  process.exit(0);
};

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
