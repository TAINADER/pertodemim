import { useState, useEffect, useMemo } from "react";
import Fuse from "fuse.js";
import { Input } from "@/components/ui/input";
import { OverpassPlace } from "@/lib/api";
import { Professional } from "@workspace/api-client-react";
import { Search, MapPin, Store, User, Loader2, ChevronRight, ZoomIn, ZoomOut, Star } from "lucide-react";

const RADIUS_OPTIONS = [
  { label: "100m",  meters: 100,   km: 0.1 },
  { label: "1km",   meters: 1000,  km: 1 },
  { label: "2km",   meters: 2000,  km: 2 },
  { label: "3km",   meters: 3000,  km: 3 },
  { label: "10km",  meters: 10000, km: 10 },
];

const TOO_MANY_THRESHOLD = 15;

interface EncontreTabProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  places: OverpassPlace[];
  professionals: Professional[];
  onSelectPlace: (id: string | number) => void;
  onViewProfile: (prof: Professional) => void;
  userLocation: { lat: number; lng: number };
  isLoadingPlaces?: boolean;
  radiusKm: number;
  radiusIdx: number;
  setRadiusIdx: (idx: number) => void;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function fmtRadius(km: number) {
  return km < 1 ? `${km * 1000}m` : `${km}km`;
}

export default function EncontreTab({
  searchQuery, setSearchQuery, places, professionals,
  onSelectPlace, onViewProfile, userLocation, isLoadingPlaces,
  radiusKm, radiusIdx, setRadiusIdx
}: EncontreTabProps) {
  const debouncedSearch = useDebounce(searchQuery, 300);

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const profFuse = useMemo(() => new Fuse(professionals, {
    keys: ["name", "profession", "professionDetail", "skills"],
    threshold: 0.35,
    ignoreLocation: true,
  }), [professionals]);

  const filteredPlaces = places.filter(p => {
    if (!debouncedSearch) return true;
    const name = norm(p.tags.name || "");
    const type = norm(p.tags.amenity || p.tags.shop || p.tags.tourism || p.tags.leisure || "");
    const query = norm(debouncedSearch);
    return name.includes(query) || type.includes(query);
  });

  const filteredProfessionals = useMemo(() => {
    if (!debouncedSearch) return professionals;
    return profFuse.search(debouncedSearch).map(r => r.item);
  }, [debouncedSearch, professionals, profFuse]);

  type ListItem = {
    id: string | number;
    name: string;
    type: string;
    distance: number;
    kind: "place" | "professional";
  };

  const listItems: ListItem[] = [
    ...filteredPlaces
      .map(p => ({
        id: p.id,
        name: p.tags.name || "Local",
        type: p.tags.amenity || p.tags.shop || p.tags.tourism || p.tags.leisure || "Estabelecimento",
        distance: calculateDistance(userLocation.lat, userLocation.lng, p.lat, p.lon),
        kind: "place" as const
      }))
      .filter(p => p.distance <= radiusKm),
    ...filteredProfessionals
      .filter(p => p.lat != null && p.lng != null)
      .map(p => ({
        id: p.id,
        name: p.profession + (p.professionDetail ? ` · ${p.professionDetail}` : ""),
        type: p.name,
        distance: calculateDistance(userLocation.lat, userLocation.lng, p.lat!, p.lng!),
        kind: "professional" as const
      }))
      .filter(p => p.distance <= radiusKm)
  ].sort((a, b) => a.distance - b.distance);

  const isEmpty = !isLoadingPlaces && listItems.length === 0;
  const isTooMany = !isLoadingPlaces && listItems.length > TOO_MANY_THRESHOLD;
  const canExpand = radiusIdx < RADIUS_OPTIONS.length - 1;
  const canShrink = radiusIdx > 0;

  return (
    <div className="flex flex-col h-full space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="O que você está procurando?"
          className="pl-10 h-12 bg-background border-border shadow-sm text-base"
        />
      </div>

      <div className="flex-grow overflow-y-auto pr-1 space-y-3">
        {isLoadingPlaces ? (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Carregando estabelecimentos próximos...</p>
          </div>

        ) : isEmpty ? (
          <div className="flex flex-col items-center text-center py-10 gap-4">
            <p className="font-semibold text-muted-foreground">
              Nada encontrado nos {fmtRadius(radiusKm)} ao redor.
            </p>
            {canExpand && (
              <div className="w-full bg-muted/50 border border-border rounded-xl p-4">
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1">
                  <ZoomOut className="w-4 h-4" />
                  Quer ampliar o raio de busca?
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {RADIUS_OPTIONS.slice(radiusIdx + 1).map((opt, i) => (
                    <button
                      key={opt.label}
                      onClick={() => setRadiusIdx(radiusIdx + 1 + i)}
                      className="flex items-center gap-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-semibold rounded-full border border-border transition-all"
                    >
                      Ampliar para {opt.label}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        ) : (
          <>
            {isTooMany && canShrink && (
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-teal-800">
                  <ZoomIn className="w-4 h-4 shrink-0" />
                  <p className="text-xs font-semibold">
                    {listItems.length} resultados — quer ver só os mais próximos?
                  </p>
                </div>
                <button
                  onClick={() => setRadiusIdx(radiusIdx - 1)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-full transition-all"
                >
                  Diminuir para {RADIUS_OPTIONS[radiusIdx - 1].label}
                </button>
              </div>
            )}

            {listItems.map(item => {
              const prof = item.kind === "professional"
                ? professionals.find(p => p.id === item.id)
                : null;

              return (
                <button
                  key={`${item.kind}-${item.id}`}
                  onClick={() => {
                    if (prof) {
                      onViewProfile(prof);
                    } else {
                      onSelectPlace(item.id);
                    }
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md flex items-start gap-4 ${
                    item.kind === 'professional'
                      ? 'bg-teal-50 hover:bg-teal-100 border-teal-200'
                      : 'bg-background hover:bg-muted/50 border-border'
                  }`}
                >
                  <div className={`p-3 rounded-full ${item.kind === 'professional' ? 'bg-teal-200 text-teal-800' : 'bg-primary/10 text-primary'}`}>
                    {item.kind === 'professional' ? <User className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-bold text-base leading-tight text-foreground">{item.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize mt-0.5">{item.type}</p>
                    {item.kind === 'professional' && (
                      <span className="inline-flex items-center gap-1 mt-1 text-xs text-teal-700 font-semibold">
                        <Star className="w-3 h-3" /> Ver perfil e avaliações
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded shrink-0">
                    <MapPin className="w-3 h-3" />
                    <span>
                      {item.distance < 1 ? `${Math.round(item.distance * 1000)}m` : `${item.distance.toFixed(1)}km`}
                    </span>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
