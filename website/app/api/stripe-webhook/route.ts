import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PRODUCTS, DLC_PRODUCTS } from '@/lib/stripe-products';
import { moderateAd } from '@/lib/ad-moderation';

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
  const refId = session.client_reference_id;
  if (!refId) return NextResponse.json({ received: true });

  // service_role-Key umgeht Row-Level-Security bewusst - läuft NUR hier serverseitig,
  // niemals im Client-Code, und ist durch die Signaturprüfung oben abgesichert.
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseServiceKey);

  // Idempotenz: dieses Event-ID schon verarbeitet? Dann nichts noch einmal gutschreiben.
  const { error: insertError } = await supabaseAdmin.from('processed_stripe_events').insert({ event_id: event.id });
  if (insertError) return NextResponse.json({ received: true, alreadyProcessed: true });

  // Öffentliches, anonymisiertes Aktivitäts-Log (siehe supabase-activity-log.sql) - enthält
  // absichtlich NIE E-Mail/Name/User-ID, nur den Ereignistyp.
  function logActivity(eventType: string) {
    return supabaseAdmin.from('activity_log').insert({ event_type: eventType }).then(() => {});
  }

  // Admin-only Umsatz-Log MIT echtem Betrag (siehe supabase-admin-panel.sql) - für das
  // Master-Admin-Panel (Live-Feed + Monatsumsatz), NIE öffentlich lesbar.
  function logRevenue(eventType: string) {
    if (!session.amount_total) return Promise.resolve();
    return supabaseAdmin.from('revenue_log').insert({
      event_type: eventType,
      amount_cents: session.amount_total,
      currency: session.currency || 'eur',
    }).then(() => {});
  }

  // Chronos Quantum Core: limitierte Auflage (nur 5 Stück), client_reference_id trägt
  // "limited:<slug>:<userId>". Atomarer Kauf-Zähler verhindert Überverkauf; wird die
  // Zahlung trotzdem angenommen, obwohl schon ausverkauft ist, wird automatisch erstattet.
  if (refId.startsWith('limited:')) {
    const [, slug, limitedUserId] = refId.split(':');
    const { data: claimed } = await supabaseAdmin.rpc('claim_limited_item', { item_slug: slug });

    if (claimed) {
      await supabaseAdmin.from('profiles').update({ has_widget_chronos_core: true }).eq('id', limitedUserId);
      await logActivity(`limited_claimed:${slug}`);
      await logRevenue(`limited_claimed:${slug}`);
    } else if (typeof session.payment_intent === 'string') {
      await stripe.refunds.create({ payment_intent: session.payment_intent }).catch(() => {});
    }
    return NextResponse.json({ received: true });
  }

  // V-Coins-Kauf: client_reference_id trägt "vcoins:<amount>:<userId>".
  if (refId.startsWith('vcoins:')) {
    const [, amountStr, vcoinsUserId] = refId.split(':');
    await supabaseAdmin.rpc('add_vcoins', { uid: vcoinsUserId, amount: Number(amountStr) });
    await logActivity('vcoins_purchased');
    await logRevenue('vcoins_purchased');
    return NextResponse.json({ received: true });
  }

  // Werbe-Käufe laufen ohne Nutzer-Login - client_reference_id trägt "ad:<adId>" statt
  // einer Supabase-User-ID, siehe app/api/ad-checkout. Nach der Zahlung prüft die KI den
  // Inhalt automatisch (siehe lib/ad-moderation.ts) - ist er sauber, geht die Werbung
  // sofort für die gebuchte Laufzeit live, kein manueller Schritt mehr nötig.
  if (refId.startsWith('ad:')) {
    const adId = refId.slice(3);
    const { data: ad } = await supabaseAdmin.from('ads').select('headline, body, link_url, days, slot').eq('id', adId).single();

    if (!ad) return NextResponse.json({ received: true });

    const moderation = await moderateAd(ad.headline, ad.body, ad.link_url);
    const now = new Date();

    if (moderation.approved) {
      // Staffelung statt harter DB-Sperre: läuft im selben Slot schon eine genehmigte
      // Kampagne, startet die neue erst danach - kein Überschneiden zweier Werbungen
      // im selben Platz.
      const { data: activeInSlot } = await supabaseAdmin
        .from('ads')
        .select('ends_at')
        .eq('slot', ad.slot)
        .eq('status', 'approved')
        .gt('ends_at', now.toISOString())
        .order('ends_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const startsAt = activeInSlot ? new Date(activeInSlot.ends_at) : now;
      const endsAt = new Date(startsAt.getTime() + ad.days * 24 * 60 * 60 * 1000);
      await supabaseAdmin.from('ads').update({
        paid: true,
        status: 'approved',
        stripe_session_id: session.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        reviewed_at: now.toISOString(),
      }).eq('id', adId);
      await logActivity('ad_approved');
      await logRevenue('ad_approved');
    } else {
      // Fair gegenüber dem Käufer: bei KI-Ablehnung automatisch erstatten, statt Geld für
      // eine nie geschaltete Werbung zu behalten.
      if (typeof session.payment_intent === 'string') {
        await stripe.refunds.create({ payment_intent: session.payment_intent }).catch(() => {});
      }
      await supabaseAdmin.from('ads').update({
        paid: true,
        status: 'rejected',
        stripe_session_id: session.id,
        reviewed_at: now.toISOString(),
      }).eq('id', adId);
    }
    return NextResponse.json({ received: true });
  }

  const userId = refId;
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
  const productId = lineItems.data[0]?.price?.product as string | undefined;

  if (productId === PRODUCTS.subscription) {
    await supabaseAdmin.from('profiles').update({ is_vip: true }).eq('id', userId);
    await logActivity('vip_subscribed');
    await logRevenue('vip_subscribed');
  } else if (productId === PRODUCTS.mobileAddon) {
    await supabaseAdmin.from('profiles').update({ has_mobile_addon: true }).eq('id', userId);
    await logActivity('mobile_addon_subscribed');
    await logRevenue('mobile_addon_subscribed');
  } else if (productId === PRODUCTS.refill) {
    await supabaseAdmin.rpc('add_credits', { uid: userId, amount: 500 });
    await logActivity('credits_refilled');
    await logRevenue('credits_refilled');
  } else {
    // Generische DLC-Freischaltung: jedes künftige DLC folgt exakt diesem Muster - einfach
    // einen neuen Eintrag in DLC_PRODUCTS (lib/stripe-products.ts) + Supabase-Spalte anlegen,
    // hier ist KEINE Codeänderung nötig.
    const dlc = Object.values(DLC_PRODUCTS).find((d) => d.productId === productId);
    if (dlc) {
      await supabaseAdmin.from('profiles').update({ [dlc.column]: true }).eq('id', userId);
      await logActivity(`dlc_purchased:${dlc.name}`);
      await logRevenue(`dlc_purchased:${dlc.name}`);
    }
  }

  return NextResponse.json({ received: true });
}
