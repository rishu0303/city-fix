import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export const CitizenOnlyRoute = ({ children }) => {
  const { user } = useAuth();

  if (user?.role !== 'Citizen') {
    return <Navigate to="/admin" replace />;
  }

  return children;
};
