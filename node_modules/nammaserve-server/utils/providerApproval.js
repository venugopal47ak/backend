export const PROVIDER_STATUSES = ["pending", "approved", "rejected"];

export const providerStatusOrder = {
  pending: 0,
  approved: 1,
  rejected: 2
};

export const getProviderStatus = (provider = {}) => {
  if (PROVIDER_STATUSES.includes(provider.status)) {
    return provider.status;
  }

  if (provider.approved) {
    return "approved";
  }

  if (String(provider.rejectionReason || "").trim()) {
    return "rejected";
  }

  return "pending";
};

export const isProviderApproved = (provider = {}) => getProviderStatus(provider) === "approved";

export const normalizeProviderApprovalState = (provider = {}) => {
  const status = getProviderStatus(provider);

  return {
    ...provider,
    status,
    approved: status === "approved",
    rejectionReason: String(provider.rejectionReason || "").trim(),
    isEditable: provider.isEditable !== false
  };
};

export const syncProviderApprovalFields = (provider) => {
  const status = getProviderStatus(provider);

  provider.status = status;
  provider.approved = status === "approved";

  if (provider.isEditable == null) {
    provider.isEditable = true;
  }

  if (status !== "rejected") {
    provider.rejectionReason = "";
  }

  return provider;
};
