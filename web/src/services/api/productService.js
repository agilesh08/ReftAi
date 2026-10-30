import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';
import { referenceService } from './referenceService';

export const productService = {
  async listProducts() {
    try {
      const response = await apiClient.get(ApiEndpoints.products);
      if (Array.isArray(response.data)) {
        return response.data.map(normalizeProduct);
      }
      return [];
    } catch (err) {
      console.warn('API listProducts error:', err.message);
      return [];
    }
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
      console.warn('API getProductCompleteness error:', err.message);
      return {
        product_id: productId,
        reference_count: 0,
        is_ready: false,
        missing_angles: ['FRONT', 'BACK', 'LEFT', 'RIGHT'],
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

    const response = await apiClient.post(ApiEndpoints.products, payload);
    return normalizeProduct(response.data);
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
