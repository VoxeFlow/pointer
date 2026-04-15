export function formatLocationLabel(address?: string | null) {
  if (!address) {
    return null;
  }

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 3) {
    return parts.join(", ");
  }

  return parts.slice(0, 3).join(", ");
}

export function buildMapUrl(latitude?: number | string | null, longitude?: number | string | null) {
  if (latitude == null || longitude == null) {
    return null;
  }

  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
