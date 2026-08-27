import { useEffect, useRef } from "react";
import type { ArgoProfile } from "../services/oceanApi";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

import type { SelectedLocation } from "../pages/Explore";

interface GlobeMapProps {
  searchLocation: SelectedLocation | null;

  selectedLocation: SelectedLocation | null;

  onLocationSelect: (location: SelectedLocation) => void;

  argoProfiles: ArgoProfile[];

  selectedArgo: ArgoProfile | null;

  onArgoSelect: (profile: ArgoProfile) => void;
}

function GlobeMap({
  searchLocation,
  selectedLocation,
  onLocationSelect,

  argoProfiles,
  onArgoSelect,
}: GlobeMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<MapLibreMap | null>(null);

  const markerRef = useRef<Marker | null>(null);

  const argoMarkersRef = useRef<Marker[]>([]);

  /* ----------------------------------
     INITIALIZE MAP
  ---------------------------------- */

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) {
      return;
    }

    const map = new MapLibreMap({
      container: mapContainer.current,

      style: {
        version: 8,

        sources: {
          satellite: {
            type: "raster",

            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],

            tileSize: 256,

            attribution: "Tiles © Esri",
          },
        },

        layers: [
          {
            id: "satellite",

            type: "raster",

            source: "satellite",

            minzoom: 1.2,

            maxzoom: 12,
          },
        ],
      },

      center: [80, 15],

      zoom: 2.0,

      pitch: 0,

      bearing: 0,

    });

    mapRef.current = map;

    /* Enable real globe projection */

    map.on("style.load", () => {
      map.setProjection({
        type: "globe",
      });
    });

    /* Zoom controls */

    map.addControl(
      new NavigationControl({
        visualizePitch: true,
      }),
      "bottom-right",
    );

    /* Click anywhere → get coordinates */

    map.on("click", (event) => {
      const longitude = event.lngLat.lng;
      const latitude = event.lngLat.lat;

      onLocationSelect({
        latitude,
        longitude,
      });
    });

    return () => {
      markerRef.current?.remove();

      map.remove();

      mapRef.current = null;
    };
  }, [onLocationSelect]);

  /* ----------------------------------
     SEARCH COORDINATES
  ---------------------------------- */

  useEffect(() => {
    if (!mapRef.current || !searchLocation) {
      return;
    }

    const map = mapRef.current;

    map.flyTo({
      center: [searchLocation.longitude, searchLocation.latitude],

      zoom: 5,

      speed: 1.2,

      curve: 1.4,

      essential: true,
    });

    onLocationSelect(searchLocation);
  }, [searchLocation, onLocationSelect]);

  /* ----------------------------------
     MARKER
  ---------------------------------- */

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    if (!selectedLocation) {
      markerRef.current?.remove();

      markerRef.current = null;

      return;
    }

    if (!markerRef.current) {
      const markerElement = document.createElement("div");

      markerElement.className = "aquora-marker";

      markerElement.innerHTML = `
        <div class="marker-pulse"></div>
        <div class="marker-dot"></div>
      `;

      markerRef.current = new Marker({
        element: markerElement,
        anchor: "center",
      })
        .setLngLat([selectedLocation.longitude, selectedLocation.latitude])
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([
        selectedLocation.longitude,
        selectedLocation.latitude,
      ]);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    // Remove previous Argo markers
    argoMarkersRef.current.forEach((marker) => marker.remove());

    argoMarkersRef.current = [];

    argoProfiles.forEach((profile) => {
      const element = document.createElement("button");

      element.className = "argo-marker";

      element.title = `Argo ${profile.platform ?? profile.id}`;

      element.innerHTML = `
        <span></span>
      `;

      // Prevent map click from
      // selecting the marker coordinates
      // as a normal location.
      element.addEventListener("click", (event) => {
        event.stopPropagation();

        onArgoSelect(profile);
      });

      const marker = new Marker({
        element,
        anchor: "center",
      })
        .setLngLat([profile.longitude, profile.latitude])
        .addTo(mapRef.current!);

      argoMarkersRef.current.push(marker);
    });

    return () => {
      argoMarkersRef.current.forEach((marker) => marker.remove());

      argoMarkersRef.current = [];
    };
  }, [argoProfiles, onArgoSelect]);

  return (
    <section className="globe-wrapper">
      <div ref={mapContainer} className="globe-map" />

      <div className="map-hint">
        Drag to rotate
        <span>•</span>
        Scroll to zoom
        <span>•</span>
        Click to select
      </div>
    </section>
  );
}

export default GlobeMap;
