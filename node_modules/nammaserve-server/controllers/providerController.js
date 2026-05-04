import Provider from "../models/Provider.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { buildWhatsAppLink, haversineDistanceKm } from "../utils/geo.js";
import {
  isProviderApproved,
  normalizeProviderApprovalState
} from "../utils/providerApproval.js";
import { uploadToCloudinary } from "../utils/cloudinaryHelper.js";


const populateProvider = [
  { path: "user", select: "name phone avatar preferredLanguage city area" },
  { path: "services", select: "title titleTa slug image basePrice category" }
];

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildProviderServiceQuery = async (serviceName = "") => {
  const normalizedServiceName = String(serviceName || "").trim();

  if (!normalizedServiceName) {
    return [];
  }

  const escapedServiceName = escapeRegex(normalizedServiceName);
  const serviceRegex = new RegExp(`^${escapedServiceName}$`, "i");
  const searchRegex = new RegExp(escapedServiceName, "i");

  const matchingServices = await Service.find({
    $or: [{ title: serviceRegex }, { category: serviceRegex }]
  }).select("_id category");

  const matchedIds = matchingServices.map((item) => item._id);
  const matchedCategories = matchingServices.map((item) => item.category);

  return [
    ...(matchedIds.length ? [{ services: { $in: matchedIds } }] : []),
    ...(matchedCategories.length
      ? [{ serviceCategories: { $in: matchedCategories } }]
      : []),
    { serviceCategories: { $regex: serviceRegex } },
    { headline: { $regex: searchRegex } },
    { bio: { $regex: searchRegex } }
  ];
};

const shapeProvider = (provider, lat, lng) => {
  const data = provider.toObject ? provider.toObject() : provider;
  const [providerLng, providerLat] = data.location?.coordinates || [];
  const distanceKm =
    Number.isFinite(lat) && Number.isFinite(lng) && providerLat && providerLng
      ? haversineDistanceKm(lat, lng, providerLat, providerLng)
      : null;

  return {
    ...normalizeProviderApprovalState(data),
    distanceKm,
    whatsappLink: buildWhatsAppLink({
      phone: data.whatsappNumber || data.alternatePhone || data.user?.phone,
      message: `Hi ${data.user?.name || "there"}, I found your profile on NammaServe and would like to book a service.`
    })
  };
};

export const getProviders = asyncHandler(async (req, res) => {
  const { service, city, area, available, featured, lat, lng, radius = 12 } = req.query;
  const query = { approved: true };

  if (city) {
    query.city = city;
  }

  if (area) {
    query.area = area;
  }

  if (available === "true") {
    query.availableNow = true;
  }

  if (featured === "true") {
    query.isFeatured = true;
  }

  if (service) {
    const matchingServices = await Service.find({
      $or: [
        { title: { $regex: service, $options: "i" } },
        { category: { $regex: service, $options: "i" } }
      ]
    }).select("_id category");

    query.$or = [
      { services: { $in: matchingServices.map((item) => item._id) } },
      { serviceCategories: { $in: matchingServices.map((item) => item.category) } },
      { serviceCategories: { $regex: service, $options: "i" } }
    ];
  }

  const providers = await Provider.find(query)
    .populate(populateProvider)
    .sort({ isFeatured: -1, ratingAvg: -1, jobsCompleted: -1 });

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const parsedRadius = Number(radius);
  const shaped = providers
    .map((provider) => shapeProvider(provider, parsedLat, parsedLng))
    .filter((provider) =>
      provider.distanceKm == null ? true : provider.distanceKm <= parsedRadius
    );

  res.json({ providers: shaped });
});

export const getProvidersByService = asyncHandler(async (req, res) => {
  const { serviceName } = req.params;
  const normalizedServiceName = String(serviceName || "").trim();

  if (!normalizedServiceName) {
    res.status(400);
    throw new Error("Service name is required");
  }

  const serviceQuery = await buildProviderServiceQuery(normalizedServiceName);

  const query = {
    approved: true,
    $or: serviceQuery
  };

  const providers = await Provider.find(query)
    .populate(populateProvider)
    .sort({ isFeatured: -1, ratingAvg: -1, jobsCompleted: -1 });

  const shapedProviders = providers.map((provider) => shapeProvider(provider));

  res.json({ providers: shapedProviders });
});

export const getNearbyProviders = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 8, service, city, area } = req.query;
  const serviceName = String(service || "").trim();

  const serviceQuery = serviceName
    ? await buildProviderServiceQuery(serviceName)
    : [];

  const query = {
    approved: true,
    ...(city ? { city } : {}),
    ...(area ? { area } : {}),
    ...(serviceQuery.length ? { $or: serviceQuery } : {})
  };

  const providers = await Provider.find(query)
    .populate(populateProvider)
    .sort({ availableNow: -1, responseTimeMinutes: 1, ratingAvg: -1 });

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const parsedRadius = Number(radius);
  const filtered = providers
    .map((provider) => shapeProvider(provider, parsedLat, parsedLng))
    .filter((provider) => provider.distanceKm == null || provider.distanceKm <= parsedRadius)
    .sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });

  res.json({ providers: filtered.slice(0, 8) });
});

export const getProviderById = asyncHandler(async (req, res) => {
  const provider = await Provider.findById(req.params.id).populate(populateProvider);

  if (!provider || !isProviderApproved(provider)) {
    res.status(404);
    throw new Error("Provider not found");
  }

  res.json({ provider: shapeProvider(provider) });
});

export const getMyProviderProfile = asyncHandler(async (req, res) => {
  const provider = await Provider.findOne({ user: req.user._id }).populate(populateProvider);

  if (!provider) {
    res.status(404);
    throw new Error("Provider profile not found");
  }

  res.json({ provider: shapeProvider(provider) });
});

export const upsertProviderProfile = asyncHandler(async (req, res) => {
  const existing = await Provider.findOne({ user: req.user._id });
  
  const {
    startingPrice,
    headline,
    bio,
    experienceYears,
    serviceCategories,
    city,
    area,
    addressText,
    whatsappNumber,
    alternatePhone,
    location
  } = req.body;

  let provider;

  if (existing) {
    if (startingPrice !== undefined) existing.startingPrice = startingPrice;
    if (headline !== undefined) existing.headline = headline;
    if (bio !== undefined) existing.bio = bio;
    if (experienceYears !== undefined) existing.experienceYears = experienceYears;
    if (serviceCategories !== undefined) existing.serviceCategories = serviceCategories;
    if (city !== undefined) existing.city = city;
    if (area !== undefined) existing.area = area;
    if (addressText !== undefined) existing.addressText = addressText;
    if (whatsappNumber !== undefined) existing.whatsappNumber = whatsappNumber;
    if (alternatePhone !== undefined) existing.alternatePhone = alternatePhone;
    
    if (location) {
       existing.location = {
         type: "Point",
         coordinates: [Number(location.lng), Number(location.lat)]
       };
    }

    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        const result = await uploadToCloudinary(req.files.avatar[0].buffer, "profiles");
        existing.avatar = result.secure_url;
      }
      if (req.files.coverImage && req.files.coverImage[0]) {
        const result = await uploadToCloudinary(req.files.coverImage[0].buffer, "provider_covers");
        existing.coverImage = result.secure_url;
      }
    }

    provider = await existing.save();
  } else {
    // Create new (similar to registration but usually registration handles this)
    // Here we handle it just in case a user wants to become a provider later
    provider = await Provider.create({
      ...req.body,
      user: req.user._id,
      status: "pending"
    });

    await User.findByIdAndUpdate(req.user._id, {
      providerProfile: provider._id,
      role: "PROVIDER"
    });
  }

  res.json({ 
    success: true,
    provider: normalizeProviderApprovalState(provider.toObject()) 
  });
});

