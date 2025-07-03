
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Report } from '@/pages/Index';

// Configuração dos ícones do Leaflet
const createCustomIcon = (category: string) => {
  const colors = {
    buraco: '#ef4444', // red
    iluminacao: '#f59e0b', // amber
    bueiro: '#06b6d4', // cyan
    calcada: '#8b5cf6', // violet
    sinalizacao: '#f97316', // orange
    outros: '#6b7280' // gray
  };

  const color = colors[category as keyof typeof colors] || colors.outros;

  return divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: 'custom-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

interface MapViewProps {
  reports: Report[];
  onReportClick: (report: Report) => void;
}

export const MapView = ({ reports, onReportClick }: MapViewProps) => {
  const mapRef = useRef<any>(null);

  // Coordenadas do centro de Ponta Grossa
  const pontaGrossaCenter: [number, number] = [-25.0916, -50.1668];

  useEffect(() => {
    // Fix para os ícones padrão do Leaflet não carregarem
    delete (Icon.Default.prototype as any)._getIconUrl;
    Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  const getCategoryLabel = (category: string) => {
    const labels = {
      buraco: 'Buraco',
      iluminacao: 'Iluminação',
      bueiro: 'Bueiro',
      calcada: 'Calçada',
      sinalizacao: 'Sinalização',
      outros: 'Outros'
    };
    return labels[category as keyof typeof labels] || 'Outros';
  };

  return (
    <MapContainer
      center={pontaGrossaCenter}
      zoom={13}
      className="h-full w-full"
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={createCustomIcon(report.category)}
          eventHandlers={{
            click: () => onReportClick(report)
          }}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
              <p className="text-xs text-muted-foreground mb-2">
                {getCategoryLabel(report.category)}
              </p>
              <p className="text-xs">{report.description}</p>
              {report.image_urls?.[0] && (
                <img 
                  src={report.image_urls[0]} 
                  alt="Foto do problema"
                  className="w-full h-20 object-cover rounded mt-2"
                />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Por: {report.user_name}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};
