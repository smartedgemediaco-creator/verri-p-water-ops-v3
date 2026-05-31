export interface Suggestion {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
}

const BASE_URL = "https://api.locationiq.com/v1";

export async function autocomplete(query: string): Promise<Suggestion[]> {
  const key = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
  if (!key || query.length < 3) return [];

  try {
    const url = `${BASE_URL}/autocomplete?key=${key}&q=${encodeURIComponent(query)}&countrycodes=ng&limit=5&dedup=1&format=json`;

    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: Record<string, unknown>) => ({
      placeId: String(item.place_id ?? ""),
      address: String(item.display_name ?? ""),
      lat: parseFloat(String(item.lat ?? "0")),
      lng: parseFloat(String(item.lon ?? "0")),
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ address: string; placeId: string } | null> {
  const key = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
  if (!key) return null;

  try {
    const url = `${BASE_URL}/reverse?key=${key}&lat=${lat}&lon=${lng}&format=json&zoom=18`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, unknown>;
    if (!data || !data.display_name) return null;

    return {
      address: String(data.display_name),
      placeId: String(data.place_id ?? ""),
    };
  } catch {
    return null;
  }
}
