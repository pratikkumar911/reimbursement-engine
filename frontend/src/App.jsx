import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import TravelRequestForm from './pages/TravelRequestForm';
import SettlementForm from './pages/SettlementForm';
import Approvals from './pages/Approvals';
import FinanceDashboard from './pages/FinanceDashboard';
import AdminDashboard from './pages/AdminDashboard';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'Admin') return <Navigate to="/admin" replace />;
  if (user.role === 'Finance') return <Navigate to="/finance" replace />;
  if (['Reporting Manager', 'Head of Department', 'Head of Division', 'MD'].includes(user.role)) {
    return <Navigate to="/approvals" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <div>Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/dashboard" element={<EmployeeDashboard />} />
        <Route path="/travel-requests/new" element={<TravelRequestForm />} />
        <Route path="/travel-requests/:id/edit" element={<TravelRequestForm />} />
        <Route path="/settlements/new/:travelRequestId" element={<SettlementForm />} />
        <Route path="/settlements/:id" element={<SettlementForm />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/finance" element={
          <ProtectedRoute roles={['Finance', 'Admin']}><FinanceDashboard /></ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute roles={['Admin']}><AdminDashboard /></ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}