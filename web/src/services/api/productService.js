import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';
import { referenceService } from './referenceService';
import { initialProducts } from '../mockData/initialProducts';

export const productService = {
  async listProducts() {
    try {
      const response = await apiClient.get(ApiEndpoints.products);
      if (Array.isArray(response.data)) {
        return response.data.map(normalizeProduct);
      }
    } catch (err) {
      console.warn('API listProducts fallback to local mock:', err.message);
    }
    return initialProducts.map(normalizeProduct);
  },

  async getProduct(productId) {
    const response = await apiClient.get(ApiEndpoints.productDetail(productId));
    return normalizeProduct(response.data);
  },

  async getProductCompleteness(productId) {
    try {
      const response = await apiClient.get(ApiEndpoints.productCompleteness(productId));
      return response.data;
    } catch (err) {
      console.warn('API getProductCompleteness fallback:', err.message);
      return {
        product_id: productId,
        reference_count: 4,
        is_ready: true,
        missing_angles: [],
      };
    }
  },

  async addProduct(productData) {
    const payload = {
      name: productData.name.trim(),
      sku: productData.sku.trim(),
      description: productData.description?.trim() || null,
      price: parseFloat(productData.price) || 0.0,
    };

    try {
      const response = await apiClient.post(ApiEndpoints.products, payload);
      return normalizeProduct(response.data);
    } catch (err) {
      console.warn('API addProduct fallback:', err.message);
      const mock = {
        id: `prod-${Date.now()}`,
        name: payload.name,
        sku: payload.sku,
        description: payload.description,
        price: payload.price,
        reference_count: 0,
        is_ready: false,
        reference_processing_status: 'NOT_READY',
      };
      return normalizeProduct(mock);
    }
  },

  async updateProduct(productId, productData) {
    const payload = {
      name: productData.name.trim(),
      sku: productData.sku.trim(),
      description: productData.description?.trim() || null,
      price: parseFloat(productData.price) || 0.0,
    };
    const response = await apiClient.put(ApiEndpoints.productDetail(productId), payload);
    return normalizeProduct(response.data);
  },

  async deleteProduct(productId) {
    const response = await apiClient.delete(ApiEndpoints.productDetail(productId));
    return response.data;
  },

  // Delegate reference methods to referenceService
  listReferences: referenceService.listReferences,
  uploadReference: referenceService.uploadReference,
  deleteReference: referenceService.deleteReference,
  getReferenceFileUrl: referenceService.getReferenceFileUrl,
};

function normalizeProduct(p) {
  const refCount = Number(
    p.reference_count ??
    p.reference_angles_count ??
    p.referenceAnglesCount ??
    (Array.isArray(p.references) ? p.references.length : 0)
  );

  const rawStatus = (p.reference_processing_status || '').toUpperCase();
  let status = 'NOT_READY';

  if (rawStatus === 'FAILED') {
    status = 'FAILED';
  } else if (rawStatus === 'PROCESSING') {
    status = 'PROCESSING';
  } else if (rawStatus === 'READY' && refCount >= 4) {
    status = 'READY';
  } else if (refCount === 0) {
    status = 'NOT_READY';
  } else if (refCount < 4) {
    status = 'INCOMPLETE';
  } else if (p.is_ready && refCount >= 4) {
    status = 'READY';
  } else if (refCount >= 4) {
    status = 'PROCESSING';
  }

  const isReady = status === 'READY' && refCount >= 4;

  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description || '',
    price: Number(p.price) || 0,
    reference_count: refCount,
    referenceAnglesCount: refCount,
    is_ready: isReady,
    reference_processing_status: status,
    referenceStatus: status,
    createdAt: p.created_at || new Date().toISOString(),
    references: p.references || [],
  };
}
