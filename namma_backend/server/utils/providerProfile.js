const normalizeText = (value = "") => String(value).trim().toLowerCase();

export const coverageLocations = [
  { city: "Vellore", area: "Katpadi", lat: 12.9692, lng: 79.1452 },
  { city: "Vellore", area: "Sathuvachari", lat: 12.9497, lng: 79.1376 },
  { city: "Tiruvannamalai", area: "Gandhi Nagar", lat: 12.2253, lng: 79.0747 },
  { city: "Tiruvannamalai", area: "Chengam Road", lat: 12.2318, lng: 79.0589 },
  { city: "Chennai", area: "Velachery", lat: 12.9815, lng: 80.2206 },
  { city: "Chennai", area: "Anna Nagar", lat: 13.085, lng: 80.2101 },
  { city: "Ranipet", area: "Arcot", lat: 12.9052, lng: 79.318 },
  { city: "Tirupattur", area: "Tirupattur Town", lat: 12.4957, lng: 78.5671 },
  { city: "Kanchipuram", area: "Enathur", lat: 12.8342, lng: 79.7036 },
  { city: "Tiruvallur", area: "Tiruvallur Town", lat: 13.1439, lng: 79.9087 },
  { city: "Chengalpattu", area: "GST Road", lat: 12.6922, lng: 79.977 },
  { city: "Villupuram", area: "Villupuram Town", lat: 11.939, lng: 79.4861 }
];

export const serviceableCities = [...new Set(coverageLocations.map((item) => item.city))];

export const normalizeProviderCategories = (categories = []) =>
  [...new Set(categories.map((item) => String(item || "").trim()).filter(Boolean))];

export const getCoverageLocation = ({ city, area } = {}) => {
  const normalizedCity = normalizeText(city);
  const normalizedArea = normalizeText(area);

  if (normalizedCity && normalizedArea) {
    const exactMatch = coverageLocations.find(
      (item) =>
        normalizeText(item.city) === normalizedCity &&
        normalizeText(item.area) === normalizedArea
    );

    if (exactMatch) {
      return exactMatch;
    }
  }

  if (normalizedCity) {
    return (
      coverageLocations.find((item) => normalizeText(item.city) === normalizedCity) || null
    );
  }

  return coverageLocations[0] || null;
};

export const buildProviderLocation = ({ city, area, location } = {}) => {
  if (
    location?.type === "Point" &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2
  ) {
    const [lng, lat] = location.coordinates.map(Number);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        type: "Point",
        coordinates: [lng, lat]
      };
    }
  }

  if (Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng))) {
    return {
      type: "Point",
      coordinates: [Number(location.lng), Number(location.lat)]
    };
  }

  const matchedLocation = getCoverageLocation({ city, area });

  return matchedLocation
    ? {
        type: "Point",
        coordinates: [matchedLocation.lng, matchedLocation.lat]
      }
    : undefined;
};

export const buildServiceAreas = ({ city, area, serviceAreas } = {}) => {
  if (Array.isArray(serviceAreas) && serviceAreas.length) {
    return serviceAreas
      .map((item) => {
        const matchedLocation = getCoverageLocation({
          city: item.city || city,
          area: item.area || area
        });

        return {
          city: item.city || matchedLocation?.city || city,
          area: item.area || matchedLocation?.area || area,
          radiusKm:
            Number.isFinite(Number(item.radiusKm)) && Number(item.radiusKm) > 0
              ? Number(item.radiusKm)
              : matchedLocation?.city === "Chennai"
                ? 14
                : 18
        };
      })
      .filter((item) => item.city && item.area);
  }

  const sameCityLocations = coverageLocations.filter(
    (item) => normalizeText(item.city) === normalizeText(city)
  );
  const baseLocations = sameCityLocations.length
    ? sameCityLocations
    : [getCoverageLocation({ city, area })].filter(Boolean);

  return baseLocations.slice(0, 2).map((item) => ({
    city: item.city,
    area: item.area,
    radiusKm: item.city === "Chennai" ? 14 : 18
  }));
};

export const buildServiceAssignments = (profile = {}, availableServices = []) => {
  const selectedCategories = normalizeProviderCategories(profile.serviceCategories);
  const matchedServices = selectedCategories
    .map((category) =>
      availableServices.find(
        (service) => normalizeText(service.category) === normalizeText(category)
      )
    )
    .filter(Boolean);
  const matchedCategories = [...new Set(matchedServices.map((service) => service.category))];

  return {
    serviceCategories: matchedCategories,
    services: matchedServices.map((service) => service._id),
    pricingCatalog: matchedServices.map((service) => ({
      service: service._id,
      label: `${service.title} from`,
      basePrice: service.basePrice,
      maxPrice: service.basePrice + 350,
      unit: "visit",
      offerNote: "Final quote shared after inspection"
    }))
  };
};
