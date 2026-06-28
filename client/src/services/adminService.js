import { apiClient } from './apiClient.js';

export const getDepartmentAdmins = async () => {
  const { data } = await apiClient.get('/auth/users/department-admins');
  return data;
};

export const updateDepartmentAdminApproval = async ({ id, isApproved }) => {
  const { data } = await apiClient.patch(`/auth/users/${id}/approve`, { isApproved });
  return data;
};
