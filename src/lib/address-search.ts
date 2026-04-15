import { env } from "@/lib/env";

export type AddressSuggestion = {
  label: string;
  latitude: number;
  longitude: number;
};

export async function searchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  if (!env.POINTER_MAPBOX_ACCESS_TOKEN || !query.trim()) {
    return [];
  }

  const params = new URLSearchParams({
    q: query.trim(),
    access_token: env.POINTER_MAPBOX_ACCESS_TOKEN,
    autocomplete: "true",
    limit: "5",
    language: "pt-BR",
    country: "BR",
    types: "address,street",
  });

  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    features?: Array<{
      geometry?: { coordinates?: [number, number] };
      properties?: {
        full_address?: string;
        name?: string;
        place_formatted?: string;
      };
    }>;
  };

  return (payload.features ?? [])
    .map((feature) => {
      const coordinates = feature.geometry?.coordinates;

      if (!coordinates || coordinates.length < 2) {
        return null;
      }

      const [longitude, latitude] = coordinates;
      const label =
        feature.properties?.full_address ??
        [feature.properties?.name, feature.properties?.place_formatted].filter(Boolean).join(", ");

      if (!label) {
        return null;
      }

      return {
        label,
        latitude,
        longitude,
      };
    })
    .filter((item): item is AddressSuggestion => Boolean(item));
}
