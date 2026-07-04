import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/profile" replace />;
  return children;
}

export default GuestRoute;
