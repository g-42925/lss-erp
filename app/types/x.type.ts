import { Customer } from "./customer.type"
import { Product } from "./product.type"
import { QQ } from "./quotation.type"

export type X = QQ & {
  product: Product
  variousItem: boolean
  customer: Customer
}