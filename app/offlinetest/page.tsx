
"use client"

import { useState } from "react"
import { db } from "@/lib/offline/db"

export default function OfflineTest() {
    const [products, setProducts] = useState([])

    async function testSave() {
        await db.purchases.put({
            _id: "product-001",
            name: "Produk Offline",
            code: "OFF001"
        })

        alert("Data berhasil disimpan!")
    }

    async function testRead() {
        const data = await db.purchases.toArray()
        console.log(data)
        setProducts(data)
    }

    return (
        <div className="p-5 space-y-4">
            <h1 className="text-xl font-bold">
                IndexedDB Test
            </h1>

            <button onClick={testSave}>
                Simpan Data
            </button>

            <button onClick={testRead}>
                Baca Data
            </button>

            <pre>{JSON.stringify(products, null, 2)}</pre>
        </div>
    )
}
