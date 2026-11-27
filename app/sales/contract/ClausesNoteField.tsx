"use client"

/**
 * Updates `clausesNote` when the selected customer changes:
 * - Replaces `prevCompanyName` with `nextCompanyName` while preserving surrounding text.
 * - If `prevCompanyName` wasn't present, appends `nextCompanyName` if not already included.
 */
export function syncClausesNoteCustomer(
  currentNote: string,
  prevCompanyName: string,
  nextCompanyName: string
): string {
  const prev = prevCompanyName.trim()
  const next = nextCompanyName.trim()

  if (prev && currentNote.includes(prev)) {
    if (next) {
      return currentNote.replace(prev, next)
    }
    return currentNote.replace(prev, "").replace(/\s{2,}/g, " ").trim()
  }

  if (!next) return currentNote
  if (currentNote.includes(next)) return currentNote
  return currentNote.trim() ? `${currentNote.trim()} ${next}` : next
}

interface ClausesNoteFieldProps {
  value: string
  onChange: (value: string) => void
  lockedCompanyName?: string
}

export default function ClausesNoteField({
  value,
  onChange,
  lockedCompanyName = "",
}: ClausesNoteFieldProps) {
  const locked = lockedCompanyName.trim()

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value
    if (locked && !nextVal.includes(locked)) {
      return
    }
    onChange(nextVal)
  }

  return (
    <div className="form-control w-full">
      <label className="label">
        <span className="label-text">
          Catatan Clauses <span className="text-error">*</span>
        </span>
      </label>
      <textarea
        className="textarea textarea-bordered h-24"
        required
        placeholder="Catatan umum untuk pasal-pasal kontrak..."
        value={value}
        onChange={handleChange}
      />
      {locked && (
        <label className="label">
          <span className="label-text-alt text-gray-500">
            Teks{" "}
            <span className="font-semibold text-gray-700">{locked}</span>{" "}
            merupakan nilai default yang tidak dapat dihapus. Anda dapat
            menambahkan teks sebelum atau sesudahnya.
          </span>
        </label>
      )}
    </div>
  )
}

