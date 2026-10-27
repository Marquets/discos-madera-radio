import type { MetadataRoute } from "next";

// What makes the site installable: "Add to home screen" opens it full screen, without the browser's bars
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Discos Madera Radio",
    short_name: "Discos Madera",
    description: "La música que vamos descubriendo, sonando en directo",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
