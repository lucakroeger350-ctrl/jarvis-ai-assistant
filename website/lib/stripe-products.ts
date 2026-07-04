// Zentrale Zuordnung Produkt-Typ -> Stripe-Product-ID. Die eigentliche Price-ID wird
// zur Laufzeit über die Stripe-API aufgelöst (aktiver Standardpreis des Produkts),
// da uns nur die Produkt-IDs vorliegen, nicht die Price-IDs.
export const PRODUCTS = {
  subscription: 'prod_Uos3OJh2bGPkJE', // VIP-Command Abo, 19,99€/Monat
  refill: 'prod_Uos9HImjKM5C1M', // +500 Credits, 3,50€ einmalig
} as const;

export type ProductType = keyof typeof PRODUCTS;

// DLC-Registry: jedes künftige DLC bekommt hier einen Eintrag - dieselbe Struktur wird
// vom Stripe-Webhook UND vom Marketplace genutzt. "column" ist die Supabase-Spalte
// (siehe supabase-credits.sql), die der Webhook nach Kauf auf true setzt.
export const DLC_PRODUCTS = {
  hudCustomizer: {
    productId: null as string | null, // TODO: Stripe-Product-ID einfügen, sobald angelegt
    column: 'has_dlc_hud_customizer',
    name: 'HUD Customizer & Shape-Shifter',
    priceEUR: 25,
  },
} as const;

export type DlcKey = keyof typeof DLC_PRODUCTS;

export async function resolvePriceId(stripe: import('stripe').default, productId: string) {
  const product = await stripe.products.retrieve(productId);
  if (product.default_price) {
    return typeof product.default_price === 'string' ? product.default_price : product.default_price.id;
  }
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 1 });
  if (!prices.data[0]) throw new Error(`Kein aktiver Preis für Produkt ${productId} gefunden.`);
  return prices.data[0].id;
}
