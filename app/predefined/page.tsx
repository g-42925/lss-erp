"use client"

import { useEffect, useState } from "react"

const initialForm = {
	name: "",
	symbol: "",
	category: "quantity",
	factorToBase: "1",
	isActive: true
}

const categories = [
	{ value: "weight", label: "Berat" },
	{ value: "volume", label: "Volume" },
	{ value: "length", label: "Panjang" },
	{ value: "area", label: "Luas" },
	{ value: "time", label: "Waktu" },
	{ value: "quantity", label: "Jumlah" }
]

export default function UnitManager() {
	const [units, setUnits] = useState([])
	const [form, setForm] = useState(initialForm)
	const [editing, setEditing] = useState(null)
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState("")

	const fetchUnits = async () => {
		setLoading(true)

		try {
			const res = await fetch("/api/web/predefined-unit")
			const data = await res.json()

			if (!res.ok) throw new Error(data.message)

			setUnits(data.result)
		}
		catch (error) {
			setError(error instanceof Error ? error.message : String(error))
		}
		finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchUnits()
	}, [])

	const handleChange = (e: any) => {
		const { name, value, type, checked } = e.target

		setForm(prev => ({
			...prev,
			[name]: type === "checkbox" ? checked : value
		}))
	}

	const handleEdit = (unit) => {
		setEditing(unit._id)

		setForm({
			name: unit.name,
			symbol: unit.symbol,
			category: unit.category,
			factorToBase: String(unit.factorToBase),
			isActive: unit.isActive
		})

		setError("")
	}

	const handleReset = () => {
		setEditing(null)
		setForm(initialForm)
		setError("")
	}

	const handleSubmit = async (e) => {
		e.preventDefault()
		setSaving(true)
		setError("")

		try {
			const isEditing = Boolean(editing)

			const res = await fetch(
				isEditing ? `/api/web/predefined-unit/${editing}` : "/api/web/predefined-unit",
				{
					method: isEditing ? "PUT" : "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						...form,
						factorToBase: Number(form.factorToBase)
					})
				}
			)

			const data = await res.json()

			if (!res.ok) throw new Error(data.message)

			handleReset()
			await fetchUnits()
		}
		catch (error) {
			setError(error.message)
		}
		finally {
			setSaving(false)
		}
	}

	return (
		<div className="space-y-6">

			{/* FORM */}
			<div className="card bg-base-100 shadow-sm">
				<div className="card-body">
					<h2 className="card-title">
						{editing ? "Edit Satuan" : "Tambah Satuan"}
					</h2>

					<form onSubmit={handleSubmit} className="space-y-4">

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

							<label className="form-control">
								<span className="label-text mb-2">Nama Satuan</span>
								<input
									type="text"
									name="name"
									className="input input-bordered"
									placeholder="Kilogram"
									value={form.name}
									onChange={handleChange}
									required
								/>
							</label>

							<label className="form-control">
								<span className="label-text mb-2">Simbol</span>
								<input
									type="text"
									name="symbol"
									className="input input-bordered"
									placeholder="kg"
									value={form.symbol}
									onChange={handleChange}
									required
								/>
							</label>

							<label className="form-control">
								<span className="label-text mb-2">Kategori</span>
								<select
									name="category"
									className="select select-bordered"
									value={form.category}
									onChange={handleChange}
									required
								>
									{categories.map(category => (
										<option
											key={category.value}
											value={category.value}
										>
											{category.label}
										</option>
									))}
								</select>
							</label>

							<label className="form-control">
								<span className="label-text mb-2">
									Faktor ke Satuan Dasar
								</span>
								<input
									type="number"
									name="factorToBase"
									className="input input-bordered"
									value={form.factorToBase}
									onChange={handleChange}
									min="0"
									step="any"
									required
								/>
							</label>

						</div>

						<label className="label cursor-pointer justify-start gap-3">
							<input
								type="checkbox"
								name="isActive"
								className="checkbox checkbox-primary"
								checked={form.isActive}
								onChange={handleChange}
							/>
							<span className="label-text">Aktif</span>
						</label>

						{error && (
							<div className="alert alert-error">
								<span>{error}</span>
							</div>
						)}

						<div className="flex gap-2 justify-end">
							{editing && (
								<button
									type="button"
									className="btn btn-ghost"
									onClick={handleReset}
								>
									Batal
								</button>
							)}

							<button
								type="submit"
								className="btn btn-primary"
								disabled={saving}
							>
								{saving
									? "Menyimpan..."
									: editing
										? "Simpan Perubahan"
										: "Tambah Satuan"}
							</button>
						</div>

					</form>
				</div>
			</div>

			{/* TABLE */}
			<div className="card bg-base-100 shadow-sm">
				<div className="card-body">

					<h2 className="card-title">
						Daftar Satuan
						<span className="badge badge-neutral">
							{units.length}
						</span>
					</h2>

					<div className="overflow-x-auto">
						<table className="table table-zebra">

							<thead>
								<tr>
									<th>Nama</th>
									<th>Simbol</th>
									<th>Kategori</th>
									<th>Faktor</th>
									<th>Status</th>
									<th></th>
								</tr>
							</thead>

							<tbody>
								{loading ? (
									<tr>
										<td colSpan={6} className="text-center">
											Memuat data...
										</td>
									</tr>
								) : units.length === 0 ? (
									<tr>
										<td colSpan={6} className="text-center">
											Belum ada satuan
										</td>
									</tr>
								) : (
									units?.map(unit => (
										<tr key={unit._id}>
											<td>{unit.name}</td>
											<td className="font-semibold">{unit.symbol}</td>
											<td>
												{categories.find(
													c => c.value === unit.category
												)?.label}
											</td>
											<td>{unit.factorToBase}</td>
											<td>
												<span className={`badge ${unit.isActive
													? "badge-success"
													: "badge-ghost"
													}`}>
													{unit.isActive ? "Aktif" : "Nonaktif"}
												</span>
											</td>
											<td>
												<button
													className="btn btn-sm btn-outline"
													onClick={() => handleEdit(unit)}
												>
													Edit
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>

						</table>
					</div>

				</div>
			</div>

		</div>
	)
}