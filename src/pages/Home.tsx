import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MapComponent from "@/components/MapComponent";
import EncontreTab from "@/components/EncontreTab";
import VoceTab from "@/components/VoceTab";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, LocateFixed, Loader2 } from "lucide-react";
import { getCoordinates, getNearbyPlaces, getAddressFromCoords } from "@/lib/api";
import { useListProfessionals, getListProfessionalsQueryKey, Professional } from "@workspace/api-client-react";
import ProfessionalProfile from "@/components/ProfessionalProfile";

const RADIUS_OPTIONS = [
  { label: "100m",  meters: 100,   km: 0.1, zoom: 17 },
  { label: "1km",   meters: 1000,  km: 1,   zoom: 15 },
  { label: "2km",   meters: 2000,  km: 2,   zoom: 14 },
  { label: "3km",   meters: 3000,  km: 3,   zoom: 13 },
  { label: "10km",  meters: 10000, km: 10,  zoom: 12 },
];

export default function Home() {
  const DEFAULT_LOCATION = { lat: -23.5505, lng: -46.6333 }; // São Paulo
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number }>(DEFAULT_LOCATION);
  const [locating, setLocating] = useState(false);
  const [gpsDetecting, setGpsDetecting] = useState(true);
  const [activeTab, setActiveTab] = useState("encontre");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | number | null>(null);
  const [radiusIdx, setRadiusIdx] = useState(0); // default 100m
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [editModeOpen, setEditModeOpen] = useState(false);
  const queryClient = useQueryClient();

  const radius = RADIUS_OPTIONS[radiusIdx];

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsDetecting(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        const addr = await getAddressFromCoords(coords.lat, coords.lng);
        if (addr) setAddress(addr);
        setGpsDetecting(false);
      },
      () => {
        setGpsDetecting(false);
      },
      { timeout: 5000 }
    );
  }, []);

  const { data: overpassPlaces = [], isLoading: isLoadingPlaces } = useQuery({
    queryKey: ["overpass", location.lat, location.lng, radius.meters],
    queryFn: () => getNearbyPlaces(location.lat, location.lng, radius.meters),
  });

  const { data: professionals = [] } = useListProfessionals(
    { lat: location.lat, lng: location.lng, radiusKm: radius.km },
    { query: { queryKey: getListProfessionalsQueryKey({ lat: location.lat, lng: location.lng, radiusKm: radius.km }) } }
  );

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    try {
      const coords = await getCoordinates(address);
      if (coords) {
        setLocation(coords);
        const resolved = await getAddressFromCoords(coords.lat, coords.lng);
        if (resolved) setAddress(resolved);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        const addr = await getAddressFromCoords(coords.lat, coords.lng);
        if (addr) setAddress(addr);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 5000 }
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans">
      <header className="bg-primary text-primary-foreground p-6 shadow-md z-10 relative">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-extrabold tracking-tight mb-4">PERTO DE MIM</h1>
          <form onSubmit={handleAddressSubmit}>
            <label htmlFor="address-input" className="block text-sm font-semibold mb-2 opacity-90">
              ONDE VOCÊ ESTÁ?
            </label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  id="address-input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro ou cidade..."
                  className="pl-10 bg-white text-black border-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm"
                />
              </div>
              <Button type="submit" variant="secondary" className="font-bold">Buscar</Button>
              <Button type="button" variant="secondary" onClick={handleUseMyLocation} disabled={locating || gpsDetecting} className="px-3" title="Usar minha localização">
                {(locating || gpsDetecting) ? <Loader2 className="w-5 h-5 animate-spin" /> : <LocateFixed className="w-5 h-5" />}
              </Button>
            </div>
          </form>

          {/* Radius selector */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold opacity-80">Raio de busca:</span>
            {RADIUS_OPTIONS.map((opt, idx) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setRadiusIdx(idx)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                  idx === radiusIdx
                    ? "bg-white text-primary border-white shadow"
                    : "bg-primary/20 text-primary-foreground border-white/30 hover:bg-white/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row w-full max-w-7xl mx-auto bg-card shadow-xl overflow-hidden md:my-6 md:rounded-2xl">
        <div className="w-full md:w-1/2 h-[400px] md:h-auto min-h-[400px] relative border-b md:border-b-0 md:border-r border-border">
          <MapComponent
            location={location}
            zoom={radius.zoom}
            places={overpassPlaces}
            professionals={professionals}
            selectedPlaceId={selectedPlaceId}
            onViewProfile={setSelectedProfessional}
          />
        </div>

        <div className="w-full md:w-1/2 flex flex-col min-h-[520px] md:h-full bg-sidebar">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted p-1">
              <TabsTrigger value="encontre" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-sm">ENCONTRE</TabsTrigger>
              <TabsTrigger value="voce" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold text-xs leading-tight">CADASTRAR SERVIÇO</TabsTrigger>
            </TabsList>
            <div className="flex-grow overflow-y-auto p-4 md:p-6">
              <TabsContent value="encontre" className="m-0 h-full">
                <EncontreTab
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  places={overpassPlaces}
                  professionals={professionals}
                  onSelectPlace={(id) => setSelectedPlaceId(id)}
                  onViewProfile={setSelectedProfessional}
                  userLocation={location}
                  isLoadingPlaces={isLoadingPlaces}
                  radiusKm={radius.km}
                  radiusIdx={radiusIdx}
                  setRadiusIdx={setRadiusIdx}
                />
              </TabsContent>
              <TabsContent value="voce" className="m-0 h-full">
                <VoceTab
                  userLocation={location}
                  professionals={professionals}
                  onEditProfile={(prof) => {
                    setSelectedProfessional(prof);
                    setEditModeOpen(true);
                  }}
                  onAdded={() => {
                    queryClient.invalidateQueries({ queryKey: getListProfessionalsQueryKey({ lat: location.lat, lng: location.lng, radiusKm: radius.km }) });
                  }}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {selectedProfessional && (
        <ProfessionalProfile
          professional={selectedProfessional}
          defaultEditing={editModeOpen}
          onClose={() => { setSelectedProfessional(null); setEditModeOpen(false); }}
        />
      )}
    </div>
  );
}
