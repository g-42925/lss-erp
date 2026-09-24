const str = "Pelunasan PC Desember 2025 PT. Indodairy Continental Inv : LR251200056";
const match = str.match(/pelunasan\s+.+?\s*:\s*(\S+)/i);
console.log(match ? match[1] : "no match");
