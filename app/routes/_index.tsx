import { useJsApiLoader } from "@react-google-maps/api";
import type { MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { StreetView } from "~/components/street-view";

export const meta: MetaFunction = () => {
  return [
    { title: "Quatton in Japan" },
    { name: "description", content: "Welcome to Japan!" },
  ];
};

export function loader() {
  return { googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY! };
}

export default function Index() {
  const { googleMapsApiKey } = useLoaderData<typeof loader>();

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey,
    region: "JP",
  });

  if (!isLoaded) {
    return null;
  }

  return <StreetView />;
}
