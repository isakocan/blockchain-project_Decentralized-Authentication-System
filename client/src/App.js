import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify"; // EKLENDİ
import "react-toastify/dist/ReactToastify.css"; // CSS EKLENDİ

import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import AdminPanel from "./AdminPanel";

function App() {
  return (
    <BrowserRouter>
      {/* Bildirimlerin çıkacağı yer (Global) */}
      <ToastContainer position="top-right" autoClose={3000} />
      
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