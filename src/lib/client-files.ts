// Utilitários (só correm no browser) para converter ficheiros escolhidos
// pelo utilizador em data URIs, com redimensionamento para imagens — evita
// depender de armazenamento externo (não há credenciais de cloud storage
// configuradas nesta instância).

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Redimensiona uma imagem para no máximo maxDim x maxDim e recomprime em
// JPEG, para manter o data URI pequeno (a base de dados guarda-o em texto).
export async function readImageAsResizedDataUrl(
  file: File,
  maxDim = 256,
  quality = 0.85
): Promise<string> {
  const original = await readFileAsDataUrl(file);
  const img = await loadImage(original);

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
