import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '@heroui/react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" label="Loading..." color="primary" />
      </div>
    );
  }

 
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  
  return children;
};

export default ProtectedRoute;
