/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Companie from "@/models/Companie";
import BankAccount from "@/models/BankAccount";
import Cashflow from "@/models/Cashflow";

/**
 * POST /api/web/finance/reports/cashflow/transfer
 *
 * Membuat transaksi transfer dana antar akun:
 *  - Cash → Bank
 *  - Bank → Cash
 *  - Bank → Bank (rekening berbeda)
 *
 * Body:
 *  masterAccountId  : string
 *  fromType         : 'cash' | 'bank'
 *  fromBankAccountId: string | null   (required if fromType === 'bank')
 *  toType           : 'cash' | 'bank'
 *  toBankAccountId  : string | null   (required if toType === 'bank')
 *  amount           : number
 *  date             : string (ISO date)
 *  time             : string (HH:MM)
 *  reference        : string
 */
export async function POST(request: NextRequest) {
	try {
		await connectToDatabase();
		const body = await request.json();
		const {
			masterAccountId,
			fromType,
			fromBankAccountId,
			toType,
			toBankAccountId,
			amount,
			date,
			time,
			reference,
		} = body;

		// ── Validasi Input ──────────────────────────────────────────────────
		if (!masterAccountId) {
			return NextResponse.json({ error: true, message: "Missing masterAccountId" });
		}
		if (!fromType || !toType) {
			return NextResponse.json({ error: true, message: "fromType dan toType wajib diisi" });
		}
		if (fromType === toType && fromBankAccountId === toBankAccountId) {
			return NextResponse.json({ error: true, message: "Akun sumber dan tujuan tidak boleh sama" });
		}
		if (!amount || Number(amount) <= 0) {
			return NextResponse.json({ error: true, message: "Nominal harus lebih dari 0" });
		}

		const company = await Companie.findOne({ masterAccountId }).lean();
		if (!company) {
			return NextResponse.json({ error: true, message: "Company not found" });
		}

		// ── Resolve nama bank untuk label method ────────────────────────────
		let fromBankLabel = "Cash";
		let toBankLabel = "Cash";
		let fromAccountNumber = "";
		let toAccountNumber = "";

		if (fromType === "bank" && fromBankAccountId) {
			const bankAcc = await BankAccount.findById(fromBankAccountId).lean() as any;
			if (!bankAcc) return NextResponse.json({ error: true, message: "Rekening bank sumber tidak ditemukan" });
			fromBankLabel = bankAcc.bank || "Bank";
			fromAccountNumber = bankAcc.accountNumber || "";
		}
		if (toType === "bank" && toBankAccountId) {
			const bankAcc = await BankAccount.findById(toBankAccountId).lean() as any;
			if (!bankAcc) return NextResponse.json({ error: true, message: "Rekening bank tujuan tidak ditemukan" });
			toBankLabel = bankAcc.bank || "Bank";
			toAccountNumber = bankAcc.accountNumber || "";
		}

		// ── Validasi Saldo Sumber ────────────────────────────────────────────
		const { getAvailableBalance } = await import("@/lib/finance/balance");
		const srcPaymentMethod = fromType === "cash" ? "Cash" : "transfer";
		const srcBankAccId = fromType === "bank" ? fromBankAccountId : undefined;
		const txDate = date || new Date().toISOString();

		const balance = await getAvailableBalance(company._id, srcPaymentMethod, srcBankAccId, txDate);
		if (balance < Number(amount)) {
			const srcLabel = fromType === "cash" ? "Cash" : `Bank (${fromBankLabel})`;
			return NextResponse.json({
				error: true,
				message: `Saldo ${srcLabel} tidak mencukupi.\nSaldo tersedia: Rp ${balance.toLocaleString("id-ID")}\nJumlah transfer: Rp ${Number(amount).toLocaleString("id-ID")}`,
			});
		}

		// ── Buat 2 entri Cashflow ────────────────────────────────────────────
		// 1) OUT dari sumber
		const outEntry = {
			companyId: company._id,
			accountType: fromType === "cash" ? "Cash" : "Bank",
			bankAccountId: fromType === "bank" ? fromBankAccountId : null,
			type: "out",
			amount: Number(amount),
			date: new Date(date),
			time: time || null,
			reference: reference || "Transfer Dana",
			source: "Manual Entry",
			method: fromType === "cash" ? "Cash" : `${fromBankLabel} - ${fromAccountNumber}`,
			to: toType === "cash" ? "Kas Tunai" : `${toBankLabel} (${toAccountNumber})`,
			from: null,
		};

		// 2) IN ke tujuan
		const inEntry = {
			companyId: company._id,
			accountType: toType === "cash" ? "Cash" : "Bank",
			bankAccountId: toType === "bank" ? toBankAccountId : null,
			type: "in",
			amount: Number(amount),
			date: new Date(date),
			time: time || null,
			reference: reference || "Transfer Dana",
			source: "Manual Entry",
			method: toType === "cash" ? "Cash" : `${toBankLabel} - ${toAccountNumber}`,
			from: fromType === "cash" ? "Kas Tunai" : `${fromBankLabel} (${fromAccountNumber})`,
			to: null,
		};

		// Simpan keduanya
		await Promise.all([
			Cashflow.create(outEntry),
			Cashflow.create(inEntry),
		]);

		return NextResponse.json({ error: false, message: "Transfer berhasil dicatat" });
	} catch (e: any) {
		console.error("Cashflow Transfer POST Error:", e);
		return NextResponse.json({ error: true, message: e.message || "Gagal menyimpan transfer" });
	}
}
