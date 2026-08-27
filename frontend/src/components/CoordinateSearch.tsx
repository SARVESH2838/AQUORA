import {
  useEffect,
  useState,
} from "react";

import {
  LocateFixed,
} from "lucide-react";

import type {
  SelectedLocation,
} from "../pages/Explore";


interface CoordinateSearchProps {
  onSearch: (
    location: SelectedLocation
  ) => void;

  selectedLocation:
    SelectedLocation | null;
}


function CoordinateSearch({
  onSearch,
  selectedLocation,
}: CoordinateSearchProps) {
  const [latitude, setLatitude] =
    useState("");

  const [longitude, setLongitude] =
    useState("");

  const [error, setError] =
    useState("");


  // Globe click automatically updates
  // search coordinates.
  useEffect(() => {
    if (!selectedLocation) return;

    setLatitude(
      selectedLocation.latitude.toFixed(4)
    );

    setLongitude(
      selectedLocation.longitude.toFixed(4)
    );
  }, [selectedLocation]);


  const locatePosition = () => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      latitude.trim() === "" ||
      longitude.trim() === "" ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      setError(
        "Enter valid coordinates."
      );

      return;
    }

    if (lat < -90 || lat > 90) {
      setError(
        "Latitude must be between -90 and 90."
      );

      return;
    }

    if (lng < -180 || lng > 180) {
      setError(
        "Longitude must be between -180 and 180."
      );

      return;
    }

    setError("");

    onSearch({
      latitude: lat,
      longitude: lng,
    });
  };


  const handleKeyDown = (
    event:
      React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter") {
      locatePosition();
    }
  };


  return (
    <div className="coordinate-search-wrapper">

      <div className="coordinate-search">

        <input
          type="number"
          placeholder="Latitude"
          value={latitude}
          onChange={(e) =>
            setLatitude(e.target.value)
          }
          onKeyDown={handleKeyDown}
        />

        <div className="search-divider" />

        <input
          type="number"
          placeholder="Longitude"
          value={longitude}
          onChange={(e) =>
            setLongitude(e.target.value)
          }
          onKeyDown={handleKeyDown}
        />

        <button
          onClick={locatePosition}
        >
          <LocateFixed size={18} />
          <span>Locate</span>
        </button>

      </div>

      {error && (
        <div className="search-error">
          {error}
        </div>
      )}

    </div>
  );
}

export default CoordinateSearch;