import * as XLSX from "xlsx";

export async function parseExcelFile(
  file: File
): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

export function buildTemplateWorkbook(
  headers: string[],
  sampleRow: Record<string, string | number>
): ArrayBuffer {
  const worksheet = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
  const buffer: Buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const arrayBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(arrayBuffer).set(buffer);
  return arrayBuffer;
}
