import Provider from "../models/Provider.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  getProviderStatus,
  normalizeProviderApprovalState,
  providerStatusOrder
} from "../utils/providerApproval.js";

const populateAdminProvider = [
  { path: "user", select: "name email phone avatar preferredLanguage city area" },
  { path: "services", select: "title category basePrice" }
];

const allowedStatusTransitions = {
  pending: ["approved", "rejected"],
  approved: ["pending", "rejected"],
  rejected: ["approved", "pending"]
};

const sanitizeText = (value = "") => String(value).trim();
const getProviderIdFromParams = (req) => req.params.id || req.params.providerId;

const formatProvider = (provider) =>
  normalizeProviderApprovalState(provider.toObject ? provider.toObject() : provider);

const getProviderOrThrow = async (providerId) => {
  const provider = await Provider.findById(providerId).populate(populateAdminProvider);

  if (!provider) {
    const error = new Error("Provider not found");
    error.statusCode = 404;
    throw error;
  }

  return provider;
};

const applyStatusTransition = async ({
  provider,
  nextStatus,
  actorId,
  rejectionReason = ""
}) => {
  const currentStatus = getProviderStatus(provider);

  if (currentStatus === nextStatus) {
    const duplicateStatusMessages = {
      pending: "Provider approval is already removed",
      approved: "Provider is already approved",
      rejected: "Provider is already rejected"
    };
    const error = new Error(duplicateStatusMessages[nextStatus] || "Provider already has this status");
    error.statusCode = 409;
    throw error;
  }

  if (!allowedStatusTransitions[currentStatus]?.includes(nextStatus)) {
    const error = new Error(
      `Cannot change provider status from ${currentStatus} to ${nextStatus}`
    );
    error.statusCode = 400;
    throw error;
  }

  provider.status = nextStatus;
  provider.isEditable = true;

  if (nextStatus === "pending") {
    provider.approvedBy = undefined;
    provider.approvedAt = undefined;
    provider.rejectedBy = undefined;
    provider.rejectedAt = undefined;
  }

  if (nextStatus === "approved") {
    provider.approvedBy = actorId;
    provider.approvedAt = new Date();
    provider.rejectedBy = undefined;
    provider.rejectedAt = undefined;
  }

  if (nextStatus === "rejected") {
    const trimmedReason = sanitizeText(rejectionReason);

    if (!trimmedReason) {
      const error = new Error("Reason for rejection is required");
      error.statusCode = 400;
      throw error;
    }

    provider.rejectionReason = trimmedReason;
    provider.rejectedBy = actorId;
    provider.rejectedAt = new Date();
  }

  await provider.save();
  await provider.populate(populateAdminProvider);

  return provider;
};

export const getProvidersAdmin = asyncHandler(async (req, res) => {
  const providers = await Provider.find()
    .populate(populateAdminProvider)
    .sort({ createdAt: -1 });

  const sortedProviders = providers
    .map((provider) => formatProvider(provider))
    .sort((left, right) => {
      const statusDelta =
        providerStatusOrder[left.status] - providerStatusOrder[right.status];

      if (statusDelta !== 0) {
        return statusDelta;
      }

      return new Date(right.createdAt) - new Date(left.createdAt);
    });

  res.json({ providers: sortedProviders });
});

export const getProviderAdminDetails = asyncHandler(async (req, res) => {
  const provider = await getProviderOrThrow(getProviderIdFromParams(req));
  res.json({ provider: formatProvider(provider) });
});

export const approveProvider = asyncHandler(async (req, res) => {
  const provider = await Provider.findById(getProviderIdFromParams(req));

  if (!provider) {
    res.status(404);
    throw new Error("Provider not found");
  }

  const updatedProvider = await applyStatusTransition({
    provider,
    nextStatus: "approved",
    actorId: req.user._id
  });

  res.json({ provider: formatProvider(updatedProvider) });
});

export const rejectProvider = asyncHandler(async (req, res) => {
  const provider = await Provider.findById(getProviderIdFromParams(req));

  if (!provider) {
    res.status(404);
    throw new Error("Provider not found");
  }

  const updatedProvider = await applyStatusTransition({
    provider,
    nextStatus: "rejected",
    actorId: req.user._id,
    rejectionReason: req.body.rejectionReason
  });

  res.json({ provider: formatProvider(updatedProvider) });
});

export const removeProviderApproval = asyncHandler(async (req, res) => {
  const provider = await Provider.findById(getProviderIdFromParams(req));

  if (!provider) {
    res.status(404);
    throw new Error("Provider not found");
  }

  const updatedProvider = await applyStatusTransition({
    provider,
    nextStatus: "pending",
    actorId: req.user._id
  });

  res.json({ provider: formatProvider(updatedProvider) });
});
