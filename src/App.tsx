import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/Layout/MainLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Equipment from "@/pages/Equipment";
import Calendar from "@/pages/Calendar";
import Orders from "@/pages/Orders";
import Conflicts from "@/pages/Conflicts";
import Matching from "@/pages/Matching";
import MatchResults from "@/pages/MatchResults";
import Ranking from "@/pages/Ranking";
import Dispatch from "@/pages/Dispatch";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/conflicts" element={<Conflicts />} />
          <Route path="/matching" element={<Matching />} />
          <Route path="/match-results" element={<MatchResults />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/dispatch" element={<Dispatch />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}
