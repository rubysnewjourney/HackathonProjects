/** Curated construction site photos (Unsplash — demo-safe hotlinks) */
export const STOCK_IMAGES = [
  {
    id: "scaffold-no-rail",
    label: "Scaffolding — elevated work",
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80",
    tags: ["scaffolding", "falls", "ppe"],
  },
  {
    id: "excavation-trench",
    label: "Excavation / trench work",
    url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80",
    tags: ["excavation", "structural"],
  },
  {
    id: "active-construction",
    label: "Active job site — mixed trades",
    url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1200&q=80",
    tags: ["equipment", "housekeeping"],
  },
  {
    id: "steel-frame",
    label: "Steel frame — height exposure",
    url: "https://images.unsplash.com/photo-1590644365607-8c765d803b45?w=1200&q=80",
    tags: ["falls", "structural"],
  },
  {
    id: "electrical-work",
    label: "Electrical / MEP rough-in",
    url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=80",
    tags: ["electrical"],
  },
  {
    id: "concrete-pour",
    label: "Concrete pour — equipment zone",
    url: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80",
    tags: ["equipment", "housekeeping"],
  },
];

export function pickRandomStock() {
  return STOCK_IMAGES[Math.floor(Math.random() * STOCK_IMAGES.length)];
}

export function getStockById(id) {
  return STOCK_IMAGES.find((s) => s.id === id) ?? null;
}
