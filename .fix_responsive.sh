#!/bin/bash
# Fix mobile responsiveness across all page.tsx files
# Pattern replacements:
#  1. Page outer padding: p-6 -> p-3 md:p-6
#  2. Card padding: bg-white h-full border-t-4 ... p-6 gap-6 -> p-3 md:p-6 gap-3 md:gap-6
#  3. Toolbar flex row -> flex col sm:row
#  4. Search input: ml-auto border-1 border-black rounded-md p-3 -> toolbar-search ml-auto equivalent
#  5. Wrap <table with overflow-x-auto div

APP="/home/muhammad/lss-erp/app"

# Find all page.tsx in app directory (not login/reset/select-location)
FILES=$(find "$APP" -name "page.tsx" \
  ! -path "*/login/*" \
  ! -path "*/reset/*" \
  ! -path "*/select-location/*" \
  ! -path "*/api/*" \
  ! -path "*/node_modules/*")

for FILE in $FILES; do
  echo "Processing: $FILE"

  # 1. Outer page padding: "h-full p-6 flex flex-col gap-3" -> mobile-friendly
  sed -i 's/className="h-full p-6 flex flex-col gap-3 text-black"/className="h-full p-3 md:p-6 flex flex-col gap-3 text-black"/g' "$FILE"
  sed -i 's/className="h-full p-6 flex flex-col gap-3 text-black no-print"/className="h-full p-3 md:p-6 flex flex-col gap-3 text-black no-print"/g' "$FILE"

  # 2. Card: bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6
  sed -i 's/className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6"/className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6"/g' "$FILE"
  sed -i 's/className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6 rounded-lg"/className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6 rounded-lg"/g' "$FILE"
  sed -i 's/className="bg-white h-full border-t-4 border-blue-900 shadow-xl flex flex-col p-6 gap-6 rounded-lg"/className="bg-white h-full border-t-4 border-blue-900 shadow-xl flex flex-col p-3 md:p-6 gap-3 md:gap-6 rounded-lg"/g' "$FILE"
  sed -i 's/className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-6 gap-6"/className="bg-white h-full border-t-4 border-blue-900 flex flex-col p-3 md:p-6 gap-3 md:gap-6"/g' "$FILE"
  sed -i 's/className="bg-white h-full border-t-4 border-blue-900 shadow-xl flex flex-col p-6 gap-6"/className="bg-white h-full border-t-4 border-blue-900 shadow-xl flex flex-col p-3 md:p-6 gap-3 md:gap-6"/g' "$FILE"

  # 3. Search input: ml-auto border-1 border-black rounded-md p-3
  sed -i 's/className="ml-auto border-1 border-black rounded-md p-3"/className="toolbar-search"/g' "$FILE"
  sed -i 's/className="ml-auto border-1 border-black rounded-md p-3 "/className="toolbar-search"/g' "$FILE"

  # 4. page title text-2xl -> page-title class
  sed -i 's/<span className="text-2xl">/<span className="page-title">/g' "$FILE"

  # 5. Toolbar row: "flex flex-row" containing Show/Search -> flex-col sm:flex-row
  sed -i 's/className="flex flex-row" data-toolbar/className="toolbar"/g' "$FILE"

done

echo "Done!"
