import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Layers,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useMerchant } from '../../../context/MerchantContext';
import { MerchantHeader } from '../../../components/common/MerchantHeader';
import { QuickAddProductDialog } from '../../../components/merchant/QuickAddProductDialog';
import { formatCurrency } from '../../../utils/formatters';

export function ProductListPage() {
  const navigate = useNavigate();
  const { products, refreshData, deleteProduct } = useMerchant();

  const [search, setSearch] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [actionNotification, setActionNotification] = useState(null);

  const filteredProducts = products.filter(
    (p) =>
      !p.is_archived &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteProduct(productToDelete.id);
      const isArchived = res?.status === 'archived';
      setActionNotification({
        type: 'success',
        text: isArchived
          ? `Product '${productToDelete.name}' has historical verification records and was safely archived.`
          : `Product '${productToDelete.name}' and all reference baselines were deleted.`,
      });
      setProductToDelete(null);
      setTimeout(() => setActionNotification(null), 6000);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Failed to delete product';
      setDeleteError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-appBg flex flex-col">
      <MerchantHeader
        title="Product Reference Catalog"
        subtitle="Manage product definitions and 4-angle reference imagery"
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Action Notification Banner */}
        {actionNotification && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{actionNotification.text}</span>
            </div>
            <button
              onClick={() => setActionNotification(null)}
              className="text-emerald-600 hover:text-emerald-800 font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Settings
          </button>

          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl border border-appBorder shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-darkNeutral placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Product Cards Grid or Empty State */}
        {products.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-appBorder shadow-sm text-center max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto">
              <Package className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-darkNeutral">No products added yet.</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add your first product to create trusted product references and start verification.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsQuickAddOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-appBorder shadow-sm text-center max-w-md mx-auto space-y-3">
            <Search className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-darkNeutral">No matching products found</h3>
            <p className="text-xs text-slate-500">
              No products match &ldquo;{search}&rdquo;. Try searching by another product name or SKU.
            </p>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const isReady =
                product.referenceStatus === 'READY' && product.referenceAnglesCount >= 4;

              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/settings/products/${product.id}/references`)}
                  className="bg-white p-5 rounded-2xl border border-appBorder shadow-sm hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isReady
                              ? 'bg-emerald-100 text-emerald-800'
                              : product.referenceStatus === 'PROCESSING'
                              ? 'bg-sky-100 text-sky-800 animate-pulse'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isReady
                            ? 'READY (4/4)'
                            : product.referenceStatus === 'PROCESSING'
                            ? 'AI PROCESSING'
                            : `${product.referenceAnglesCount || 0}/4 ANGLES`}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToDelete(product);
                            setDeleteError(null);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={`Delete ${product.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm text-darkNeutral group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[11px] text-slate-400">
                          {product.sku}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-bold text-xs text-slate-700">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {product.description || 'No product description provided.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs font-semibold text-primary">
                    <span>Manage 4-Angle References</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Product Confirmation Dialog */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-appBorder space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-darkNeutral">Delete Product?</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {productToDelete.name} ({productToDelete.sku})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this product? This will also remove its associated reference images and product visual profile. Existing verification records may depend on this product.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-snug">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setProductToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Product</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product Dialog */}
      {isQuickAddOpen && (
        <QuickAddProductDialog
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onProductCreated={async (newProd) => {
            setIsQuickAddOpen(false);
            await refreshData();
            setActionNotification({
              type: 'success',
              text: `Product '${newProd.name}' created successfully! Click its card to upload and manage 4-angle reference images.`,
            });
            setTimeout(() => setActionNotification(null), 6000);
          }}
        />
      )}
    </div>
  );
}
