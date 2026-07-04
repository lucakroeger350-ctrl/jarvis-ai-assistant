# Setup — was ich gebaut habe vs. was du selbst tun musst

## Was schon läuft (reiner Code, von mir gebaut & geprüft)
- `npm run dev` im Ordner `website/` startet die Seite lokal auf Port 3000.
- `npm run build` läuft fehlerfrei durch (produktionsbereit).
- Landingpage komplett: Hero mit Partikelnetz, Live-Kommandozentrale (Platzhalter-Zahlen,
  noch keine echte Datenquelle), Feature-Matrix, Preisvergleich.
- `/dossier` ist ein gesperrter Platzhalter — noch ohne echte Anmeldung.

## Was DU selbst tun musst (Konten/Zahlungen darf ich nicht für dich anlegen)

### 1. Vercel-Deployment (kostenlos)
1. Auf **vercel.com** mit deinem GitHub-Account einloggen.
2. "Add New Project" → das Jarvis-Repo auswählen → als Root-Verzeichnis `website` angeben.
3. Deploy klicken — du bekommst sofort eine kostenlose `*.vercel.app`-Adresse.
4. Eigene Domain später unter Project Settings → Domains verbinden.

### 2. Supabase (kostenlos, für Login/VIP-Dossier)
1. Auf **supabase.com** ein kostenloses Konto anlegen, neues Projekt erstellen.
2. Unter Project Settings → API: `Project URL` und `anon public key` kopieren.
3. Mir die beiden Werte geben (oder selbst in eine `.env.local`-Datei im `website/`-Ordner eintragen:
   `NEXT_PUBLIC_SUPABASE_URL=...` und `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`).
4. Unter Authentication → Email: "Confirm email" aktivieren (ist bei neuen Projekten meist schon an).
4b. **Wichtig gegen den "localhost"-Bestätigungslink-Fehler:** Authentication → URL Configuration →
    "Site URL" auf `https://website-three-pied-22.vercel.app` setzen (steht sonst auf localhost).
4c. **Professionelle Bestätigungsmail:** Authentication → Email Templates → "Confirm signup" → Inhalt ersetzen durch:
    ```html
    <div style="background:#060606;padding:40px;font-family:Arial,sans-serif;color:#f4f0ec;">
      <div style="max-width:480px;margin:0 auto;border:1px solid rgba(255,87,34,0.4);padding:32px;">
        <h1 style="color:#ff5722;font-size:20px;letter-spacing:2px;margin:0 0 20px;">JARVIS AI ASSISTANT</h1>
        <p style="font-size:14px;line-height:1.6;">Willkommen an Bord. Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren:</p>
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;margin-top:20px;padding:14px 28px;background:#ff5722;color:#000;text-decoration:none;font-weight:bold;letter-spacing:1px;">KONTO BESTÄTIGEN</a>
        <p style="font-size:12px;color:#8a7d74;margin-top:24px;">Falls du dich nicht registriert hast, ignoriere diese E-Mail einfach.</p>
      </div>
    </div>
    ```
5. **Google-Login aktivieren** (für den "Mit Google fortfahren"-Button):
   a. Bei **console.cloud.google.com** → neues Projekt → "APIs & Dienste" → "OAuth-Zustimmungsbildschirm" einrichten.
   b. Dort "Anmeldedaten" → "OAuth-Client-ID erstellen" → Typ "Webanwendung".
   c. Als Redirect-URI genau das eintragen, was Supabase dir unter Authentication → Providers → Google anzeigt
      (sieht aus wie `https://mhlldrhhbuskszmdwedp.supabase.co/auth/v1/callback`).
   d. Client-ID + Client-Secret zurück bei Supabase unter Authentication → Providers → Google eintragen, aktivieren.

### 3. Stripe / PayPal (nur bei echten Verkäufen Gebühren)
1. Bei **stripe.com** und/oder **paypal.com/de/webapps/mpp/merchant** als Verkäufer registrieren
   (Geschäftsangaben, Bankverbindung — das kann nur du als Kontoinhaber machen).
2. API-Keys (Test-Modus reicht zum Entwickeln) an mich geben.
3. Danach baue ich Checkout-Flow + Webhook-Endpunkt für VIP-Abo und DLC-Käufe.

### 4. Web-Overwatch-Protokoll (Remote-Überwachung/-Sperre)
Braucht Punkt 2 (Supabase) als Grundlage: JARVIS auf dem PC muss regelmäßig Status an die
Cloud-Datenbank melden und Befehle von dort abholen (Polling). Das ist eine eigene,
größere Baustelle — fangen wir nach Supabase-Setup separat an.

## Warum ich das nicht selbst anlegen kann
Konten bei Vercel/Supabase/Stripe/PayPal sind an deine echte Identität, E-Mail und ggf.
Zahlungsdaten gebunden — das lege ich grundsätzlich nicht für dich an, das musst du selbst
einloggen/registrieren. Ich baue dir aber jeden Code-Teil, sobald die Keys da sind.
