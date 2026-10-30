import React, { useState, useEffect } from 'react';
import { PackagePlus } from 'lucide-react';
import { productService } from '../../services/api/productService';

export function QuickAddProductDialog({ isOpen = true, onProductCreated, onClose }) {
  if (!isOpen) {
    return null;
  }

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Keyboard accessibility: ESC closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSaving]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) {
      setError('Please fill in required fields (Name and SKU).');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const created = await productService.addProduct({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        price: parseFloat(price) || 0,
        description: description.trim(),
      });
      onProductCreated(created);
      onClose();
    } catch (err) {
      setError('Failed to create product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSaving) {
      onClose?.();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-product-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-appBorder"
      >
        <div className="flex items-center gap-2.5 pb-3 border-b border-appBorder mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div>
            <h3 id="quick-add-product-title" className="text-base font-bold text-darkNeutral">
              Add New Product
            </h3>
            <p className="text-xs text-textSecondary">Create merchandise catalog item</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-darkNeutral mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Wireless Noise-Cancelling Headphones"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-appBorder rounded-xl focus:outline-none focus:border-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-darkNeutral mb-1">SKU *</label>
              <input
                type="text"
                required
                placeholder="e.g. WH-1000XM4"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-appBorder rounded-xl focus:outline-none focus:border-primary font-mono uppercase"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-darkNeutral mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="299.99"
                className="w-full px-3 py-2 text-xs sm:text-sm border border-appBorder rounded-xl focus:outline-none focus:border-primary"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-darkNeutral mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief specification or color notes..."
              className="w-full px-3 py-2 text-xs sm:text-sm border border-appBorder rounded-xl focus:outline-none focus:border-primary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-appBorder">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-textSecondary hover:bg-surface-variant rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Create Product</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
