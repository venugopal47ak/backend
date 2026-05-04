import User from "../models/User.js";
import Provider from "../models/Provider.js";
import Service from "../models/Service.js";
import generateToken from "../utils/generateToken.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  buildProviderLocation,
  buildServiceAreas,
  buildServiceAssignments,
  normalizeProviderCategories
} from "../utils/providerProfile.js";
import cloudinary from "../config/cloudinary.js";
import { uploadToCloudinary } from "../utils/cloudinaryHelper.js";


const sanitizeText = (value = "") => String(value).trim();
const sanitizePhone = (value = "") => String(value).replace(/\D/g, "");

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isObjectId = (value = "") => /^[0-9a-fA-F]{24}$/.test(String(value).trim());

export const register = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    phone,
    role = "USER",
    preferredLanguage = "EN",
    city,
    area,
    providerProfile
  } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  const normalizedEmail = sanitizeText(email).toLowerCase();
  const normalizedPhone = sanitizePhone(phone);
  const normalizedCity = sanitizeText(city);
  const normalizedArea = sanitizeText(area);
  const normalizedRole = role === "PROVIDER" ? "PROVIDER" : "USER";

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      res.status(409);
      throw new Error("Email is already registered");
    }



    let avatarUrl = undefined;
    let coverImageUrl = undefined;

    // Handle Cloudinary Uploads
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        const result = await uploadToCloudinary(req.files.avatar[0].buffer, "profiles");
        avatarUrl = result.secure_url;
      }
      if (req.files.coverImage && req.files.coverImage[0]) {
        const result = await uploadToCloudinary(req.files.coverImage[0].buffer, "provider_covers");
        coverImageUrl = result.secure_url;
      }
    }

    // Handle providerProfile parsing if it's sent as a string (common in multipart/form-data)
    let parsedProviderProfile = providerProfile;
    if (typeof providerProfile === "string") {
      try {
        parsedProviderProfile = JSON.parse(providerProfile);
      } catch (e) {
        console.warn("Failed to parse providerProfile string");
      }
    }

    const user = await User.create({
      name: sanitizeText(name),
      email: normalizedEmail,
      password,
      phone: normalizedPhone,
      avatar: avatarUrl || (normalizedRole === "PROVIDER" ? sanitizeText(parsedProviderProfile?.avatar) : undefined),
      coverImage: coverImageUrl || (normalizedRole === "PROVIDER" ? sanitizeText(parsedProviderProfile?.coverImage) : undefined),
      role: normalizedRole,
      preferredLanguage,
      city: normalizedCity,
      area: normalizedArea
    });


  let provider = null;

  if (normalizedRole === "PROVIDER") {
    let createdProvider = null;

    try {
      const requestedCategories = normalizeProviderCategories(
        parsedProviderProfile?.serviceCategories
      );

      if (!requestedCategories.length) {
        res.status(400);
        throw new Error("Select at least one service category to register as a provider");
      }

      const servicePatterns = requestedCategories.map(
        (service) => new RegExp(`^${escapeRegex(service)}$`, "i")
      );
      const matchedIds = requestedCategories.filter(isObjectId);

      const availableServices = await Service.find({
        $or: [
          ...(matchedIds.length > 0 ? [{ _id: { $in: matchedIds } }] : []),
          { category: { $in: servicePatterns } },
          { title: { $in: servicePatterns } }
        ]
      }).select("_id title category basePrice");

      const serviceAssignments = buildServiceAssignments(
        { serviceCategories: requestedCategories },
        availableServices
      );

      if (!serviceAssignments.services.length) {
        console.log("Services sent:", requestedCategories);

        if (process.env.SKIP_SERVICE_VALIDATION === "true") {
          console.warn(
            "SKIP_SERVICE_VALIDATION enabled: provider registration will proceed without matching service records."
          );
          serviceAssignments.serviceCategories = requestedCategories;
        } else {
          res.status(400);
          throw new Error("Selected provider services are not available right now");
        }
      }

      const whatsappNumber = sanitizePhone(parsedProviderProfile?.whatsappNumber) || normalizedPhone;
      const alternatePhone = sanitizePhone(parsedProviderProfile?.alternatePhone) || normalizedPhone;

      createdProvider = await Provider.create({
        user: user._id,
        avatar: avatarUrl || sanitizeText(parsedProviderProfile?.avatar),
        startingPrice: Number(parsedProviderProfile?.startingPrice) || 0,
        headline:
          sanitizeText(parsedProviderProfile?.headline) ||
          `Trusted ${serviceAssignments.serviceCategories[0].toLowerCase()} specialist in ${normalizedArea}`,
        bio: sanitizeText(parsedProviderProfile?.bio),
        ...serviceAssignments,
        serviceAreas: buildServiceAreas({
          city: normalizedCity,
          area: normalizedArea,
          serviceAreas: parsedProviderProfile?.serviceAreas
        }),
        city: normalizedCity,
        area: normalizedArea,
        addressText:
          sanitizeText(parsedProviderProfile?.addressText) || `${normalizedArea}, ${normalizedCity}`,
        whatsappNumber,
        alternatePhone,
        location: buildProviderLocation({
          city: normalizedCity,
          area: normalizedArea,
          location: parsedProviderProfile?.location
        }),
        coverImage: coverImageUrl || sanitizeText(parsedProviderProfile?.coverImage),
        status: "pending"
      });


      user.providerProfile = createdProvider._id;
      await user.save();
      provider = createdProvider;
    } catch (error) {
      console.error("Provider profile creation failed:", error.message);
      // We keep the user account so they can try completing their profile from the dashboard later
      throw error;
    }
  }

  const token = generateToken({ id: user._id, role: user.role });

  res.status(201).json({
    token,
    user: {
      ...user.toObject(),
      password: undefined
    },
    provider
  });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
        error
      });
    }

    const statusCode =
      res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

    return res.status(statusCode).json({
      success: false,
      message: error.message || "Registration failed",
      error: process.env.NODE_ENV === "production" ? undefined : error,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack
    });
  }
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = sanitizeText(email).toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).populate("providerProfile");

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  const token = generateToken({ id: user._id, role: user.role });

  res.json({
    token,
    user: {
      ...user.toObject(),
      password: undefined
    }
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password")
    .populate("providerProfile");

  res.json({ user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, phone, preferredLanguage, city, area } = req.body;

  if (name) user.name = sanitizeText(name);
  if (phone) user.phone = sanitizePhone(phone);
  if (preferredLanguage) user.preferredLanguage = preferredLanguage;
  if (city) user.city = sanitizeText(city);
  if (area) user.area = sanitizeText(area);

  if (req.files) {
    if (req.files.avatar && req.files.avatar[0]) {
      const result = await uploadToCloudinary(req.files.avatar[0].buffer, "profiles");
      user.avatar = result.secure_url;
    }
  }

  const updatedUser = await user.save();

  // If the user is a provider, we might want to sync some info to the Provider model if needed
  // Though usually Provider model references the User model for name/phone.
  // But avatar/city/area are duplicated in Provider for performance.
  if (user.role === "PROVIDER") {
    const provider = await Provider.findOne({ user: user._id });
    if (provider) {
      if (name) provider.name = user.name; // In case Provider has a name field
      if (user.avatar) provider.avatar = user.avatar;
      if (user.city) provider.city = user.city;
      if (user.area) provider.area = user.area;
      await provider.save();
    }
  }

  res.json({
    success: true,
    user: {
      ...updatedUser.toObject(),
      password: undefined
    }
  });
});
