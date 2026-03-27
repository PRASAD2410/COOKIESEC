import { Routes, Route } from "react-router-dom";
import Scanner from "./components/Scanner.jsx";
import Dashboard from "./components/Dashboard.jsx";




function App() {
  return (
    <Routes>
      {/* Home Page */}
      <Route path="/" element={<Scanner />} />

      {/* Dashboard Page */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Fallback Route (IMPORTANT) */}
      <Route path="*" element={<h1 style={{ color: "white" }}>404 Not Found</h1>} />
    </Routes>
  );
}

export default App;