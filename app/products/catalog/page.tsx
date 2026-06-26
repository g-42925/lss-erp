"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import useAuth from "@/store/auth"
import useFetch from "@/hooks/useFetch"

export default function ProductCatalog() {
  const router = useRouter()
  const loggedIn = useAuth((state) => state.loggedIn)
  const masterAccountId = useAuth((state) => state.masterAccountId)
  const hasHydrated = useAuth((state) => state._hasHydrated)

  const [products, setProducts] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")

  const getFn = useFetch<any[], any>({
    url: `/api/web/products?id=xxx`,
    method: "GET"
  })

  useEffect(() => {
    if (hasHydrated && masterAccountId) {
      const url = `/api/web/products?id=${masterAccountId}&type=all`
      const body = JSON.stringify({})
      getFn.fn(url, body, (result) => {
        setProducts(result || [])
      })
    }
  }, [hasHydrated, masterAccountId])

  // Extract unique categories for the filter
  const categories = useMemo(() => {
    const list = new Set(products.map(p => p.category).filter(Boolean))
    return ["All", ...Array.from(list)]
  }, [products])

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.productName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.productId && p.productId.toLowerCase().includes(searchQuery.toLowerCase()))
      const matchCategory = selectedCategory === "All" || p.category === selectedCategory
      return matchSearch && matchCategory
    })
  }, [products, searchQuery, selectedCategory])

  const IDR = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v || 0)

  if (!hasHydrated) return null
  if (!loggedIn) { router.push('/login'); return null }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Katalog Produk</h1>
          <p className="text-sm text-slate-500">Daftar semua produk dan layanan yang dijual</p>
        </div>
        
        {/* Actions / Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input 
              type="text" 
              placeholder="Cari nama atau SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all font-medium text-slate-700 bg-none"
          >
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="p-6 max-w-[1600px] mx-auto w-full flex-1">
        {getFn.loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-4">
                <div className="bg-slate-200 h-32 rounded-xl w-full"></div>
                <div className="bg-slate-200 h-4 rounded w-3/4"></div>
                <div className="bg-slate-200 h-4 rounded w-1/2"></div>
                <div className="bg-slate-200 h-6 rounded w-1/3 mt-auto"></div>
              </div>
            ))}
          </div>
        ) : getFn.error || getFn.noResult ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="text-4xl mb-3">😕</span>
            <p className="font-semibold text-lg">{getFn.message || "Gagal memuat produk"}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="text-4xl mb-3">📦</span>
            <p className="font-semibold text-lg">Tidak ada produk ditemukan.</p>
            <p className="text-sm">Mungkin coba kata kunci lain atau ubah filter kategori.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {filteredProducts.map((p) => {
              const fallbackImage = "https://placehold.co/400x400/png?text=" + encodeURIComponent(p.productName || "No Image")
              
              return (
                <div 
                  key={p._id} 
                  className="group bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col relative"
                >
                  {/* Badge: Type */}
                  <div className="absolute top-2 left-2 z-10 hidden group-hover:block">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-sm
                      ${p.productType === 'service' ? 'bg-sky-500' : 'bg-emerald-500'}
                    `}>
                      {p.productType}
                    </span>
                  </div>

                  {/* Stock Info Badge (Only for Goods) */}
                  {p.productType === 'good' && p.remain !== undefined && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm backdrop-blur-sm
                        ${p.remain <= 0 ? 'bg-rose-100 text-rose-700 border-rose-200' : 
                          p.remain <= 5 ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                          'bg-white/90 text-slate-700'} border
                      `}>
                        {p.remain <= 0 ? "Habis" : `${p.remain} stok`}
                      </span>
                    </div>
                  )}

                  {/* Image Container */}
                  <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                    {p.image ? (
                      <Image 
                        src={p.image.startsWith('http') ? p.image : fallbackImage} 
                        alt={p.productName} 
                        fill 
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500" 
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-12">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 line-clamp-1">{p.category}</p>
                    <h3 className="font-bold text-slate-800 leading-snug line-clamp-2 min-h-[2.5rem]" title={p.productName}>
                      {p.productName}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-1 mb-3">
                      SKU: {p.productId || "-"}
                    </p>
                    
                    <div className="mt-auto flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-0.5">Harga Jual</p>
                        <p className="text-lg font-extrabold text-violet-600 leading-none">
                          {IDR(p.sellingPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
