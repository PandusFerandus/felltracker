/** Größte Kantenlänge des gespeicherten Profilbilds in Pixeln. */
export const MAX_PHOTO_SIZE = 512;

/** Quadratischer Ausschnitt aus der Bildmitte und Zielgröße (höchstens 512 px). */
export function squareCrop(width: number, height: number, max = MAX_PHOTO_SIZE) {
  const side = Math.floor(Math.min(width, height));
  return {
    crop: {
      originX: Math.floor((width - side) / 2),
      originY: Math.floor((height - side) / 2),
      width: side,
      height: side,
    },
    size: Math.min(side, max),
  };
}
