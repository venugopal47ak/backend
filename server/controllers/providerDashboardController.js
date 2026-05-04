import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Provider from "../models/Provider.js";
import asyncHandler from "../utils/asyncHandler.js";

const acceptanceLifecycleStatuses = [
  "ACCEPTED",
  "ON_THE_WAY",
  "IN_PROGRESS",
  "COMPLETED"
];

const completedLifecycleStatus = "COMPLETED";

const normalizedStatusExpression = {
  $ifNull: [
    "$status",
    {
      $switch: {
        branches: [
          {
            case: { $eq: ["$bookingStatus", "REQUESTED"] },
            then: "pending"
          },
          {
            case: {
              $in: ["$bookingStatus", ["ACCEPTED", "ON_THE_WAY", "IN_PROGRESS"]]
            },
            then: "accepted"
          },
          {
            case: { $eq: ["$bookingStatus", "COMPLETED"] },
            then: "completed"
          },
          {
            case: { $in: ["$bookingStatus", ["REJECTED", "CANCELLED"]] },
            then: "rejected"
          }
        ],
        default: "pending"
      }
    }
  ]
};

const ensureDashboardAccess = ({ req, provider }) => {
  if (["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
    return;
  }

  const ownsProviderProfile =
    req.user.role === "PROVIDER" &&
    String(req.user.providerProfile) === String(provider._id);

  if (!ownsProviderProfile) {
    const error = new Error("You do not have access to this provider dashboard");
    error.statusCode = 403;
    throw error;
  }
};

const calculateAverageResponseTime = (bookings, fallbackMinutes = 0) => {
  const responseDurations = bookings
    .map((booking) => {
      const acceptanceEntry = (booking.timeline || []).find((entry) =>
        acceptanceLifecycleStatuses.includes(entry.status)
      );

      if (!acceptanceEntry?.at) {
        return null;
      }

      const durationMs =
        new Date(acceptanceEntry.at).getTime() - new Date(booking.createdAt).getTime();

      if (!Number.isFinite(durationMs) || durationMs < 0) {
        return null;
      }

      return durationMs / (1000 * 60);
    })
    .filter((minutes) => minutes != null);

  if (!responseDurations.length) {
    return Math.round(Number(fallbackMinutes) || 0);
  }

  const averageMinutes =
    responseDurations.reduce((sum, minutes) => sum + minutes, 0) / responseDurations.length;

  return Math.round(averageMinutes);
};

const calculateTodaysEarnings = (bookings) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return bookings.reduce((sum, booking) => {
    const completedEntry = [...(booking.timeline || [])]
      .reverse()
      .find((entry) => entry.status === completedLifecycleStatus);

    if (!completedEntry?.at) {
      return sum;
    }

    if (new Date(completedEntry.at) < startOfToday) {
      return sum;
    }

    return sum + (booking.pricing?.totalAmount || 0);
  }, 0);
};

export const getProviderDashboardStats = asyncHandler(async (req, res) => {
  const { providerId } = req.params;
  const provider = await Provider.findById(providerId).select(
    "_id user responseTimeMinutes"
  );

  if (!provider) {
    res.status(404);
    throw new Error("Provider not found");
  }

  ensureDashboardAccess({ req, provider });

  const providerObjectId = new mongoose.Types.ObjectId(providerId);

  const [summary] = await Booking.aggregate([
    {
      $match: {
        provider: providerObjectId
      }
    },
    {
      $project: {
        normalizedStatus: normalizedStatusExpression,
        totalAmount: {
          $ifNull: ["$pricing.totalAmount", 0]
        }
      }
    },
    {
      $group: {
        _id: null,
        pendingCount: {
          $sum: {
            $cond: [{ $eq: ["$normalizedStatus", "pending"] }, 1, 0]
          }
        },
        acceptedCount: {
          $sum: {
            $cond: [{ $eq: ["$normalizedStatus", "accepted"] }, 1, 0]
          }
        },
        completedCount: {
          $sum: {
            $cond: [{ $eq: ["$normalizedStatus", "completed"] }, 1, 0]
          }
        },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ["$normalizedStatus", "completed"] }, "$totalAmount", 0]
          }
        }
      }
    }
  ]);

  const bookingsForTiming = await Booking.find({
    provider: providerId,
    $or: [
      { status: { $in: ["accepted", "completed"] } },
      {
        bookingStatus: {
          $in: acceptanceLifecycleStatuses
        }
      }
    ]
  })
    .select("createdAt timeline pricing status bookingStatus")
    .lean();

  const avgResponseTime = calculateAverageResponseTime(
    bookingsForTiming,
    provider.responseTimeMinutes
  );
  const todaysEarnings = calculateTodaysEarnings(bookingsForTiming);

  res.json({
    pendingCount: summary?.pendingCount || 0,
    acceptedCount: summary?.acceptedCount || 0,
    completedCount: summary?.completedCount || 0,
    totalRevenue: summary?.totalRevenue || 0,
    avgResponseTime,
    todaysEarnings
  });
});
