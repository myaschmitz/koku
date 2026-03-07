import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/login",
      disallow: ["/decks", "/cards", "/study", "/settings", "/api", "/auth"],
    },
    sitemap: "https://www.koku.cards/sitemap.xml",
  };
}
