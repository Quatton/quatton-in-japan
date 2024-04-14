import { useCallback, useEffect, useState } from "react";

export function StreetView() {
  const [message, setMessage] = useState("");

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

  const handleRandom = async () => {
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

    const panorama = new google.maps.StreetViewPanorama(
      document.getElementById("pano") as HTMLElement,
      {
        position: { lat, lng },
        addressControl: false,
      }
    );
  };

  const [guessMode, setGuessMode] = useState(false);

  function startGuessing() {
    setGuessMode(true);
    const map = new google.maps.Map(
      document.getElementById("map") as HTMLElement,
      {
        center: { lat: 35.709, lng: 139.732 },
        zoom: 12,
      }
    );
  }

  return (
    <div className="w-dvw h-dvh relative" id="pano">
      <div className="absolute bottom-0 left-0 z-10 p-4 bg-white bg-opacity-50">
        <p>{message}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              handleRandom();
            }}
          >
            Random
          </button>
          <button
            type="button"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              startGuessing();
            }}
          >
            Guess
          </button>
        </div>
      </div>
      {guessMode ? (
        <div id="map" className="absolute top-0 left-0 w-full h-full"></div>
      ) : null}
    </div>
  );
}
