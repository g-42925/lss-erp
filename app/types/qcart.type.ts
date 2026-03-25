export type QCart = {
  product: {
    productId: string
    productName?: string,
    qty: number
  }
  tax: boolean | string
  subTotal: number
}