import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';

export const referenceService = {
  async listReferences(productId) {
    const response = await apiClient.get(ApiEndpoints.productReferences(productId));
    return response.data;
  },

  async getReferenceByAngle(productId, angle) {
    const response = await apiClient.get(ApiEndpoints.productReferenceAngle(productId, angle.toUpperCase()));
    return response.data;
  },

  async uploadReference(productId, angle, file) {
    const formData = new FormData();
    formData.append('angle', angle.toUpperCase());
    formData.append('image', file);

    const response = await apiClient.post(
      ApiEndpoints.productReferences(productId),
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  async deleteReference(productId, angle) {
    const response = await apiClient.delete(
      ApiEndpoints.productReferenceAngle(productId, angle.toUpperCase())
    );
    return response.data;
  },

  getReferenceFileUrl(productId, angle) {
    return ApiEndpoints.productReferenceFile(productId, angle.toUpperCase());
  },
};
