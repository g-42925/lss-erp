import Invoice from "@/models/Invoice";

export async function shiftVoucherNumbers(
  VoucherModel: any,
  companyId: any,
  voucherNumber: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // Split from the end: walk backwards while characters are digits.
    // This correctly handles e.g. "KK-KAS/IX/26/003" => prefix="KK-KAS/IX/26/", numStr="003"
    let splitIdx = voucherNumber.length - 1;
    while (splitIdx >= 0 && /\d/.test(voucherNumber[splitIdx])) {
      splitIdx--;
    }

    if (splitIdx === voucherNumber.length - 1) {
      // No trailing digits found — cannot shift
      console.error("[voucherHelper] No trailing digits found in:", voucherNumber);
      return { success: false, message: `Format nomor voucher tidak valid untuk pergeseran otomatis (tidak ada angka di akhir nomor)` };
    }

    const prefix = voucherNumber.substring(0, splitIdx + 1);
    const insertedNumStr = voucherNumber.substring(splitIdx + 1);
    const numLength = insertedNumStr.length;
    const insertedNum = parseInt(insertedNumStr, 10);

    console.log(`[voucherHelper] Shifting: prefix="${prefix}" insertedNum=${insertedNum} numLength=${numLength}`);

    // Build a regex that matches ALL vouchers with the same prefix followed by digits only
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = `^${escapedPrefix}\\d+$`;
    const regex = new RegExp(regexStr);

    console.log(`[voucherHelper] Regex: ${regexStr}`);

    const allVouchers = await VoucherModel.find({
      companyId: companyId,
      voucherNumber: { $regex: regex }
    }).lean();

    console.log(`[voucherHelper] Found ${allVouchers.length} matching vouchers:`, allVouchers.map((v: any) => v.voucherNumber));

    // Map each voucher to its trailing number using the same split-from-end logic
    const toUpdate = allVouchers
      .map((v: any) => {
        const vn: string = v.voucherNumber;
        let si = vn.length - 1;
        while (si >= 0 && /\d/.test(vn[si])) {
          si--;
        }
        const numStr = vn.substring(si + 1);
        return {
          id: v._id,
          num: numStr ? parseInt(numStr, 10) : 0,
          oldNumber: vn
        };
      })
      .filter((v: any) => v.num >= insertedNum)
      .sort((a: any, b: any) => b.num - a.num); // descending to avoid collisions

    console.log(`[voucherHelper] Will shift ${toUpdate.length} vouchers (those with num >= ${insertedNum}):`, toUpdate.map((v: any) => `${v.oldNumber} (num=${v.num})`));

    for (const item of toUpdate) {
      const newNum = item.num + 1;
      const newVoucherNumber = `${prefix}${newNum.toString().padStart(numLength, '0')}`;

      console.log(`[voucherHelper] Updating: "${item.oldNumber}" → "${newVoucherNumber}"`);

      const updateResult = await VoucherModel.findByIdAndUpdate(item.id, {
        $set: { voucherNumber: newVoucherNumber }
      }, { new: true });

      console.log(`[voucherHelper] Voucher update result:`, updateResult ? updateResult.voucherNumber : 'NOT FOUND');

      const invoiceResult = await Invoice.updateMany(
        { "paymentHistory.voucherNumber": item.oldNumber },
        { $set: { "paymentHistory.$[elem].voucherNumber": newVoucherNumber } },
        { arrayFilters: [{ "elem.voucherNumber": item.oldNumber }] }
      );

      console.log(`[voucherHelper] Invoice paymentHistory update: matched=${(invoiceResult as any).matchedCount} modified=${(invoiceResult as any).modifiedCount}`);
    }

    console.log(`[voucherHelper] Shift complete. Slot "${voucherNumber}" is now free.`);
    return { success: true };
  } catch (error: any) {
    console.error("[voucherHelper] Error during shift:", error);
    return { success: false, message: error.message };
  }
}
