export const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(a));
};

export const buildWhatsAppLink = ({ phone, message }) => {
  const normalizedPhone = String(phone || "").replace(/[^\d]/g, "");
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

