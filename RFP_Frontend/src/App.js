import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./Components/Dashboard/Dashboard";
import CreateRFP from "./Components/RFP/CreateRFP";
import Vendors from "./Components/Vendors/Vendors";
import ProposalList from "./Components/Proposal/ProposalList";
import ProposalRFP from "./Components/Proposal/ProposalRFP";
import Header from "./Header";

function App() {
  return (
    <BrowserRouter>
      <Header />

      <div
        style={{
          paddingTop: "80px",
          minHeight: "calc(100vh - 80px)",
          overflow: "hidden",
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create-rfp" element={<CreateRFP />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/proposals" element={<ProposalList />} />
          <Route path="/proposals/:rfpId" element={<ProposalRFP />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
