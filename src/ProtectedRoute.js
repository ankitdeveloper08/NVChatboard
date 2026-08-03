import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthSessionValid } from "./utils/auth";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = isAuthSessionValid();
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
