// Landing.jsx — Legacy entry point, consolidated into Home.jsx (FinHome V3)
// This file is kept to avoid breaking any direct imports during migration.
import { Navigate } from 'react-router-dom';
export default function Landing() {
  return <Navigate to="/" replace />;
}
