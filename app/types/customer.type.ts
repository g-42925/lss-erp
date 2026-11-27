export type Customer = {
  _id: string
  bussinessName: string
  name: string
  addedOn: string
  address: string
  mobile: string
  active: string
  taxType: 'KTP' | 'NPWP' | ''
  taxNumber: string
  customerOf: string
  companyName: string
  district: string
  city: string
  province: string
  village: string
}