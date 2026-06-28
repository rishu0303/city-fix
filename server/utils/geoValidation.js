const DEFAULT_CITY_BOUNDS = {
  minLat: 12.80,
  maxLat: 13.20,
  minLng: 77.40,
  maxLng: 77.80
};

const getNumberFromEnv = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : fallback;
};

export const getCityBounds = () => {
  return {
    minLat: getNumberFromEnv('CITY_MIN_LAT', DEFAULT_CITY_BOUNDS.minLat),
    maxLat: getNumberFromEnv('CITY_MAX_LAT', DEFAULT_CITY_BOUNDS.maxLat),
    minLng: getNumberFromEnv('CITY_MIN_LNG', DEFAULT_CITY_BOUNDS.minLng),
    maxLng: getNumberFromEnv('CITY_MAX_LNG', DEFAULT_CITY_BOUNDS.maxLng)
  };
};

export const validateCoordinates = ({ longitude, latitude }) => {
  if (longitude === undefined || longitude === null || longitude === '') {
    return { error: 'Longitude is required.' };
  }

  if (latitude === undefined || latitude === null || latitude === '') {
    return { error: 'Latitude is required.' };
  }

  const parsedLongitude = Number(longitude);
  const parsedLatitude = Number(latitude);

  if (!Number.isFinite(parsedLongitude) || !Number.isFinite(parsedLatitude)) {
    return { error: 'Longitude and latitude must be valid numbers.' };
  }

  if (parsedLatitude < -90 || parsedLatitude > 90) {
    return { error: 'Latitude must be between -90 and 90.' };
  }

  if (parsedLongitude < -180 || parsedLongitude > 180) {
    return { error: 'Longitude must be between -180 and 180.' };
  }

  const cityBounds = getCityBounds();
  const isInsideCity =
    parsedLatitude >= cityBounds.minLat &&
    parsedLatitude <= cityBounds.maxLat &&
    parsedLongitude >= cityBounds.minLng &&
    parsedLongitude <= cityBounds.maxLng;

  if (!isInsideCity) {
    return {
      error: 'Location is outside the supported city boundary.',
      bounds: cityBounds
    };
  }

  return {
    longitude: parsedLongitude,
    latitude: parsedLatitude
  };
};
