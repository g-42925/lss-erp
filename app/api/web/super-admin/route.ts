/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

import User from "@/models/User";
import CryptoJS from "crypto-js";

/**
 * PUT /api/web/super-admin
 * Reset username (email) dan/atau password super admin.
 * Body:
 *   - userId        : _id super admin yang sedang login
 *   - currentPassword : password saat ini (plain text) untuk verifikasi
 *   - newEmail?     : email baru (opsional)
 *   - newPassword?  : password baru (opsional)
 */
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const { userId, currentPassword, newEmail, newPassword } =
      await request.json();

    if (!userId || !currentPassword) {
      return NextResponse.json({
        noResult: true,
        message: "userId dan currentPassword wajib diisi",
        result: null,
        error: true,
      });
    }

    // Cari super admin
    const user = await User.findOne({ _id: userId, isSuperAdmin: true });
    if (!user) {
      return NextResponse.json({
        noResult: true,
        message: "Super admin tidak ditemukan",
        result: null,
        error: true,
      });
    }

    // Verifikasi password saat ini
    const hashedCurrent = CryptoJS.MD5(currentPassword).toString();
    if (hashedCurrent !== user.password) {
      return NextResponse.json({
        noResult: true,
        message: "Password saat ini tidak sesuai",
        result: null,
        error: true,
      });
    }

    // Bangun objek update
    const updatePayload: Record<string, any> = {};

    if (newEmail && newEmail.trim().length > 0) {
      // Pastikan email belum dipakai user lain
      const existing = await User.findOne({
        email: newEmail.trim(),
        _id: { $ne: userId },
      });
      if (existing) {
        return NextResponse.json({
          noResult: true,
          message: "Email sudah digunakan oleh akun lain",
          result: null,
          error: true,
        });
      }
      updatePayload.email = newEmail.trim();
    }

    if (newPassword && newPassword.trim().length > 0) {
      updatePayload.password = CryptoJS.MD5(newPassword.trim()).toString();
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({
        noResult: true,
        message: "Tidak ada perubahan yang dikirim",
        result: null,
        error: true,
      });
    }

    const updated = await User.findByIdAndUpdate(userId, updatePayload, {
      new: true,
    });

    return NextResponse.json({
      noResult: false,
      message: "Berhasil diperbarui",
      result: { email: updated.email },
      error: false,
    });
  } catch (e: any) {
    return NextResponse.json({
      noResult: true,
      message: e.message ?? "Something went wrong",
      result: null,
      error: true,
    });
  }
}
