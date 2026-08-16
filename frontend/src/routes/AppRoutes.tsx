import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Login from '../screens/Login';
import Dashboard from '../screens/Dashboard';
import Upload from '../screens/Upload';
import Transactions from '../screens/Transactions';
import Results from '../screens/Results';
import History from '../screens/History';
import CaseManagement from '../screens/CaseManagement';
import CaseHistory from '../screens/CaseHistory';
import ControlLists from '../screens/ControlLists';
import Audit from '../screens/Audit';
import Reports from '../screens/Reports';
import Profile from '../screens/Profile';
import NotFound from '../screens/NotFound';
import PrivateRoute from './PrivateRoute';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/results" element={<Results />} />
          <Route path="/history" element={<History />} />
          <Route path="/case-management" element={<CaseManagement />} />
          <Route path="/case-history" element={<CaseHistory />} />
          <Route path="/control-lists" element={<ControlLists />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
