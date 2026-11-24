import Dexie from "dexie"

class ERPDatabase extends Dexie {
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

db.on('versionchange', () => {
	db.close()
	console.warn('Database closed because another connection wants to upgrade')
})
