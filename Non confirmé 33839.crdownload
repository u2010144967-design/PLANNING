// =====================================================================
//  CANA LIVRAISONS — serveur de données (Scalingo)
//  Il parle le MÊME langage que Supabase pour la table « planning » :
//  le planning et l'application chauffeur n'ont qu'à changer d'adresse.
// =====================================================================
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const CLE = process.env.API_KEY || '';                 // clé demandée aux applis (en-tête « apikey »)
const DB_URL = process.env.SCALINGO_POSTGRESQL_URL || process.env.DATABASE_URL || '';

let pool = global.__poolTest || new Pool({
  connectionString: DB_URL,
  ssl: /sslmode=disable/.test(DB_URL) || /localhost|127\.0\.0\.1/.test(DB_URL) ? false : { rejectUnauthorized: false },
  max: 5
});

async function preparer() {
  await pool.query(`CREATE TABLE IF NOT EXISTS planning (
    date text PRIMARY KEY,
    donnees jsonb,
    updated_at timestamptz DEFAULT now()
  )`);
  try { await pool.query('CREATE INDEX IF NOT EXISTS planning_maj ON planning (updated_at)'); } catch (e) {}
  try { await pool.query('CREATE INDEX IF NOT EXISTS planning_cle ON planning (date text_pattern_ops)'); } catch (e) {}
}

const app = express();
app.use(cors({ origin: true, allowedHeaders: ['apikey', 'authorization', 'content-type', 'prefer', 'x-client-info', 'accept'], methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '15mb' }));

// ---- les pages (planning, appli chauffeur…) sont servies par le même serveur ----
const path = require('path');
app.use(express.static(path.join(__dirname), {
  index: false,
  setHeaders: (res, f) => { if (/\.(html|js|json)$/.test(f)) res.setHeader('Cache-Control', 'no-cache'); }
}));
app.get('/', (req, res) => res.redirect('/cana-livraisons.html'));
// pour l'application Play Store (Android) : preuve que l'appli appartient bien à ce site
app.get('/.well-known/assetlinks.json', (req, res) => {
  try { res.json(JSON.parse(process.env.ASSETLINKS || '[]')); } catch (e) { res.json([]); }
});
app.get('/sante', async (req, res) => {
  try { const r = await pool.query('SELECT count(*)::int AS n FROM planning'); res.type('text').send('✅ Serveur CANA LIVRAISONS : OK — ' + r.rows[0].n + ' lignes dans la base'); }
  catch (e) { res.status(500).type('text').send('❌ Base de données injoignable : ' + e.message); }
});

// ---- clé ----
function verifCle(req, res, next) {
  if (!CLE) return next();
  const k = req.get('apikey') || req.query.apikey || (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (k === CLE) return next();
  res.status(401).json({ message: 'clé invalide' });
}

// ---- traduction des filtres Supabase (date=eq.X, like.X*, in.(a,b), gte., lt., or=(...)) ----
const COLS = { date: 'date', updated_at: 'updated_at' };
function filtre(col, expr, vals) {
  const c = COLS[col];
  if (!c) return null;
  if (/^not\./.test(expr)) { const f = filtre(col, expr.slice(4), vals); return f ? `NOT (${f})` : null; }
  if (/^is\.null$/.test(expr)) return `${c} IS NULL`;
  const m = /^(eq|neq|like|ilike|gte|gt|lte|lt|in)\.(.*)$/.exec(expr);
  if (!m) return null;
  const op = m[1], v = m[2];
  if (op === 'in') {
    const liste = v.replace(/^\(|\)$/g, '').split(',').map(s => s.replace(/^"|"$/g, ''));
    const ph = liste.map(x => { vals.push(x); return '$' + vals.length; });
    return `${c} IN (${ph.join(',')})`;
  }
  if (op === 'like' || op === 'ilike') { vals.push(v.replace(/\*/g, '%')); return `${c} ${op === 'like' ? 'LIKE' : 'ILIKE'} $${vals.length}`; }
  const sql = { eq: '=', neq: '<>', gte: '>=', gt: '>', lte: '<=', lt: '<' }[op];
  vals.push(v); return `${c} ${sql} $${vals.length}`;
}
function construireWhere(query, vals) {
  const conds = [];
  for (const [k, raw] of Object.entries(query)) {
    const liste = Array.isArray(raw) ? raw : [raw];
    for (const v of liste) {
      if (k === 'or') {
        const parts = String(v).replace(/^\(|\)$/g, '').split(/,(?![^()]*\))/).map(p => {
          const i = p.indexOf('.'); return filtre(p.slice(0, i), p.slice(i + 1), vals);
        }).filter(Boolean);
        if (parts.length) conds.push('(' + parts.join(' OR ') + ')');
      } else if (COLS[k]) {
        const f = filtre(k, String(v), vals); if (f) conds.push(f);
      }
    }
  }
  return conds.length ? ' WHERE ' + conds.join(' AND ') : '';
}
function colonnes(select) {
  const ok = String(select || 'date,donnees,updated_at').split(',').map(s => s.trim()).filter(s => ['date', 'donnees', 'updated_at', '*'].includes(s));
  if (!ok.length || ok.includes('*')) return 'date, donnees, updated_at';
  return ok.join(', ');
}

// ---- LIRE ----
app.get('/rest/v1/planning', verifCle, async (req, res) => {
  try {
    const vals = [];
    let sql = `SELECT ${colonnes(req.query.select)} FROM planning` + construireWhere(req.query, vals);
    if (req.query.order) {
      const [col, dir] = String(req.query.order).split('.');
      if (COLS[col]) sql += ` ORDER BY ${COLS[col]} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
    }
    const lim = Math.min(parseInt(req.query.limit || '1000', 10) || 1000, 5000);
    sql += ` LIMIT ${lim}`;
    const off = parseInt(req.query.offset || '0', 10) || 0;
    if (off > 0) sql += ` OFFSET ${off}`;
    const r = await pool.query(sql, vals);
    res.json(r.rows);
  } catch (e) { res.status(400).json({ message: String(e.message || e) }); }
});

// ---- ÉCRIRE (créer ou remplacer) ----
async function ecrire(row) {
  if (!row || !row.date) throw new Error('date manquante');
  await pool.query(
    `INSERT INTO planning (date, donnees, updated_at) VALUES ($1, $2, COALESCE($3::timestamptz, now()))
     ON CONFLICT (date) DO UPDATE SET donnees = EXCLUDED.donnees, updated_at = EXCLUDED.updated_at`,
    [String(row.date), JSON.stringify(row.donnees === undefined ? null : row.donnees), row.updated_at || null]
  );
}
app.post('/rest/v1/planning', verifCle, async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    for (const r of rows) await ecrire(r);
    res.status(201).end();
  } catch (e) { res.status(400).json({ message: String(e.message || e) }); }
});
app.patch('/rest/v1/planning', verifCle, async (req, res) => {
  try {
    const vals = [];
    const where = construireWhere(req.query, vals);
    if (!where) return res.status(400).json({ message: 'filtre obligatoire' });
    vals.push(JSON.stringify(req.body.donnees === undefined ? null : req.body.donnees));
    await pool.query(`UPDATE planning SET donnees = $${vals.length}, updated_at = now()` + where, vals);
    res.status(204).end();
  } catch (e) { res.status(400).json({ message: String(e.message || e) }); }
});
app.delete('/rest/v1/planning', verifCle, async (req, res) => {
  try {
    const vals = [];
    const where = construireWhere(req.query, vals);
    if (!where) return res.status(400).json({ message: 'filtre obligatoire' });
    await pool.query('DELETE FROM planning' + where, vals);
    res.status(204).end();
  } catch (e) { res.status(400).json({ message: String(e.message || e) }); }
});

// ---- ENVOI AUTOMATIQUE DU BON SIGNÉ AU CLIENT (même adresse que la fonction Supabase) ----
app.post('/functions/v1/envoyer-bon', verifCle, async (req, res) => {
  try {
    const { cle, email } = req.body || {};
    if (!cle || !String(cle).startsWith('BONSIGNE_')) return res.status(400).json({ ok: false, erreur: 'bon inconnu' });
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ ok: false, erreur: 'email invalide' });
    const BREVO = process.env.BREVO_API_KEY, SMTP = process.env.SMTP_HOST;
    if (!BREVO && !SMTP) return res.status(404).json({ ok: false, erreur: 'envoi automatique pas encore configuré (SMTP_HOST ou BREVO_API_KEY)' });
    const FROM = process.env.EXPEDITEUR || 'restauco@latabledecana-marseille.com';
    const FROM_NOM = process.env.EXPEDITEUR_NOM || 'La Table de Cana Marseille';
    const r1 = await pool.query('SELECT donnees FROM planning WHERE date = $1', [cle]);
    if (!r1.rows.length) return res.status(404).json({ ok: false, erreur: 'bon signé introuvable' });
    const m = r1.rows[0].donnees || {};
    if ((m.nbEmails || 0) >= 5) return res.status(429).json({ ok: false, erreur: "trop d'envois pour ce bon" });
    let b64 = m.pdf || '';
    if (!b64) {
      const cles = Array.from({ length: +m.parts || 0 }, (_, i) => `BONPDF_${m.pid}_${String(i).padStart(3, '0')}`);
      const r2 = await pool.query('SELECT donnees FROM planning WHERE date IN (' + cles.map((_, i) => '$' + (i + 1)).join(',') + ')', cles);
      const parts = []; r2.rows.forEach(x => { const o = x.donnees || {}; parts[o.i] = o.d; });
      if (parts.length !== cles.length || parts.some(p => typeof p !== 'string')) return res.status(500).json({ ok: false, erreur: 'PDF incomplet' });
      b64 = parts.join('');
    }
    const jour = String(m.jour || '').split('-').reverse().join('/');
    const nomF = `Bon_${String(m.client || 'client').replace(/[^A-Za-z0-9]+/g, '_')}_${m.jour || ''}_signe.pdf`;
    const html = `<p>Bonjour,</p><p>Veuillez trouver ci-joint le bon de livraison signé du <b>${jour}</b> (${m.client}).</p>` +
      (m.signataire ? `<p>Signé par ${m.signataire} le ${m.signeA || ''}.</p>` : '') + (m.temperature ? `<p>Température à la livraison : ${m.temperature}.</p>` : '') +
      `<p>Cordialement,<br>${FROM_NOM}</p>`;
    if (SMTP) {
      // envoi DIRECT depuis la boîte mail de l'entreprise (aucun service extérieur)
      const nodemailer = require('nodemailer');
      const tr = SMTP === 'test' ? nodemailer.createTransport({ jsonTransport: true }) : nodemailer.createTransport({
        host: SMTP, port: +(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_PORT) === '465',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
      await tr.sendMail({ from: `"${FROM_NOM}" <${process.env.SMTP_USER && SMTP !== 'test' ? (process.env.EXPEDITEUR || process.env.SMTP_USER) : FROM}>`, to: email,
        subject: `Bon de livraison signé — ${m.client} — ${jour}`, html, attachments: [{ filename: nomF, content: Buffer.from(b64, 'base64'), contentType: 'application/pdf' }] });
      m.emailEnvoye = new Date().toISOString(); m.emailA = email; m.nbEmails = (m.nbEmails || 0) + 1;
      await pool.query('UPDATE planning SET donnees = $2, updated_at = now() WHERE date = $1', [cle, JSON.stringify(m)]);
      return res.json({ ok: true, par: 'smtp' });
    }
    const r3 = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': BREVO, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: FROM_NOM, email: FROM }, to: [{ email }], subject: `Bon de livraison signé — ${m.client} — ${jour}`, htmlContent: html, attachment: [{ content: b64, name: nomF }] }) });
    if (!r3.ok) return res.status(502).json({ ok: false, erreur: 'Brevo : ' + (await r3.text()).slice(0, 200) });
    m.emailEnvoye = new Date().toISOString(); m.emailA = email; m.nbEmails = (m.nbEmails || 0) + 1;
    await pool.query('UPDATE planning SET donnees = $2, updated_at = now() WHERE date = $1', [cle, JSON.stringify(m)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, erreur: String(e.message || e) }); }
});

// ---- COMPTAGE DES BACS GASTRO SUR PHOTO (IA) ----
//  Variable Scalingo : ANTHROPIC_API_KEY (et, facultatif, ANTHROPIC_MODEL)
app.post('/api/compter-bacs', verifCle, async (req, res) => {
  try {
    const KEYIA = process.env.ANTHROPIC_API_KEY;
    if (!KEYIA) return res.status(404).json({ ok: false, erreur: 'comptage par photo pas encore activé (ANTHROPIC_API_KEY)' });
    let { image, media } = req.body || {};
    if (!image) return res.status(400).json({ ok: false, erreur: 'photo manquante' });
    if (KEYIA === 'test') return res.json({ ok: true, gn1: 12, gn12: 8, autres: 0, total: 20, confiance: 'moyenne', conseil: '' });
    const m = String(image).match(/^data:(image\/[a-z]+);base64,(.*)$/); if (m) { media = m[1]; image = m[2]; }
    const consigne = "Tu es le contrôleur matériel d'un traiteur. La photo montre des bacs gastronormes (inox ou plastique) : " +
      "GN 1/1 = grand rectangle (environ 53 x 32 cm), GN 1/2 = moitié (environ 32 x 26 cm). Ils sont souvent EMPILÉS les uns dans les autres, parfois dans des caisses. " +
      "Méthode : repère chaque pile ; pour chaque pile, compte les rebords visibles sur le côté (chaque rebord = 1 bac) ; si une pile est trop haute, estime avec sa hauteur (un bac emboîté ajoute environ 1,5 à 2 cm). Additionne toutes les piles. " +
      "Réponds UNIQUEMENT avec ce JSON, sans texte autour : {\"gn1\":0,\"gn12\":0,\"autres\":0,\"total\":0,\"piles\":[{\"type\":\"GN 1/1\",\"nb\":0}],\"confiance\":\"haute|moyenne|faible\",\"conseil\":\"une phrase courte pour mieux prendre la photo si besoin\"}";
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST',
      headers: { 'x-api-key': KEYIA, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6', max_tokens: 600,
        messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: media || 'image/jpeg', data: image } }, { type: 'text', text: consigne }] }] }) });
    if (!r.ok) return res.status(502).json({ ok: false, erreur: 'IA : ' + (await r.text()).slice(0, 200) });
    const d = await r.json();
    const txt = (d.content || []).map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
    const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    j.total = j.total || ((+j.gn1 || 0) + (+j.gn12 || 0) + (+j.autres || 0));
    res.json(Object.assign({ ok: true }, j));
  } catch (e) { res.status(500).json({ ok: false, erreur: String(e.message || e) }); }
});

async function ecrireSiPlusRecent(row) {
  await pool.query(
    `INSERT INTO planning (date, donnees, updated_at) VALUES ($1, $2, COALESCE($3::timestamptz, now()))
     ON CONFLICT (date) DO UPDATE SET donnees = EXCLUDED.donnees, updated_at = EXCLUDED.updated_at
     WHERE planning.updated_at IS NULL OR EXCLUDED.updated_at >= planning.updated_at`,
    [String(row.date), JSON.stringify(row.donnees === undefined ? null : row.donnees), row.updated_at || null]);
}
// ---- COPIE depuis Supabase : en arrière-plan, par petits paquets, avec reprise sur erreur ----
//  Ouvrir : https://<ton-app>.osc-fr1.scalingo.io/admin/importer?cle=<API_KEY>   (la page se met à jour toute seule)
const IMPORT = { enCours: false, fini: false, total: 0, n: 0, erreurs: [], debut: null, fin: null, message: '' };
const attendre = ms => new Promise(r => setTimeout(r, ms));
async function supaGet(url, H, essais = 5) {
  let dernier = '';
  for (let i = 0; i < essais; i++) {
    try { const r = await fetch(url, { headers: H }); if (r.ok) return await r.json(); dernier = r.status + ' ' + (await r.text()).slice(0, 160); }
    catch (e) { dernier = String(e.message || e); }
    await attendre(1500 * (i + 1));
  }
  throw new Error(dernier);
}
async function lancerImport(depuis) {
  const SUPA = process.env.SUPABASE_URL || 'https://lllzlidwtcjwsxbgkygn.supabase.co';
  const SKEY = process.env.SUPABASE_KEY || 'sb_publishable_3weqcRqeCv9lwclSAPC2rA_48OAwGcV';
  const H = { apikey: SKEY, Authorization: 'Bearer ' + SKEY };
  Object.assign(IMPORT, { enCours: true, fini: false, total: 0, n: 0, erreurs: [], debut: new Date(), fin: null, message: 'Liste des lignes…' });
  try {
    // 1) la liste des lignes, page par page ; si Supabase coupe (délai dépassé), on prend des pages plus petites
    let cles = [], dernier = '', taille = 200;
    const filtre = depuis ? `&updated_at=gte.${encodeURIComponent(depuis)}` : '';
    while (true) {
      const apres = dernier ? `&date=gt.${encodeURIComponent(dernier)}` : '';
      let p;
      try { p = await supaGet(`${SUPA}/rest/v1/planning?select=date&order=date.asc&limit=${taille}${apres}${filtre}`, H, 2); }
      catch (e) { if (taille > 10) { taille = Math.max(10, Math.floor(taille / 3)); IMPORT.message = 'Supabase est lent, pages plus petites (' + taille + ')…'; continue; } throw e; }
      p.forEach(x => cles.push(x.date)); IMPORT.message = new Set(cles).size + ' lignes trouvées…';
      if (p.length < taille) break; dernier = p[p.length - 1].date;
    }
    cles = [...new Set(cles)];
    IMPORT.total = cles.length; IMPORT.message = 'Copie en cours…';
    // 2) copie par petits paquets (les PDF sont lourds)
    let pos = 0;
    async function ouvrier() {
      while (pos < cles.length) {
        const k = cles[pos++];
        try {
          const r = await supaGet(`${SUPA}/rest/v1/planning?date=eq.${encodeURIComponent(k)}&select=date,donnees,updated_at&order=updated_at.desc.nullslast&limit=1`, H, 4);
          if (r.length) { let d = r[0].donnees; if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) {} } await ecrireSiPlusRecent({ date: r[0].date, donnees: d, updated_at: r[0].updated_at }); }
        } catch (e) { IMPORT.erreurs.push(k + ' : ' + e.message); }
        IMPORT.n++;
      }
    }
    await Promise.all([ouvrier(), ouvrier(), ouvrier(), ouvrier()]);
    IMPORT.message = IMPORT.erreurs.length ? `Terminé avec ${IMPORT.erreurs.length} ligne(s) non copiée(s)` : 'Copie terminée';
  } catch (e) { IMPORT.message = 'Arrêtée : Supabase répond ' + e.message; IMPORT.erreurs.push(String(e.message)); }
  IMPORT.enCours = false; IMPORT.fini = true; IMPORT.fin = new Date();
}
function pageImport(cle) {
  const pct = IMPORT.total ? Math.round(IMPORT.n * 100 / IMPORT.total) : 0;
  const ok = IMPORT.fini && !IMPORT.erreurs.length;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${IMPORT.enCours ? `<meta http-equiv="refresh" content="3;url=/admin/importer?cle=${encodeURIComponent(cle)}&suivre=1">` : ''}
  <title>Copie Supabase → Scalingo</title><body style="font-family:system-ui,Arial;max-width:640px;margin:40px auto;padding:0 16px;color:#0f172a">
  <h2>📦 Copie des données Supabase → Scalingo</h2>
  <p style="font-size:20px;font-weight:800">${IMPORT.enCours ? '⏳ ' : ok ? '✅ ' : IMPORT.fini ? '⚠️ ' : ''}${IMPORT.message}</p>
  <div style="background:#e2e8f0;border-radius:10px;height:22px;overflow:hidden"><div style="background:#16a34a;height:100%;width:${pct}%"></div></div>
  <p><b>${IMPORT.n}</b> / ${IMPORT.total || '?'} lignes copiées (${pct} %)</p>
  ${IMPORT.enCours ? '<p>La page se met à jour toute seule. Tu peux la laisser ouverte.</p>' : ''}
  ${IMPORT.erreurs.length ? '<details open><summary>Problèmes (' + IMPORT.erreurs.length + ')</summary><pre style="white-space:pre-wrap;font-size:12px">' + IMPORT.erreurs.slice(0, 30).join('\n').replace(/</g, '&lt;') + '</pre></details><p><a href="/admin/importer?cle=' + encodeURIComponent(cle) + '&relancer=1">🔄 Relancer la copie</a> (ce qui est déjà copié est simplement remis à jour)</p>' : ''}
  ${ok ? '<p>👉 Ouvre maintenant le planning : <a href="/cana-livraisons.html">cana-livraisons.html</a></p>' : ''}</body>`;
}
app.get('/admin/importer', async (req, res) => {
  if (CLE && req.query.cle !== CLE) return res.status(401).type('text').send('clé invalide');
  if (!IMPORT.enCours && (!IMPORT.debut || req.query.relancer || (!req.query.suivre && IMPORT.fini))) lancerImport(req.query.depuis || '');
  await attendre(400);
  res.type('html').send(pageImport(req.query.cle || ''));
});

module.exports = { app, preparer, setPool: p => { pool = p; } };
if (require.main === module) {
  preparer().then(() => app.listen(PORT, () => console.log('Serveur CANA prêt sur le port ' + PORT)))
    .catch(e => { console.error('Base inaccessible :', e.message); process.exit(1); });
}
