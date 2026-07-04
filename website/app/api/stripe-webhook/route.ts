import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PRODUCTS, DLC_PRODUCTS } from '@/lib/stripe-products';

// KRITISCH für Manipulationssicherheit: Stripe signiert jedes Webhook-Event mit einem
// geheimen Schlüssel (STRIPE_WEBHOOK_SECRET). Nur wenn die Signatur passt, wissen wir,
// dass das Event wirklich von Stripe kommt und nicht gefälscht wurde (jeder könnte sonst
// eine POST-Anfrage an diese URL schicken und sich selbst VIP/Credits geben).
export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey || !webhookSecret || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Webhook nicht vollständig konfiguriert.' }, { status: 500 });
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secretKey);

  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ungültige Signatur.';
    return NextResponse.json({ error: `Webhook-Signatur ungültig: ${message}` }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as import('stripe').default.Checkout.Session;
  const userId = session.client_reference_id;
  if (!userId) return NextResponse.json({ received: true });

  // service_role-Key umgeht Row-Level-Security bewusst - läuft NUR hier serverseitig,
  // niemals im Client-Code, und ist durch die Signaturprüfung oben abgesichert.
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseServiceKey);

  // Idempotenz: dieses Event-ID schon verarbeitet? Dann nichts noch einmal gutschreiben.
  const { error: insertError } = await supabaseAdmin.from('processed_stripe_events').insert({ event_id: event.id });
  if (insertError) return NextResponse.json({ received: true, alreadyProcessed: true });

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const productId = lineItems.data[0]?.price?.product as string | undefined;

  if (productId === PRODUCTS.subscription) {
    await supabaseAdmin.from('profiles').update({ is_vip: true }).eq('id', userId);
  } else if (productId === PRODUCTS.refill) {
    await supabaseAdmin.rpc('add_credits', { uid: userId, amount: 500 });
  } else {
    // Generische DLC-Freischaltung: jedes künftige DLC folgt exakt diesem Muster - einfach
    // einen neuen Eintrag in DLC_PRODUCTS (lib/stripe-products.ts) + Supabase-Spalte anlegen,
    // hier ist KEINE Codeänderung nötig.
    const dlc = Object.values(DLC_PRODUCTS).find((d) => d.productId === productId);
    if (dlc) {
      await supabaseAdmin.from('profiles').update({ [dlc.column]: true }).eq('id', userId);
    }
  }

  return NextResponse.json({ received: true });
}
