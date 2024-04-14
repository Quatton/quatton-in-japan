import { useEffect } from "react";

export function StreetView() {
  function initialize() {
    const fenway = { lat: 42.345573, lng: -71.098326 };
    const map = new google.maps.Map(
      document.getElementById("map") as HTMLElement,
      {
        center: fenway,
        zoom: 14,
      }
    );
    const panorama = new google.maps.StreetViewPanorama(
      document.getElementById("pano") as HTMLElement,
      {
        position: fenway,
        pov: {
          heading: 34,
          pitch: 10,
        },
      }
    );

    map.setStreetView(panorama);
  }

  useEffect(() => {
    initialize();
  }, []);

  return (
    <div>
      <div id="map" style={{ height: "400px", width: "400px" }}></div>
      <div id="pano" style={{ height: "400px", width: "400px" }}></div>
    </div>
  );
}
