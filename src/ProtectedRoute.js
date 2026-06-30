import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem("token");
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
