import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ServerConfigProvider } from './context/ServerConfigContext';
import { AuthProvider } from './context/AuthContext';
import { MerchantProvider } from './context/MerchantContext';
import { CustomerFlowProvider } from './context/CustomerFlowContext';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <ServerConfigProvider>
        <AuthProvider>
          <MerchantProvider>
            <CustomerFlowProvider>
              <div className="min-h-screen bg-appBg text-darkNeutral font-sans antialiased selection:bg-primary/20 selection:text-primary">
                <AppRoutes />
              </div>
            </CustomerFlowProvider>
          </MerchantProvider>
        </AuthProvider>
      </ServerConfigProvider>
    </BrowserRouter>
  );
}
