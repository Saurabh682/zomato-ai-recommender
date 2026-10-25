import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RestaurantRecommendation } from "../types";
import { getRestaurantCoords } from "../lib/bangaloreLocations";
import { getCuisinePhoto } from "../lib/cuisinePhotos";

interface Props {
  recommendations: RestaurantRecommendation[];
  selectedRank?: number | null;
  onSelectRank?: (rank: number) => void;
}

const toSlug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-");

export function BangaloreMapView({ recommendations }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map once
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [12.9716, 77.5946],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      // Add zoom control at bottom-right
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Dark Matter CartoDB tiles for Cyber-Gourmet Obsidian theme
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: "abcd",
        }
      ).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (recommendations.length === 0) return;

    const latLngs: L.LatLngTuple[] = [];

    recommendations.forEach((r, idx) => {
      const rank = idx + 1;
      const coords = getRestaurantCoords(r.location, r.name);
      latLngs.push(coords);

      const isTopMatch = rank === 1;
      const isTop3 = rank <= 3;
      const pinColor = isTopMatch
        ? "#FF334B"
        : isTop3
        ? "#FF8A00"
        : "#3B82F6";

      const photoUrl = getCuisinePhoto(r.cuisine, r.name);
      const zomatoUrl = `https://www.zomato.com/bangalore/${toSlug(r.name)}-${toSlug(r.location)}/info`;

      // Custom pulsing glowing ember pin
      const iconHtml = `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; inset: 0; border-radius: 9999px; background: ${pinColor}; opacity: 0.35; filter: blur(4px); transform: scale(1.3);"></div>
          <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background: #0E1017; border: 2px solid ${pinColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.7);">
            <span style="font-size: 11px; font-weight: 800; color: #FFFFFF; font-family: monospace;">#${rank}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-leaflet-pin",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      });

      const popupHtml = `
        <div style="width: 240px; background: #141620; border-radius: 12px; overflow: hidden; font-family: system-ui, sans-serif; color: #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.8);">
          <div style="height: 100px; width: 100%; position: relative; overflow: hidden; background: #090A0F;">
            <img src="${photoUrl}" alt="${r.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80'" />
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, #141620 10%, transparent 90%);"></div>
            <div style="position: absolute; top: 8px; left: 8px; background: ${pinColor}; color: #000; font-weight: 800; font-size: 10px; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">
              #${rank} Pick
            </div>
            <div style="position: absolute; bottom: 6px; right: 8px; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); color: #F59E0B; font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 6px;">
              ★ ${r.rating.toFixed(1)}
            </div>
          </div>
          <div style="padding: 12px;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.name}</h4>
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #FF8A00; font-weight: 500;">${r.cuisine}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #232738; padding-top: 8px; margin-bottom: 10px;">
              <span>📍 ${r.location}</span>
              <span style="color: #34d399; font-weight: 600;">₹${r.cost_for_two}</span>
            </div>
            <a href="${zomatoUrl}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; text-align: center; padding: 6px 0; background: linear-gradient(to right, #FF334B, #FF5E3A); color: #ffffff; text-decoration: none; border-radius: 9999px; font-size: 11px; font-weight: 600; box-shadow: 0 2px 10px rgba(255, 51, 75, 0.35);">
              Explore on Zomato ↗
            </a>
          </div>
        </div>
      `;

      const marker = L.marker(coords, { icon: customIcon });
      marker.bindPopup(popupHtml, {
        maxWidth: 260,
        className: "custom-dark-popup",
      });
      markersGroup.addLayer(marker);
    });

    // Auto-fit map bounds around plotted restaurants
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [recommendations]);

  // Teardown map on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative rounded-2xl border border-[#232738] bg-[#141620] overflow-hidden shadow-2xl">
      {/* Top Map Header Ribbon */}
      <div className="p-3.5 px-4 bg-[#0E1017] border-b border-[#232738] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FF334B] animate-pulse" />
          <span className="font-bold text-white tracking-wide">
            Bangalore Culinary Topography
          </span>
          <span className="text-slate-400">
            ({recommendations.length} venues mapped)
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF334B]" /> #1 Top Pick
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF8A00]" /> Top 3
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" /> Curated
          </span>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-[460px] bg-[#090A0F] cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
