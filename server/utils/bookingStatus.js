export const normalizedBookingStatuses = [
  "pending",
  "accepted",
  "completed",
  "rejected"
];

export const bookingLifecycleToNormalized = {
  REQUESTED: "pending",
  ACCEPTED: "accepted",
  ON_THE_WAY: "accepted",
  IN_PROGRESS: "accepted",
  COMPLETED: "completed",
  REJECTED: "rejected",
  CANCELLED: "rejected"
};

export const normalizedToBookingLifecycle = {
  pending: "REQUESTED",
  accepted: "ACCEPTED",
  completed: "COMPLETED",
  rejected: "REJECTED"
};

export const getNormalizedBookingStatus = (booking = {}) => {
  if (typeof booking === "string") {
    const normalized = String(booking).trim().toLowerCase();
    if (normalizedBookingStatuses.includes(normalized)) {
      return normalized;
    }

    return bookingLifecycleToNormalized[String(booking).trim()] || "pending";
  }

  if (normalizedBookingStatuses.includes(booking.status)) {
    return booking.status;
  }

  return bookingLifecycleToNormalized[booking.bookingStatus] || "pending";
};

export const toBookingLifecycleStatus = (value = "") => {
  const rawValue = String(value || "").trim();

  if (bookingLifecycleToNormalized[rawValue]) {
    return rawValue;
  }

  return normalizedToBookingLifecycle[rawValue.toLowerCase()] || null;
};

export const syncBookingStatusFields = (booking) => {
  const lifecycleStatus =
    toBookingLifecycleStatus(booking.bookingStatus) ||
    normalizedToBookingLifecycle[getNormalizedBookingStatus(booking)] ||
    "REQUESTED";

  booking.bookingStatus = lifecycleStatus;
  booking.status = bookingLifecycleToNormalized[lifecycleStatus] || "pending";

  return booking;
};
