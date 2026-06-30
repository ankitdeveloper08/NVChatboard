import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider } from './context/AuthContext';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
  <AuthProvider><App /></AuthProvider>);