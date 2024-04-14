import { Button } from "@mantine/core";
import { useLocalStorage, useMove } from "@mantine/hooks";
import { IconFlag, IconMapPin2 } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function StreetView() {
  const [map, setMap] = useState<google.maps.Map>();
  const [mapPinPosition, setMapPinPosition] = useState<{
    lat: number;
    lng: number;
  }>();
  const [marker, setMarker] =
    useState<google.maps.marker.AdvancedMarkerElement>();

  const [completed, setCompleted] = useState(false);
  const [message, setMessage] = useState("");
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
      }
    );
  };

  const getValidCoords = async () => {
    const left = 139.612872;
    const top = 35.779186;

    const bottom = 35.588648;
    const right = 139.829753;

    const lat = top + Math.random() * (bottom - top);
    const lng = left + Math.random() * (right - left);

    const sv = new google.maps.StreetViewService();

    const { data } = await sv.getPanorama({
      location: { lat, lng },
      radius: 500,
    });

    if (data.location?.latLng) {
      return { lat, lng };
    }
  };

  const handleRandom = useCallback(async () => {
    setCompleted(false);
    setGuessMode(false);
    setMapPinPosition(undefined);
    let data = await getValidCoords();

    if (!data) {
      setMessage("No panorama found, retrying...");
      let retries = 3;

      while (retries > 0) {
        const _data = await getValidCoords();
        if (_data) {
          data = _data;
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
  }, [setCurrentPosition]);

  const [guessMode, setGuessMode] = useState(false);

  useEffect(() => {
    if (currentPosition) {
      drawPano(currentPosition);
    }
  }, [currentPosition]);

  const handleMapOnClick = useCallback(
    (e: google.maps.KmlMouseEvent) => {
      if (!guessMode || !e.latLng || !map) {
        return;
      }

      const position = e.latLng.toJSON();
      setMapPinPosition(position);

      if (marker) {
        marker.map = null;
      }

      const _marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position,
        gmpDraggable: true,
      });

      setMarker(_marker);
    },
    [guessMode, map, marker]
  );

  useEffect(() => {
    const map = new google.maps.Map(
      document.getElementById("map") as HTMLElement,
      {
        center: { lat: 35.709, lng: 139.732 },
        zoom: 12,
        mapId: "f6a502f44d6b0b6e",
        disableDefaultUI: true,
        clickableIcons: false,
      }
    );

    map.addListener("click", handleMapOnClick);
    setMap(map);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startGuessing() {
    setGuessMode(true);

    if (marker) {
      marker.map = null;
    }

    const _marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: mapPinPosition ?? { lat: 35.709, lng: 139.732 },
      gmpDraggable: true,
    });

    setMarker(_marker);
  }

  const markerDragEnd = useCallback(() => {
    const position = marker?.position as google.maps.LatLngLiteral;
    setMapPinPosition({ lat: position.lat, lng: position.lng });
  }, [marker]);

  function showGuessResult() {
    if (completed || !mapPinPosition) {
      return;
    }

    setCompleted(true);

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      position: currentPosition,
      title: "Actual location",
      content: new google.maps.marker.PinElement({
        // yellow
        background: "#FFD700",
      }).element,
    });

    const linePath = new google.maps.Polyline({
      path: [currentPosition, mapPinPosition!],
      geodesic: true,
      strokeColor: "#FF0000",
      strokeOpacity: 1.0,
      strokeWeight: 2,
      map,
    });
  }

  useEffect(() => {
    marker?.addListener("dragend", markerDragEnd);
    return () => {
      marker?.removeEventListener("dragend", markerDragEnd);
    };
  }, [marker, markerDragEnd]);

  return (
    <div className="w-dvw h-dvh relative" id="pano">
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
