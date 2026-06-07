// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/** Rend une valeur en QR code (image data-URL). Accessible : texte alternatif fourni. */
export function QrCode({ value, size = 220, alt }: { value: string; size?: number; alt: string }) {
  const [dataUrl, setDataUrl] = useState<string>('');
  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 1 }).then(setDataUrl).catch(() => setDataUrl(''));
  }, [value, size]);
  if (!dataUrl) return null;
  return <img src={dataUrl} width={size} height={size} alt={alt} />;
}
