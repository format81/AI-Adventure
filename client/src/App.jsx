import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import AdminLogin from './pages/AdminLogin';
import AdminConsole from './pages/AdminConsole';
import DemoGate from './pages/DemoGate';
import DemoMode from './pages/DemoMode';
import StudentJoin from './pages/StudentJoin';
import StudentLobby from './pages/StudentLobby';
import StudentPlay from './pages/StudentPlay';

function ProtectedAdmin({ children }) {
  const { auth } = useAuth();
  if (!auth || auth.role !== 'admin') return <Navigate to="/admin" replace />;
  return children;
}

function ProtectedDemo({ children }) {
  const { auth } = useAuth();
  if (!auth || (auth.role !== 'demo' && auth.role !== 'admin')) return <Navigate to="/demo" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/console" element={<ProtectedAdmin><AdminConsole /></ProtectedAdmin>} />
      <Route path="/demo" element={<DemoGate />} />
      <Route path="/demo/play" element={<ProtectedDemo><DemoMode /></ProtectedDemo>} />
      <Route path="/play/:sessionCode" element={<StudentJoin />} />
      <Route path="/play/:sessionCode/lobby" element={<StudentLobby />} />
      <Route path="/play/:sessionCode/game" element={<StudentPlay />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
