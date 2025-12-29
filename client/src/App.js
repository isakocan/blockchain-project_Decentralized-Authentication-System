import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom"; // Link eklendi
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import AdminPanel from "./AdminPanel";

function App() {
  return (
    <BrowserRouter>
      {/* GLOBAL LOGO (Sol Üst Köşe) */}
      <Link to="/" className="navbar-brand">
        EtherGuard
      </Link>

      <ToastContainer position="top-right" theme="dark" autoClose={3000} />
      
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;