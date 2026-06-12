export interface OverpassPlace {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags: {
    name?: string;
    amenity?: string;
    shop?: string;
    tourism?: string;
    leisure?: string;
    [key: string]: string | undefined;
  };
}

const CEP_REGEX = /^\d{5}-?\d{3}$/;

async function resolveCep(cep: string): Promise<string | null> {
  try {
    const clean = cep.replace(/\D/g, "");
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = await res.json();
    if (data.erro) return null;
    const parts = [data.logradouro, data.bairro, data.localidade, data.uf, "Brasil"].filter(Boolean);
    return parts.join(", ");
  } catch {
    return null;
  }
}

export interface AddressSuggestion {
  displayName: string;
  lat: number;
  lng: number;
}

export async function searchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  try {
    let q = query.trim();
    if (CEP_REGEX.test(q)) {
      const resolved = await resolveCep(q);
      if (resolved) q = resolved;
    }
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=br&addressdetails=1`,
      { headers: { "Accept-Language": "pt-BR" } }
    );
    const data = await res.json();
    return (data || []).map((item: any) => {
      const a = item.address ?? {};
      const parts = [
        a.road || a.pedestrian || a.footway || a.suburb,
        a.house_number,
        a.suburb || a.neighbourhood || a.quarter,
        a.city || a.town || a.village || a.municipality,
        a.state,
      ].filter(Boolean);
      const label = parts.length >= 2 ? parts.join(", ") : item.display_name;
      return { displayName: label, lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
    });
  } catch {
    return [];
  }
}

export async function getCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    let query = address.trim();

    if (CEP_REGEX.test(query)) {
      const resolved = await resolveCep(query);
      if (resolved) query = resolved;
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.error("Geocoding error:", err);
  }
  return null;
}

export async function getAddressFromCoords(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    const data = await res.json();
    if (data && data.display_name) {
      const a = data.address;
      const parts = [
        a.road || a.pedestrian || a.footway,
        a.house_number,
        a.suburb || a.neighbourhood || a.quarter,
        a.city || a.town || a.village || a.municipality,
        a.state,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : data.display_name;
    }
  } catch (err) {
    console.error("Reverse geocoding error:", err);
  }
  return null;
}

export async function getNearbyPlaces(lat: number, lng: number, radiusMeters = 3000): Promise<OverpassPlace[]> {
  const r = radiusMeters;
  const query = `
    [out:json][timeout:30];
    (
      node["amenity"](around:${r},${lat},${lng});
      node["shop"](around:${r},${lat},${lng});
      node["tourism"](around:${r},${lat},${lng});
      node["leisure"](around:${r},${lat},${lng});
    );
    out body;
  `;
  
  try {
    const res = await fetch(`https://overpass-api.de/api/interpreter`, {
      method: "POST",
      body: query
    });
    const data = await res.json();
    return data.elements || [];
  } catch (err) {
    console.error("Overpass error:", err);
    return [];
  }
}
