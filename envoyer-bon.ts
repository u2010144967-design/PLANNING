// =====================================================================
//  CANA LIVRAISONS — fonction Supabase « envoyer-bon »
//  Envoie automatiquement le bon signé au client, depuis l'adresse de
//  l'entreprise, sans passer par la boîte mail du chauffeur.
//  Service d'envoi : Brevo (français, gratuit jusqu'à 300 emails / jour).
//
//  Réglages à mettre dans Supabase → Edge Functions → Secrets :
//    BREVO_API_KEY   = la clé API Brevo (commence par xkeysib-…)
//    EXPEDITEUR      = l'adresse qui envoie (ex. restauco@latabledecana-marseille.com)
//    EXPEDITEUR_NOM  = La Table de Cana Marseille
//  (SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement.)
// =====================================================================
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const rep = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { cle, email } = await req.json();
    if (!cle || !String(cle).startsWith("BONSIGNE_")) return rep({ ok: false, erreur: "bon inconnu" }, 400);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return rep({ ok: false, erreur: "email invalide" }, 400);

    const SUPA = Deno.env.get("SUPABASE_URL")!;
    const SKEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const BREVO = Deno.env.get("BREVO_API_KEY")!;
    const FROM = Deno.env.get("EXPEDITEUR") || "restauco@latabledecana-marseille.com";
    const FROM_NOM = Deno.env.get("EXPEDITEUR_NOM") || "La Table de Cana Marseille";
    const H = { apikey: SKEY, Authorization: "Bearer " + SKEY, "Content-Type": "application/json" };

    // 1) la fiche du bon signé
    const r1 = await fetch(`${SUPA}/rest/v1/planning?date=eq.${encodeURIComponent(cle)}&select=donnees`, { headers: H });
    const rows = await r1.json();
    if (!rows.length) return rep({ ok: false, erreur: "bon signé introuvable" }, 404);
    let m = rows[0].donnees; if (typeof m === "string") m = JSON.parse(m);
    // anti-abus : 5 envois maximum par bon
    if ((m.nbEmails || 0) >= 5) return rep({ ok: false, erreur: "trop d'envois pour ce bon" }, 429);

    // 2) le PDF (rangé en morceaux)
    let b64 = m.pdf || "";
    if (!b64) {
      const cles = Array.from({ length: +m.parts }, (_, i) => `BONPDF_${m.pid}_${String(i).padStart(3, "0")}`);
      const r2 = await fetch(`${SUPA}/rest/v1/planning?date=in.(${cles.map(encodeURIComponent).join(",")})&select=donnees`, { headers: H });
      const parts: string[] = [];
      for (const x of await r2.json()) { let o = x.donnees; if (typeof o === "string") o = JSON.parse(o); parts[o.i] = o.d; }
      if (parts.length !== cles.length || parts.some((p) => typeof p !== "string")) return rep({ ok: false, erreur: "PDF incomplet" }, 500);
      b64 = parts.join("");
    }

    // 3) l'email
    const jour = String(m.jour || "").split("-").reverse().join("/");
    const nomFichier = `Bon_${String(m.client || "client").replace(/[^A-Za-z0-9]+/g, "_")}_${m.jour || ""}_signe.pdf`;
    const html = `<p>Bonjour,</p><p>Veuillez trouver ci-joint le bon de livraison signé du <b>${jour}</b> (${m.client}).</p>` +
      (m.signataire ? `<p>Signé par ${m.signataire} le ${m.signeA || ""}.</p>` : "") +
      (m.temperature ? `<p>Température à la livraison : ${m.temperature}.</p>` : "") +
      `<p>Cordialement,<br>${FROM_NOM}</p>`;
    const r3 = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { name: FROM_NOM, email: FROM }, to: [{ email }], subject: `Bon de livraison signé — ${m.client} — ${jour}`, htmlContent: html, attachment: [{ content: b64, name: nomFichier }] }),
    });
    if (!r3.ok) return rep({ ok: false, erreur: "Brevo : " + (await r3.text()).slice(0, 200) }, 502);

    // 4) on note l'envoi sur le bon (visible dans le logiciel)
    m.emailEnvoye = new Date().toISOString(); m.emailA = email; m.nbEmails = (m.nbEmails || 0) + 1;
    await fetch(`${SUPA}/rest/v1/planning?date=eq.${encodeURIComponent(cle)}`, { method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ donnees: m }) });
    return rep({ ok: true });
  } catch (e) {
    return rep({ ok: false, erreur: String(e) }, 500);
  }
});
