import { createClient } from '@supabase/supabase-js';

// service_role-Client: umgeht Row-Level-Security, darf NUR in serverseitigem Code
// (API-Routen) verwendet werden, niemals an den Client gelangen.
export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

// Prüft den vom Client mitgeschickten Supabase-Access-Token und gibt die Nutzer-ID zurück.
export async function verifyUser(accessToken: string | null) {
  if (!accessToken) return null;
  const { createClient: createAnonClient } = await import('@supabase/supabase-js');
  const anon = createAnonClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data, error } = await anon.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}
