import React, { createContext, useContext, useState } from 'react';
import { ApiEndpoints } from '../constants/apiEndpoints';

const ServerConfigContext = createContext(null);

export function ServerConfigProvider({ children }) {
  const [baseUrl, setBaseUrlState] = useState(ApiEndpoints.baseUrl);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const updateBaseUrl = (newUrl) => {
    ApiEndpoints.setBaseUrl(newUrl);
    setBaseUrlState(ApiEndpoints.baseUrl);
  };

  const openServerConfig = () => setIsDialogOpen(true);
  const closeServerConfig = () => setIsDialogOpen(false);

  return (
    <ServerConfigContext.Provider
      value={{
        baseUrl,
        updateBaseUrl,
        isDialogOpen,
        openServerConfig,
        closeServerConfig,
      }}
    >
      {children}
      {isDialogOpen && (
        <ServerConfigDialog
          currentUrl={baseUrl}
          onSave={(url) => {
            updateBaseUrl(url);
            closeServerConfig();
          }}
          onClose={closeServerConfig}
        />
      )}
    </ServerConfigContext.Provider>
  );
}

function ServerConfigDialog({ currentUrl, onSave, onClose }) {
  const [inputUrl, setInputUrl] = useState(currentUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-appBorder">
        <h3 className="text-lg font-bold text-darkNeutral mb-2">API Server Configuration</h3>
        <p className="text-xs text-textSecondary mb-4">
          Set the backend API URL (e.g. <code>http://localhost:8000</code> or your local LAN IP <code>http://192.168.1.x:8000</code>):
        </p>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-darkNeutral mb-1">Base URL</label>
          <input
            type="text"
            className="w-full px-3.5 py-2.5 text-sm border border-appBorder rounded-xl focus:outline-none focus:border-primary"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://localhost:8000"
          />
        </div>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-textSecondary hover:bg-surface-variant rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(inputUrl)}
            className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-sm transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

export function useServerConfig() {
  const context = useContext(ServerConfigContext);
  if (!context) {
    throw new Error('useServerConfig must be used within a ServerConfigProvider');
  }
  return context;
}
