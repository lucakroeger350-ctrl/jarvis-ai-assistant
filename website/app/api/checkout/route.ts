import { NextResponse } from 'next/server';
import { resolvePriceId, PRODUCTS, DLC_PRODUCTS, type ProductType, type DlcKey } from '@/lib/stripe-products';

// Erstellt eine Stripe-Checkout-Session - VIP-Abo (wiederkehrend), das einmalige
// +500-Credits-Refill-Paket, oder ein DLC (einmalig). client_reference_id trägt die
// Supabase-Nutzer-ID, damit der Webhook (siehe app/api/stripe-webhook) weiß, wessen
// Profil er nach erfolgreicher Zahlung aktualisieren muss.
export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: 'Stripe ist noch nicht konfiguriert (STRIPE_SECRET_KEY fehlt).' }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const userId: string | undefined = body.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Bitte zuerst anmelden, bevor du kaufst.' }, { status: 401 });
  }

  let productId: string;
  const isDlc = body.dlc as DlcKey | undefined;
  if (isDlc) {
    const dlc = DLC_PRODUCTS[isDlc];
    if (!dlc || !dlc.productId) {
      return NextResponse.json({ error: 'Dieses DLC hat noch keine Stripe-Produkt-ID hinterlegt.' }, { status: 500 });
    }
    productId = dlc.productId;
  } else {
    const type: ProductType = body.type === 'refill' ? 'refill' : 'subscription';
    productId = PRODUCTS[type];
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secretKey);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const priceId = await resolvePriceId(stripe, productId);
    const isSubscription = productId === PRODUCTS.subscription;

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      automatic_tax: { enabled: true },
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
