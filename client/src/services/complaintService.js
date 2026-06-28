import { apiClient } from './apiClient.js';

export const getComplaints = async () => {
  const { data } = await apiClient.get('/complaints');
  return data;
};

export const getDepartmentComplaints = async () => {
  const { data } = await apiClient.get('/complaints/department');
  return data;
};

export const getComplaintById = async (id) => {
  const { data } = await apiClient.get(`/complaints/${id}`);
  return data;
};

export const getNearbyComplaints = async ({ longitude, latitude, distance = 5000 }) => {
  const { data } = await apiClient.get('/complaints/nearby', {
    params: { longitude, latitude, distance }
  });
  return data;
};

export const createComplaint = async ({ title, description, image, longitude, latitude, addressString }) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('longitude', longitude);
  formData.append('latitude', latitude);
  formData.append('addressString', addressString);
  formData.append('image', image);

  const { data } = await apiClient.post('/complaints', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return data;
};

export const updateComplaintStatus = async ({ id, status, adminComment, image }) => {
  const formData = new FormData();
  formData.append('status', status);

  if (adminComment) {
    formData.append('adminComment', adminComment);
  }

  if (image) {
    formData.append('image', image);
  }

  const { data } = await apiClient.patch(`/complaints/${id}/status`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return data;
};
