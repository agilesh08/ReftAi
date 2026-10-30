import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

// Gateway & Auth
import { GatewayPage } from '../pages/gateway/GatewayPage';
import { LoginPage } from '../pages/auth/LoginPage';

// Merchant Pages
import { DashboardPage } from '../pages/merchant/DashboardPage';
import { CreateVerificationPage } from '../pages/merchant/CreateVerificationPage';
import { VerificationCreatedPage } from '../pages/merchant/VerificationCreatedPage';
import { InvestigationPage } from '../pages/merchant/InvestigationPage';
import { CustomerResponsePage } from '../pages/merchant/CustomerResponsePage';
import { ReportPage } from '../pages/merchant/ReportPage';
import { TimelinePage } from '../pages/merchant/TimelinePage';
import { WorkflowBuilderPage } from '../pages/merchant/WorkflowBuilderPage';

// Merchant Settings
import { MerchantSettingsPage } from '../pages/merchant/settings/MerchantSettingsPage';
import { ProductListPage } from '../pages/merchant/settings/ProductListPage';
import { ProductReferenceEvidencePage } from '../pages/merchant/settings/ProductReferenceEvidencePage';

// Customer Flow Pages (No Auth Required)
import { SessionOverviewPage } from '../pages/customer/SessionOverviewPage';
import { WorkflowRunnerPage } from '../pages/customer/WorkflowRunnerPage';
import { ReviewingPage } from '../pages/customer/ReviewingPage';
import { CustomerCompletionPage } from '../pages/customer/CustomerCompletionPage';
import { InvalidTokenPage } from '../pages/customer/InvalidTokenPage';

export function AppRoutes() {
  return (
    <Routes>
      {/* Gateway & Authentication */}
      <Route path="/" element={<GatewayPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Merchant Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <ErrorBoundary fallbackTitle="Dashboard Error">
              <DashboardPage />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-verification"
        element={
          <ProtectedRoute>
            <ErrorBoundary fallbackTitle="Unable to Load Verification Session Creator">
              <CreateVerificationPage />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/verification-created"
        element={
          <ProtectedRoute>
            <ErrorBoundary fallbackTitle="Unable to Load Session Confirmation">
              <VerificationCreatedPage />
            </ErrorBoundary>
          </ProtectedRoute>
        }
      />
      <Route
        path="/investigation/:id"
        element={
          <ProtectedRoute>
            <InvestigationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/investigation/:id/customer-response"
        element={
          <ProtectedRoute>
            <CustomerResponsePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/report/:id"
        element={
          <ProtectedRoute>
            <ReportPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timeline/:id"
        element={
          <ProtectedRoute>
            <TimelinePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workflows"
        element={
          <ProtectedRoute>
            <WorkflowBuilderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <MerchantSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/products"
        element={
          <ProtectedRoute>
            <ProductListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/products/:id/references"
        element={
          <ProtectedRoute>
            <ProductReferenceEvidencePage />
          </ProtectedRoute>
        }
      />

      {/* Customer Verification Routes (Public / Direct Token Access) */}
      <Route path="/verify/:token" element={<SessionOverviewPage />} />
      <Route path="/verify/:token/workflow" element={<WorkflowRunnerPage />} />
      <Route path="/verify/:token/reviewing" element={<ReviewingPage />} />
      <Route path="/verify/:token/completed" element={<CustomerCompletionPage />} />
      <Route path="/verify/:token/invalid" element={<InvalidTokenPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
