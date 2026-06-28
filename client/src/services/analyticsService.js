import { apiClient } from './apiClient.js';

export const getDashboardAnalytics = async ({ from, to, longitude, latitude, distance } = {}) => {
  const params = {};

  if (from) params.from = from;
  if (to) params.to = to;
  if (longitude !== undefined) params.longitude = longitude;
  if (latitude !== undefined) params.latitude = latitude;
  if (distance) params.distance = distance;

  const { data } = await apiClient.get('/analytics', { params });
  return data;
};
