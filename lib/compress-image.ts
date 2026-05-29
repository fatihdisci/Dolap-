'use client';

// Vercel serverless request body limiti 4.5 MB.
// iPhone fotoğrafları 5-10 MB olabilir; Canvas API ile sıkıştırıyoruz.
// HEIC/HEIF → iOS canvas bunları JPEG olarak çizer, dönüşüm otomatik.

const LIMIT_BYTES = 3.8 * 1024 * 1024; // 3.8 MB — Vercel 4.5 MB'ın güvenli altı

async function attempt(
  img: HTMLImageElement,
  maxDim: number,
  quality: number,
): Promise<Blob> {
  let { naturalWidth: w, naturalHeight: h } = img;

  if (w > maxDim || h > maxDim) {
    if (w >= h) {
      h = Math.round((h * maxDim) / w);
      w = maxDim;
    } else {
      w = Math.round((w * maxDim) / h);
      h = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context alınamadı');
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise<Blob>((resolve, reject) => {
    // iOS bazı durumlarda toBlob'u çağırmayabilir, timeout ekle
    const timer = setTimeout(() => reject(new Error('toBlob timeout')), 8000);
    canvas.toBlob(
      (blob) => {
        clearTimeout(timer);
        if (blob) resolve(blob);
        else reject(new Error('toBlob null döndü'));
      },
      'image/jpeg',
      quality,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error('Görsel yükleme timeout')), 15000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('Görsel yüklenemedi')); };
    img.src = src;
  });
}

const PASSES = [
  { maxDim: 1280, quality: 0.82 },
  { maxDim: 1024, quality: 0.75 },
  { maxDim: 800,  quality: 0.68 },
  { maxDim: 640,  quality: 0.60 },
  { maxDim: 512,  quality: 0.55 },
];

export async function compressImage(file: File): Promise<Blob> {
  // Zaten küçükse dokunma
  if (file.size <= LIMIT_BYTES) return file;

  const url = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }

  for (const { maxDim, quality } of PASSES) {
    try {
      const blob = await attempt(img, maxDim, quality);
      if (blob.size <= LIMIT_BYTES) return blob;
    } catch {
      // Bu pas başarısız, bir sonrakini dene
    }
  }

  throw new Error(
    `Fotoğraf sıkıştırılamadı (${(file.size / 1024 / 1024).toFixed(1)} MB). Lütfen daha küçük bir fotoğraf seç.`,
  );
}
