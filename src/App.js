// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import ProtectedRoute from "./ProtectedRoute";
import ChatBoard from "./ChatBoard";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Login Page */}
        <Route path="/login" element={<Login />} />

        {/* Protected Chat Page */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatBoard />
            </ProtectedRoute>
          }
        />

        {/* Redirect any unknown route to /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
