import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { OverpassPlace } from "@/lib/api";
import { Professional } from "@workspace/api-client-react";

const placeIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-teal.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const profIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function MapController({ location, zoom, selectedPlaceId, places, professionals }: {
  location: { lat: number; lng: number };
  zoom: number;
  selectedPlaceId: string | number | null;
  places: OverpassPlace[];
  professionals: Professional[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPlaceId) {
      const place = places.find(p => p.id === selectedPlaceId);
      if (place) { map.flyTo([place.lat, place.lon], 17); return; }
      const prof = professionals.find(p => p.id === selectedPlaceId);
      if (prof?.lat && prof?.lng) { map.flyTo([prof.lat, prof.lng], 17); return; }
    }
    map.flyTo([location.lat, location.lng], zoom);
  }, [location, zoom, selectedPlaceId, map, places, professionals]);

  return null;
}

export default function MapComponent({ location, zoom, places, professionals, selectedPlaceId, onViewProfile }: {
  location: { lat: number; lng: number };
  zoom: number;
  places: OverpassPlace[];
  professionals: Professional[];
  selectedPlaceId: string | number | null;
  onViewProfile: (prof: Professional) => void;
}) {
  return (
    <MapContainer center={[location.lat, location.lng]} zoom={zoom} className="w-full h-full min-h-[400px] z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController location={location} zoom={zoom} selectedPlaceId={selectedPlaceId} places={places} professionals={professionals} />

      <Marker position={[location.lat, location.lng]} icon={userIcon}>
        <Popup><strong>Você está aqui</strong></Popup>
      </Marker>

      {places.map((place) => (
        <Marker key={`place-${place.id}`} position={[place.lat, place.lon]} icon={placeIcon}>
          <Popup>
            <div className="font-sans">
              <strong className="block text-base mb-1">{place.tags.name || "Local"}</strong>
              <span className="text-sm text-gray-500 capitalize">{place.tags.amenity || place.tags.shop || place.tags.tourism || place.tags.leisure || "Estabelecimento"}</span>
            </div>
          </Popup>
        </Marker>
      ))}

      {professionals.map((prof) =>
        prof.lat && prof.lng ? (
          <Marker key={`prof-${prof.id}`} position={[prof.lat, prof.lng]} icon={profIcon}>
            <Popup>
              <div className="font-sans min-w-[160px]">
                <strong className="block text-base mb-0.5">{prof.name}</strong>
                <div className="flex flex-wrap gap-1 mb-1">
                  {((prof as any).skills?.length ? (prof as any).skills : [prof.profession]).map((s: string) => (
                    <span key={s} className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-medium capitalize">{s}</span>
                  ))}
                </div>
                <span className="inline-block mt-1 mb-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-bold rounded">
                  {prof.level === "profissional" ? "Profissional" : "Amador"}
                </span>
                <button
                  onClick={() => onViewProfile(prof)}
                  className="block w-full text-center mt-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded transition-colors"
                >
                  Ver perfil e avaliações
                </button>
              </div>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
