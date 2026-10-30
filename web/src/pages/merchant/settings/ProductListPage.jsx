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
} from 'lucide-react';
import { useMerchant } from '../../../context/MerchantContext';
import { MerchantHeader } from '../../../components/common/MerchantHeader';
import { QuickAddProductDialog } from '../../../components/merchant/QuickAddProductDialog';
import { formatCurrency } from '../../../utils/formatters';

export function ProductListPage() {
  const navigate = useNavigate();
  const { products, addProduct } = useMerchant();

  const [search, setSearch] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-appBg flex flex-col">
      <MerchantHeader
        title="Product Reference Catalog"
        subtitle="Manage product definitions and 4-angle reference imagery"
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Settings
          </button>

          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
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

        {/* Product Cards Grid */}
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
      </main>

      {isQuickAddOpen && (
        <QuickAddProductDialog
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onProductCreated={(newProd) => {
            addProduct(newProd);
            navigate(`/settings/products/${newProd.id}/references`);
          }}
        />
      )}
    </div>
  );
}
