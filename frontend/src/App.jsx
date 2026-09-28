import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import PredictPage from "./pages/PredictPage.jsx";
import ComparePage from "./pages/ComparePage.jsx";
import BatchPage from "./pages/BatchPage.jsx";
import InsightsPage from "./pages/InsightsPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import { useTheme } from "./hooks/useTheme.js";

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <Navbar theme={theme} onToggleTheme={toggleTheme} />
      <Routes>
        <Route path="/" element={<PredictPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/batch" element={<BatchPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </>
  );
}
