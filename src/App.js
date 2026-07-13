// App.js
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./Login";
import Register from "./Register";
import ProtectedRoute from "./ProtectedRoute";
import ChatBoard from "./ChatBoard";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Login Page */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* Protected Chat Page */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:chatId"
          element={
            <ProtectedRoute>
              <ChatBoard />
            </ProtectedRoute>
          }
        />

        {/* Redirect any unknown route to /login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
