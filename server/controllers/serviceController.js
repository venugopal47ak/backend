import Service from "../models/Service.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getServices = asyncHandler(async (req, res) => {
  const { category, search, featured } = req.query;
  const query = { active: true };

  if (category) {
    query.category = category;
  }

  if (featured === "true") {
    query.featured = true;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { titleTa: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } }
    ];
  }

  const services = await Service.find(query).sort({ featured: -1, createdAt: -1 });
  res.json({ services });
});

export const getFeaturedServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ active: true, featured: true }).limit(6);
  res.json({ services });
});

export const getServiceBySlug = asyncHandler(async (req, res) => {
  const service = await Service.findOne({ slug: req.params.slug, active: true });

  if (!service) {
    res.status(404);
    throw new Error("Service not found");
  }

  res.json({ service });
});

export const createService = asyncHandler(async (req, res) => {
  const service = await Service.create(req.body);
  res.status(201).json({ service });
});

export const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
    new: true
  });

  if (!service) {
    res.status(404);
    throw new Error("Service not found");
  }

  res.json({ service });
});

