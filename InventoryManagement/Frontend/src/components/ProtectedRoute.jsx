import { Navigate, useLocation } from 'react-router-dom';
import { checkAuth, getUser } from '../utils/auth';

const ProtectedRoute = ({ children, adminOnly = false }) => {
    const location = useLocation();
    const isAuthenticated = checkAuth();
    const user = getUser();

    if (!isAuthenticated) {
        return <Navigate to="/" state={{ from: location.pathname }} replace />;
    }

    // For admin routes, check privileges
    if (adminOnly && user?.privileges !== 3) {
        return <Navigate to="/home" replace />;
    }

    return children;
};

export default ProtectedRoute;
