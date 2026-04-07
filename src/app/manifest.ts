import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pointer",
    short_name: "Pointer",
    description: "Ponto digital mobile-first com foto, localizacao e auditoria.",
    start_url: "/",
    display: "standalone",
    background_color: "#111111",
    theme_color: "#111111",
    orientation: "portrait",
    lang: "pt-BR",
    icons: [
      {
        src: "/brand/logo-simples.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/logo-simples.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/brand/logo-simples.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
