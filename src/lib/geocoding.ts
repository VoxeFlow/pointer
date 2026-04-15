import { env } from "@/lib/env";

type ReverseGeocodeResult = {
  addressText: string;
  provider: string;
};

type ForwardGeocodeResult = {
  addressText: string;
  provider: string;
  latitude: number;
  longitude: number;
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

export function calculateDistanceMeters(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const deltaLat = toRad(latitudeB - latitudeA);
  const deltaLon = toRad(longitudeB - longitudeA);
  const lat1 = toRad(latitudeA);
  const lat2 = toRad(latitudeB);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(earthRadius * c);
}

export async function forwardGeocode(address?: string | null): Promise<ForwardGeocodeResult | null> {
  if (env.POINTER_GEOCODING_PROVIDER === "none" || !address?.trim()) {
    return null;
  }

  if (env.POINTER_GEOCODING_PROVIDER === "nominatim") {
    try {
      const search = new URLSearchParams({
        format: "jsonv2",
        q: address.trim(),
        limit: "1",
        addressdetails: "1",
      });

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${search.toString()}`, {
        headers: {
          "User-Agent": env.POINTER_GEOCODING_USER_AGENT,
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as Array<{
        display_name?: string;
        lat?: string;
        lon?: string;
      }>;

      const first = payload[0];

      if (!first?.display_name || !first.lat || !first.lon) {
        return null;
      }

      return {
        addressText: first.display_name,
        provider: "nominatim",
        latitude: Number(first.lat),
        longitude: Number(first.lon),
      };
    } catch {
      return null;
    }
  }

  return null;
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
    try {
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
    } catch {
      return null;
    }
  }

  return null;
}
