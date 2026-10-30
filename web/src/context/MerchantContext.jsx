import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { merchantService } from '../services/api/merchantService';
import { productService } from '../services/api/productService';
import { verificationService } from '../services/api/verificationService';
import { referenceService } from '../services/api/referenceService';

const MerchantContext = createContext(null);

export function MerchantProvider({ children }) {
  const [verifications, setVerifications] = useState([]);
  const [products, setProducts] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [selectedVerification, setSelectedVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vList, pList, wList] = await Promise.allSettled([
        merchantService.listVerifications(),
        productService.listProducts(),
        merchantService.listWorkflows(),
      ]);

      if (vList.status === 'fulfilled' && Array.isArray(vList.value)) {
        setVerifications(vList.value);
      }
      if (pList.status === 'fulfilled' && Array.isArray(pList.value)) {
        setProducts(pList.value);
      }
      if (wList.status === 'fulfilled' && Array.isArray(wList.value)) {
        setWorkflows(wList.value);
      }
    } catch (err) {
      console.error('Failed to load merchant data:', err);
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const loadInvestigation = async (id) => {
    setLoading(true);
    try {
      const detail = await merchantService.getVerificationDetail(id);
      setSelectedVerification(detail);
      return detail;
    } catch (err) {
      console.error('Failed to load investigation detail:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createVerification = async (payload) => {
    const newSession = await verificationService.createVerificationSession(payload);
    await refreshData();
    return newSession;
  };

  const holdSession = async (id, reason) => {
    await merchantService.holdVerification(id, { reason });
    await refreshData();
  };

  const resumeSession = async (id) => {
    await merchantService.resumeVerification(id);
    await refreshData();
  };

  const deleteSession = async (id) => {
    await merchantService.deleteVerification(id);
    await refreshData();
  };

  const updateDecision = async (id, decisionData) => {
    await merchantService.submitDecision(id, decisionData);
    await refreshData();
  };

  const addProduct = async (productData) => {
    const newProd = await productService.addProduct(productData);
    await refreshData();
    return newProd;
  };

  const deleteProduct = async (productId) => {
    const res = await productService.deleteProduct(productId);
    await refreshData();
    return res;
  };

  const updateProductReferences = async (productId, updates) => {
    // If uploading canonical angles
    await refreshData();
  };

  const saveWorkflow = async (payload) => {
    const saved = await merchantService.saveFullWorkflow(payload);
    await refreshData();
    return saved;
  };

  const activateWorkflow = async (id) => {
    const act = await merchantService.activateWorkflow(id);
    await refreshData();
    return act;
  };

  const generateAiWorkflow = async (claimData) => {
    return await merchantService.generateAiWorkflow(claimData);
  };

  return (
    <MerchantContext.Provider
      value={{
        verifications,
        products,
        workflows,
        selectedVerification,
        loading,
        error,
        refreshData,
        loadInvestigation,
        createVerification,
        holdSession,
        resumeSession,
        deleteSession,
        updateDecision,
        addProduct,
        deleteProduct,
        updateProductReferences,
        saveWorkflow,
        activateWorkflow,
        generateAiWorkflow,
      }}
    >
      {children}
    </MerchantContext.Provider>
  );
}

export function useMerchant() {
  const context = useContext(MerchantContext);
  if (!context) {
    throw new Error('useMerchant must be used within a MerchantProvider');
  }
  return context;
}
