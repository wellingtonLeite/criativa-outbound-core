import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CampaignsPage from './pages/CampaignsPage';
import CampaignBuilderPage from './pages/CampaignBuilderPage';
import IntegrationsPage from './pages/IntegrationsPage';
import CRMPage from './pages/CRMPage';
import ProspectorPage from './pages/ProspectorPage';
import LeadsPage from './pages/LeadsPage';
import DiagnosticoCore from './pages/DiagnosticoCore';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="campaigns/:id" element={<CampaignBuilderPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="prospector" element={<ProspectorPage />} />
              <Route path="integrations" element={<IntegrationsPage />} />
              <Route path="crm" element={<CRMPage />} />
              <Route path="diagnostico" element={<DiagnosticoCore />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
