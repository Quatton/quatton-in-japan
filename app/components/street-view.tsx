import { Button } from "@mantine/core";
import { useInterval, useLocalStorage } from "@mantine/hooks";
import { useCallback, useEffect, useRef, useState } from "react";

const ZOOM_LEVEL = 14;
const TOKYO = { lat: 35.709, lng: 139.732 };
const TIME_LIMIT = 120;

export function StreetView() {
  const map = useRef<google.maps.Map>();
  const marker = useRef<google.maps.marker.AdvancedMarkerElement>();
  const actualMarker = useRef<google.maps.marker.AdvancedMarkerElement>();
  const line = useRef<google.maps.Polyline>();

  const [time, setTime] = useState(TIME_LIMIT);

  const { start, stop } = useInterval(() => {
    setTime((time) => time - 1);
    if (time == 0) {
      setMapPinPosition(TOKYO);
      showGuessResult();
    }
  }, 1000);

  const distanceMarker = useRef<google.maps.marker.AdvancedMarkerElement>();

  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");

  const [mapPinPosition, setMapPinPosition] = useState<{
    lat: number;
    lng: number;
  }>();

  const [currentPosition, setCurrentPosition] = useLocalStorage<{
    lat: number;
    lng: number;
  }>({
    key: "currentPosition",
  });

  const drawPano = ({ lat, lng }: { lat: number; lng: number }) => {
    const panorama = new google.maps.StreetViewPanorama(
      document.getElementById("pano") as HTMLElement,
      {
        position: { lat, lng },
        addressControl: false,
        showRoadLabels: false,
      },
    );
  };

  const getValidCoords = async () => {
    if (!map.current) {
      return undefined;
    }

    const left = 139.612872;
    const top = 35.779186;

    const bottom = 35.588648;
    const right = 139.829753;

    const lat = top + Math.random() * (bottom - top);
    const lng = left + Math.random() * (right - left);

    const sv = new google.maps.StreetViewService();
    const place = new google.maps.places.PlacesService(map.current);

    // find nearest station

    const stations = await new Promise<google.maps.places.PlaceResult[]>(
      (res) => {
        place.nearbySearch(
          {
            location: { lat, lng },
            radius: 500,
            type: "train_station",
          },
          (results, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              results != null
            ) {
              res(results);
            } else {
              res([]);
            }
          },
        );
      },
    );

    if (stations.length === 0 || stations[0].geometry === undefined) {
      return undefined;
    }

    const {
      data: { location },
    } = await sv.getPanorama({
      location: stations[0].geometry.location,
      radius: 500,
    });

    if (location?.latLng) {
      return { lat, lng };
    }
  };

  const handleRandom = useCallback(async () => {
    stop();
    setTime(TIME_LIMIT);

    setCompleted(false);
    setGuessMode(false);
    if (actualMarker.current) {
      actualMarker.current.map = null;
    }
    line.current?.setMap(null);
    if (distanceMarker.current) {
      distanceMarker.current.map = null;
    }

    map.current?.setCenter(TOKYO);
    map.current?.setZoom(ZOOM_LEVEL);
    setMapPinPosition(undefined);
    if (marker.current) {
      marker.current.position = TOKYO;
    }

    let data = await getValidCoords();

    if (!data) {
      setMessage("No panorama found, retrying...");
      let retries = 3;

      while (retries > 0) {
        const _data = await getValidCoords();
        if (_data) {
          data = _data;
          setMessage("");
          break;
        }
        retries--;
      }

      if (!data) {
        setMessage("No panorama found, please try again later.");
        return;
      }
    }

    const { lat, lng } = data;

    setCurrentPosition({ lat, lng });

    start();
  }, [setCurrentPosition, stop, start]);

  const [guessMode, setGuessMode] = useState(false);

  useEffect(() => {
    if (currentPosition) {
      drawPano(currentPosition);
    }
  }, [currentPosition]);

  const handleMapOnClick = useCallback(
    (e: google.maps.KmlMouseEvent) => {
      if (!guessMode || !e.latLng || !map.current) {
        return;
      }

      const position = e.latLng.toJSON();
      setMapPinPosition(position);

      if (marker.current) {
        marker.current.position = position;
      }
    },
    [guessMode],
  );

  useEffect(() => {
    map.current = new google.maps.Map(
      document.getElementById("map") as HTMLElement,
      {
        center: TOKYO,
        zoom: ZOOM_LEVEL,
        mapId: "f6a502f44d6b0b6e",
        disableDefaultUI: true,
        clickableIcons: false,
      },
    );

    marker.current = new google.maps.marker.AdvancedMarkerElement({
      map: map.current,
      position: TOKYO,
      gmpDraggable: true,
    });

    marker.current.addListener("dragend", markerDragEnd);

    return () => {
      marker.current?.removeEventListener("dragend", markerDragEnd);
    };
  }, []);

  useEffect(() => {
    map.current?.addListener("click", handleMapOnClick);
  }, [handleMapOnClick]);

  async function startGuessing() {
    setGuessMode(true);
  }

  const markerDragEnd = () => {
    if (!marker.current) {
      return;
    }
    const position = marker.current.position as google.maps.LatLngLiteral;
    setMapPinPosition({ lat: position.lat, lng: position.lng });
  };

  function showGuessResult() {
    if (completed || !mapPinPosition || !map.current) {
      return;
    }

    setCompleted(true);
    stop();

    actualMarker.current = new google.maps.marker.AdvancedMarkerElement({
      map: map.current,
      position: currentPosition,
      title: "Actual location",
      content: new google.maps.marker.PinElement({
        // yellow
        background: "#FFD700",
      }).element,
    });

    line.current = new google.maps.Polyline({
      path: [currentPosition, mapPinPosition!],
      geodesic: true,
      strokeColor: "#FF0000",
      strokeOpacity: 1.0,
      strokeWeight: 2,
      map: map.current,
    });

    // Calculate distance

    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(currentPosition),
      new google.maps.LatLng(mapPinPosition),
    );

    const textDOM = document.createElement("div");
    textDOM.appendChild(
      document.createTextNode(`Distance: ${Math.floor(distance)}m`),
    );

    textDOM.classList.add("distance-marker");

    const textPin = new google.maps.marker.PinElement({
      glyph: textDOM,
      // calculate scale from distance
      scale: Math.min(1, distance / 1000),
    });

    distanceMarker.current = new google.maps.marker.AdvancedMarkerElement({
      map: map.current,
      position: {
        lat: (currentPosition.lat + mapPinPosition.lat) / 2,
        lng: (currentPosition.lng + mapPinPosition.lng) / 2,
      },
      title: `Distance: ${distance.toFixed(2)}m`,
      content: textPin.element,
    });

    // Display distance

    map.current.setCenter({
      lat: (currentPosition.lat + mapPinPosition.lat) / 2,
      lng: (currentPosition.lng + mapPinPosition.lng) / 2,
    });

    map.current.panToBounds({
      north: Math.max(currentPosition.lat, mapPinPosition.lat),
      south: Math.min(currentPosition.lat, mapPinPosition.lat),
      east: Math.max(currentPosition.lng, mapPinPosition.lng),
      west: Math.min(currentPosition.lng, mapPinPosition.lng),
    });

    // zoom to fit
    map.current.fitBounds(
      {
        north: Math.max(currentPosition.lat, mapPinPosition.lat),
        south: Math.min(currentPosition.lat, mapPinPosition.lat),
        east: Math.max(currentPosition.lng, mapPinPosition.lng),
        west: Math.min(currentPosition.lng, mapPinPosition.lng),
      },
      24,
    );
    // end zoom to fit
  }

  function parseTime(time: number) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`;
  }

  return (
    <div className="w-dvw h-dvh relative" id="pano">
      <div className="absolute top-0 left-0 z-20 text-black p-4 bg-white bg-opacity-50 text-3xl min-w-48 text-center">
        {parseTime(time)}
      </div>

      <div className="absolute bottom-0 left-0 z-20 p-4 bg-white bg-opacity-50">
        <p>{message}</p>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              handleRandom();
            }}
          >
            {completed ? "Retry" : "Random"}
          </Button>
          {!guessMode ? (
            <Button
              type="button"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => {
                startGuessing();
              }}
            >
              Guess
            </Button>
          ) : (
            <>
              <Button
                onClick={() => {
                  setGuessMode(false);
                }}
                variant="outline"
              >
                Close
              </Button>
            </>
          )}
          {!completed && guessMode && (
            <Button
              onClick={() => {
                showGuessResult();
              }}
            >
              Confirm
            </Button>
          )}
        </div>
      </div>
      <div id="map" className="absolute inset-0 z-10" hidden={!guessMode}></div>
    </div>
  );
}
