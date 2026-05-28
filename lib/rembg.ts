// Harici rembg servisi (Hugging Face Space) ile arka plan silme.
// POST ${REMBG_URL} — multipart form-data, "file" alanında foto.
// Yanıt: image/png (şeffaf zeminli izole görsel).

export async function removeBackground(blob: Blob, filename: string): Promise<Blob> {
  const url = process.env.REMBG_URL;
  if (!url) throw new Error('REMBG_URL tanımlı değil');

  const form = new FormData();
  form.append('file', blob, filename);

  const res = await fetch(url, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`rembg → ${res.status}: ${text}`);
  }

  return res.blob();
}
