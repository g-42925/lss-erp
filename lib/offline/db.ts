import Dexie from "dexie"
import { type Table } from "dexie"

class ERPDatabase extends Dexie {
	invItems!: Table<any>
	assets!: Table<any>
	purchases!: Table<any>

	constructor() {
		super("lss-erp")

		this.version(1).stores({
			invItems: "_id",
			assets: "_id",
			purchases: "tmpPurchaseOrderNumber"
		})
	}
}

export const db = new ERPDatabase()

db.on("versionchange", () => {
	db.close()
	console.warn("Database closed because another connection wants to upgrade")
})