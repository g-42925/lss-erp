import mongoose from 'mongoose';

/**
 * SalesCatalog — Master katalog item penjualan (entitas induk).
 * Setiap katalog dapat memiliki banyak varian (Product dengan catalogId).
 * Varian-lah yang tersedia di Purchase Requisition type "Barang".
 */
const SalesCatalogSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    subCategory: {
      type: String,
      trim: true,
      default: '',
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    unit: {
      type: String,
      trim: true,
      default: 'pcs',
    },
    catalogCode: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.SalesCatalog ||
  mongoose.model('SalesCatalog', SalesCatalogSchema);
