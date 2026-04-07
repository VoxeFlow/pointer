import { env } from "@/lib/env";

type ReverseGeocodeResult = {
  addressText: string;
  provider: string;
};

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

export async function reverseGeocode(
  latitude?: number,
  longitude?: number,
): Promise<ReverseGeocodeResult | null> {
  if (
    env.POINTER_GEOCODING_PROVIDER === "none" ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return null;
  }

  if (env.POINTER_GEOCODING_PROVIDER === "nominatim") {
    const search = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      addressdetails: "1",
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${search.toString()}`, {
      headers: {
        "User-Agent": env.POINTER_GEOCODING_USER_AGENT,
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { display_name?: string };

    if (!payload.display_name) {
      return null;
    }

    return {
      addressText: payload.display_name,
      provider: "nominatim",
    };
  }

  return null;
}
