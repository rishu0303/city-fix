import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { AppShell } from './components/AppShell.jsx';
import { CitizenOnlyRoute } from './components/CitizenOnlyRoute.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AdminQueue } from './pages/AdminQueue.jsx';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard.jsx';
import { ComplaintDetail } from './pages/ComplaintDetail.jsx';
import { ComplaintList } from './pages/ComplaintList.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { FileComplaint } from './pages/FileComplaint.jsx';
import { Login } from './pages/Login.jsx';
import { Register } from './pages/Register.jsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route
            path="/complaints"
            element={<ComplaintList />}
          />
          <Route
            path="/complaints/:id"
            element={<ComplaintDetail />}
          />
          <Route
            path="/file"
            element={(
              <CitizenOnlyRoute>
                <FileComplaint />
              </CitizenOnlyRoute>
            )}
          />
          <Route
            path="/map"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="/analytics"
            element={<AnalyticsDashboard />}
          />
          <Route
            path="/admin"
            element={<AdminQueue />}
          />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
