import { Routes, Route, Navigate } from 'react-router-dom';
import Auth from '../pages/Auth';
import Home from '../pages/Home';
import ForgotPassword from '../pages/ForgotPassword';
import ChangePassword from '../pages/ChangePassword';
import Register from '../pages/Register';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminDashboard from '../pages/admin/AdminDashboard';
import StockKeeperDashboard from '../pages/stockkeeper/StockKeeperDashboard';
import InventoryManagerDashboard from '../pages/inventorymanager/InventoryManagerDashboard'; // Import the inventory manager dashboard

const AppRouter = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Auth />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      {/* Admin routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* Stock Keeper routes */}
      <Route path="/stockkeeper/*" element={
        <ProtectedRoute>
          <StockKeeperDashboard />
        </ProtectedRoute>
      } />
      
      {/* Inventory Manager routes */}
      <Route path="/inventorymanager/*" element={
        <ProtectedRoute>
          <InventoryManagerDashboard />
        </ProtectedRoute>
      } />

      {/* Protected routes */}
      <Route path="/home" element={
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      } />
      <Route path="/change-password" element={
        <ProtectedRoute>
          <ChangePassword />
        </ProtectedRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRouter;
