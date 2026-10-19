/**
 * Logo → suggested brand colours. Same method as 3d_designer's brand Setup:
 * draw the logo at 60×60, skip transparent and near-white pixels, bucket the rest
 * to steps of 32 per channel, and return the most frequent buckets.
 */
export function extractColors(rgba: ArrayLike<number>, max = 3): string[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const r = rgba[i],
      g = rgba[i + 1],
      b = rgba[i + 2],
      a = rgba[i + 3];
    if (a < 128 || (Math.max(r, g, b) > 235 && Math.min(r, g, b) > 210)) continue;
    const hex =
      '#' +
      [r, g, b]
        .map(v => Math.min(255, Math.round(v / 32) * 32).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    buckets.set(hex, (buckets.get(hex) || 0) + 1);
  }
  return [...buckets]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([hex]) => hex);
}

/** Browser only: decode an image file and return its suggested colours. */
export async function extractColorsFromFile(file: File, max = 3): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 60;
    const c = canvas.getContext('2d');
    if (!c) return [];
    c.drawImage(img, 0, 0, 60, 60);
    return extractColors(c.getImageData(0, 0, 60, 60).data, max);
  } finally {
    URL.revokeObjectURL(url);
  }
}
