import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import HistoryPage from "./pages/HistoryPage";
import DashboardPage from "./pages/DashboardPage";
import BulkAnalysisPage from "./pages/BulkAnalysisPage";
import UrlAnalysisPage from "./pages/UrlAnalysisPage";

function App() {
  return (
    <div className="App min-h-screen bg-white">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/url-analysis" element={<UrlAnalysisPage />} />
            <Route path="/bulk" element={<BulkAnalysisPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
