import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js"; // Ensure Bootstrap JS is included

import {
  BrowserRouter as Router,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import Home from "./components/Home";
import OTCard from "./components/OTCard";

function OTCardWrapper() {
  const { otId } = useParams(); // Extract OT ID from URL
  return <OTCard otId={otId} />;
}

function App() {
  const isStreamer = window.location.hostname === "localhost"; // Check if running locally

  console.log("window.location.hostname:", window.location.hostname);
  console.log("isStreamer value:", isStreamer);

  return (
    <Router>
      <Routes>
        {/* Default Home Route */}
        <Route path="/" element={<Home />} />

        {/* Dynamic OT ID Route (Handles IP-based access with parameter) */}
        <Route path="/:otId" element={<OTCardWrapper />} />
      </Routes>
    </Router>
  );
}

export default App;
