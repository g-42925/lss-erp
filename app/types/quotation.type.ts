export type QQ = {
  _id: string
  discountValue: number
  companyId: string
  customerId: string
  discountType: string
  expiredDate: string
  price: number
  createdAt: number
  quotationNumber: string
  contractType: string
  range: number
  frequency: string
  productType: string
  locationId: string
  cart: {
    productId: string
    qty: number
    subTotal: number
    tax: boolean
  }[]
}