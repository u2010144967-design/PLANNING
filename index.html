// =====================================================================
//  CANA LIVRAISONS â€” serveur de donnÃ©es (Scalingo)
//  Il parle le MÃŠME langage que Supabase pour la table Â« planning Â» :
//  le planning et l'application chauffeur n'ont qu'Ã  changer d'adresse.
// =====================================================================
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const CLE = process.env.API_KEY || '';                 // clÃ© demandÃ©e aux applis (en-tÃªte Â« apikey Â»)
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

// ---- les pages (planning, appli chauffeurâ€¦) sont servies par le mÃªme serveur ----
const path = require('path');
app.use(express.static(path.join(__dirname), {
  index: false,
  setHeaders: (res, f) => { if (/\.(html|js|json)$/.test(f)) res.setHeader('Cache-Control', 'no-cache'); }
}));
app.get('/', (req, res) => res.redirect('/cana-livraisons.html'));
// pour l'application Play Store (Android) : preuve que l'appli appartient bien Ã  ce site
app.get('/.well-known/assetlinks.json', (req, res) => {
  try { res.json(JSON.parse(process.env.ASSETLINKS || '[]')); } catch (e) { res.json([]); }
});
app.get('/sante', async (req, res) => {
  try { const r = await pool.query('SELECT count(*)::int AS n FROM planning'); res.type('text').send('âœ… Serveur CANA LIVRAISONS : OK â€” ' + r.rows[0].n + ' lignes dans la base'); }
  catch (e) { res.status(500).type('text').send('âŒ Base de donnÃ©es injoignable : ' + e.message); }
});

// ---- clÃ© ----
function verifCle(req, res, next) {
  if (!CLE) return next();
  const k = req.get('apikey') || req.query.apikey || (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (k === CLE) return next();
  res.status(401).json({ message: 'clÃ© invalide' });
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

// ---- Ã‰CRIRE (crÃ©er ou remplacer) ----
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

// ---- ENVOI AUTOMATIQUE DU BON SIGNÃ‰ AU CLIENT (mÃªme adresse que la fonction Supabase) ----

// ================= EMAILS : uniquement par les boÃ®tes mail de l'entreprise (SMTP), rÃ©glages secrets dans Scalingo =================
// Comptes possibles (variables Scalingo) : SMTP_HOST/PORT/USER/PASS (compte par dÃ©faut)
//   et, si on veut une boÃ®te par service : SMTP_RESTOCO_HOSTâ€¦, SMTP_TRAITEUR_HOSTâ€¦, SMTP_LOGISTIQUE_HOSTâ€¦ (+ _PORT _USER _PASS _FROM)
function compteSmtp(nom) {
  const p = nom && nom !== 'DEFAUT' ? 'SMTP_' + nom + '_' : 'SMTP_';
  const host = process.env[p + 'HOST'] || (p !== 'SMTP_' ? null : null);
  if (!host) return nom && nom !== 'DEFAUT' ? compteSmtp('DEFAUT') : null;
  const user = process.env[p + 'USER'] || '';
  return { nom: nom || 'DEFAUT', host, port: +(process.env[p + 'PORT'] || 587), user, pass: process.env[p + 'PASS'] || '', from: process.env[p + 'FROM'] || user || process.env.EXPEDITEUR || '' };
}
function comptesDispo() { const L = []; ['DEFAUT', 'RESTOCO', 'TRAITEUR', 'LOGISTIQUE'].forEach(n => { const p = n === 'DEFAUT' ? 'SMTP_' : 'SMTP_' + n + '_'; if (process.env[p + 'HOST']) L.push({ nom: n, from: process.env[p + 'FROM'] || process.env[p + 'USER'] || '', host: process.env[p + 'HOST'] }); }); return L; }
async function reglagesEmail() { try { const r = await pool.query("SELECT donnees FROM planning WHERE date = 'EMAIL_REGLAGES'"); return (r.rows[0] && r.rows[0].donnees) || {}; } catch (e) { return {}; } }
async function envoyerMail(service, msg) {
  const R = (await reglagesEmail())[service] || {};
  if (R.actif === false) { const e = new Error('envoi dÃ©sactivÃ© pour ' + service); e.code = 404; throw e; }
  const c = compteSmtp(R.compte || 'DEFAUT');
  if (!c) { const e = new Error("aucune boÃ®te mail n'est encore rÃ©glÃ©e dans Scalingo (SMTP_HOST, SMTP_USER, SMTP_PASS)"); e.code = 404; throw e; }
  const nodemailer = require('nodemailer');
  const tr = c.host === 'test' ? nodemailer.createTransport({ jsonTransport: true }) : nodemailer.createTransport({ host: c.host, port: c.port, secure: c.port === 465, auth: { user: c.user, pass: c.pass } });
  const nomAff = R.nom || process.env.EXPEDITEUR_NOM || 'La Table de Cana Marseille';
  const cc = [].concat(msg.cc || [], String(R.cc || '').split(/[,;\s]+/)).map(x => String(x).trim()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
  const html = (msg.html || '') + (R.signature ? '<p>' + String(R.signature).replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</p>' : '');
  const info = await tr.sendMail({ from: `"${nomAff}" <${c.from || 'logistique@latabledecana-marseille.com'}>`, replyTo: R.repondreA || undefined, to: msg.to, cc: cc.length ? cc : undefined, subject: msg.subject, html, attachments: msg.attachments });
  return { compte: c.nom, from: c.from, info };
}
app.get('/api/email-comptes', verifCle, (req, res) => res.json({ ok: true, comptes: comptesDispo() }));
app.post('/api/email-test', verifCle, async (req, res) => {
  try { const { service, a } = req.body || {}; if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(a || ''))) return res.status(400).json({ ok: false, erreur: 'adresse invalide' });
    const r = await envoyerMail(service || 'logistique', { to: a, subject: 'Test HB Logistique â€” envoi des emails (' + (service || 'logistique') + ')', html: '<p>Bonjour,</p><p>Ceci est un email de test : lâ€™envoi automatique fonctionne âœ…</p>' });
    res.json({ ok: true, compte: r.compte, from: r.from });
  } catch (e) { const m = String(e.message || e); res.status(e.code === 404 ? 404 : 500).json({ ok: false, erreur: m + (/auth|535|534|Invalid login/i.test(m) ? ' â†’ identifiant ou mot de passe refusÃ© par la boÃ®te mail' : /ENOTFOUND|getaddrinfo/i.test(m) ? ' â†’ le nom du serveur SMTP est faux' : /ETIMEDOUT|ECONNREFUSED|timeout/i.test(m) ? ' â†’ le port ne rÃ©pond pas (essaie 587 ou 465)' : '') }); }
});

app.post('/functions/v1/envoyer-bon', verifCle, async (req, res) => {
  try {
    const { cle, email } = req.body || {};
    if (!cle || !String(cle).startsWith('BONSIGNE_')) return res.status(400).json({ ok: false, erreur: 'bon inconnu' });
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ ok: false, erreur: 'email invalide' });
    const FROM = process.env.EXPEDITEUR || 'restauco@latabledecana-marseille.com';
    const FROM_NOM = process.env.EXPEDITEUR_NOM || 'La Table de Cana Marseille';
    const r1 = await pool.query('SELECT donnees FROM planning WHERE date = $1', [cle]);
    if (!r1.rows.length) return res.status(404).json({ ok: false, erreur: 'bon signÃ© introuvable' });
    const m = r1.rows[0].donnees || {};
    let typeBon = String(m.type || '').toUpperCase();
    if (!typeBon) { try { const rb = await pool.query('SELECT donnees FROM planning WHERE date = $1', [cle.replace('BONSIGNE_', 'BON_')]); typeBon = String(((rb.rows[0] || {}).donnees || {}).type || 'RESTOCO').toUpperCase(); } catch (e) { typeBon = 'RESTOCO'; } }
    const service = /FTBE|SERVICE/.test(typeBon) ? 'traiteur' : 'restoco';
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
    const html = `<p>Bonjour,</p><p>Veuillez trouver ci-joint le bon de livraison signÃ© du <b>${jour}</b> (${m.client}).</p>` +
      (m.signataire ? `<p>SignÃ© par ${m.signataire} le ${m.signeA || ''}.</p>` : '') + (m.temperature ? `<p>TempÃ©rature Ã  la livraison : ${m.temperature}.</p>` : '') +
      `<p>Cordialement,<br>${FROM_NOM}</p>`;
    try { await envoyerMail(service, { to: email, subject: `Bon de livraison signÃ© â€” ${m.client} â€” ${jour}`, html, attachments: [{ filename: nomF, content: Buffer.from(b64, 'base64'), contentType: 'application/pdf' }] }); }
    catch (e) { return res.status(e.code === 404 ? 404 : 500).json({ ok: false, erreur: String(e.message || e) }); }
    m.emailEnvoye = new Date().toISOString(); m.emailA = email; m.nbEmails = (m.nbEmails || 0) + 1;
    await pool.query('UPDATE planning SET donnees = $2, updated_at = now() WHERE date = $1', [cle, JSON.stringify(m)]);
    return res.json({ ok: true, par: 'smtp', service });
  } catch (e) { res.status(500).json({ ok: false, erreur: String(e.message || e) }); }
});

// ---- ENVOI D'UNE COMMANDE LECOURTIER (PDF dÃ©jÃ  enregistrÃ© dans la base) ----
app.post('/api/envoyer-commande', verifCle, async (req, res) => {
  try {
    const { cle, a, cc, sujet, html } = req.body || {};
    const okMail = x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(x || '').trim());
    const A = [].concat(a || []).map(x => String(x).trim()).filter(okMail), CC = [].concat(cc || []).map(x => String(x).trim()).filter(okMail);
    if (!cle || !/^CMDLC_|^PREP_/.test(cle)) return res.status(400).json({ ok: false, erreur: 'commande inconnue' });
    if (!A.length) return res.status(400).json({ ok: false, erreur: 'aucune adresse email valide pour Lecourtier (RÃ©glages)' });
    const r1 = await pool.query('SELECT donnees FROM planning WHERE date = $1', [cle]);
    if (!r1.rows.length) return res.status(404).json({ ok: false, erreur: 'commande introuvable' });
    const m = r1.rows[0].donnees || {};
    const cles = Array.from({ length: +m.parts || 0 }, (_, i) => `BONPDF_${m.pid}_${String(i).padStart(3, '0')}`);
    const r2 = await pool.query('SELECT donnees FROM planning WHERE date IN (' + cles.map((_, i) => '$' + (i + 1)).join(',') + ')', cles);
    const parts = []; r2.rows.forEach(x => { const o = x.donnees || {}; parts[o.i] = o.d; });
    if (!cles.length || parts.length !== cles.length || parts.some(p => typeof p !== 'string')) return res.status(500).json({ ok: false, erreur: 'PDF incomplet' });
    const b64 = parts.join(''), nomF = (m.fichier || 'Commande_Lecourtier') + '.pdf';
    try { await envoyerMail('logistique', { to: A, cc: CC, subject: sujet || 'Commande de matÃ©riel', html: html || '<p>Bonjour,</p><p>Veuillez trouver ci-joint notre commande.</p>', attachments: [{ filename: nomF, content: Buffer.from(b64, 'base64'), contentType: 'application/pdf' }] }); }
    catch (e) { return res.status(e.code === 404 ? 404 : 500).json({ ok: false, erreur: String(e.message || e) }); }
    m.envoyeLe = new Date().toISOString(); m.envoyeA = A.join(', ');
    await pool.query('UPDATE planning SET donnees = $2, updated_at = now() WHERE date = $1', [cle, JSON.stringify(m)]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ ok: false, erreur: String(e.message || e) }); }
});

// ---- TEST DE L'ENVOI D'EMAIL : https://<app>/admin/test-email?cle=<API_KEY>&a=<adresse> ----
app.get('/admin/test-email', async (req, res) => {
  if (CLE && req.query.cle !== CLE) return res.status(401).type('text').send('clÃ© invalide');
  const a = String(req.query.a || process.env.SMTP_USER || '');
  const page = (ok, txt) => res.type('html').send('<meta charset="utf-8"><body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:0 16px"><h2>âœ‰ï¸ Test de l\'envoi automatique</h2><p style="font-size:18px;font-weight:800;color:' + (ok ? '#15803d' : '#b91c1c') + '">' + txt + '</p>' +
    '<p>RÃ©glages lus : serveur <b>' + (process.env.SMTP_HOST || 'â€”') + '</b>, port <b>' + (process.env.SMTP_PORT || '587') + '</b>, compte <b>' + (process.env.SMTP_USER || 'â€”') + '</b>, mot de passe ' + (process.env.SMTP_PASS ? '<b>prÃ©sent</b>' : '<b style="color:#b91c1c">absent</b>') + ', bons envoyÃ©s automatiquement : <b>' + (process.env.EMAIL_AUTO_TYPES || 'RESTOCO,CENTRE,PIQUE') + '</b></p></body>');
  if (!process.env.SMTP_HOST) return page(false, 'âŒ SMTP_HOST nâ€™est pas rÃ©glÃ© dans Scalingo (onglet Environment).');
  if (!a) return page(false, 'âŒ Indique une adresse : â€¦/admin/test-email?cle=â€¦&a=ton.adresse@exemple.fr');
  try {
    const nodemailer = require('nodemailer');
    const tr = nodemailer.createTransport(process.env.SMTP_HOST === 'test' ? { jsonTransport: true } : { host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_PORT) === '465', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    if (process.env.SMTP_HOST !== 'test') await tr.verify();
    await tr.sendMail({ from: `"${process.env.EXPEDITEUR_NOM || 'La Table de Cana Marseille'}" <${process.env.EXPEDITEUR || process.env.SMTP_USER}>`, to: a, subject: 'Test CANA LIVRAISONS â€” envoi automatique des bons', html: '<p>Bonjour,</p><p>Ceci est un test : si vous lisez ce message, lâ€™envoi automatique des bons signÃ©s fonctionne. âœ…</p>' });
    page(true, 'âœ… Email de test envoyÃ© Ã  ' + a + ' â€” vÃ©rifie la boÃ®te de rÃ©ception (et les indÃ©sirables).');
  } catch (e) {
    const m = String(e.message || e);
    const aide = /auth|535|534|Invalid login|Username and Password/i.test(m) ? ' â†’ identifiant ou mot de passe refusÃ©. Si câ€™est une boÃ®te Microsoft 365 / Outlook, il faut souvent activer Â« SMTP authentifiÃ© Â» pour cette boÃ®te, ou utiliser un Â« mot de passe dâ€™application Â».'
      : /ENOTFOUND|getaddrinfo/i.test(m) ? ' â†’ le nom du serveur SMTP est faux.' : /ETIMEDOUT|ECONNREFUSED|timeout/i.test(m) ? ' â†’ le port ne rÃ©pond pas : essaie 587 (ou 465).' : '';
    page(false, 'âŒ Lâ€™envoi a Ã©chouÃ© : ' + m.replace(/</g, '&lt;') + aide);
  }
});

// ---- STOCKAGE : place prise + mÃ©nage des vieux fichiers (les bons SIGNÃ‰S sont toujours gardÃ©s) ----
function cleAdmin(req) { const k = process.env.ADMIN_CLE || CLE; return !k || req.query.cle === k; }
const taille = n => n > 1073741824 ? (n / 1073741824).toFixed(2) + ' Go' : (n / 1048576).toFixed(1) + ' Mo';
app.get('/admin/stockage', async (req, res) => {
  if (!cleAdmin(req)) return res.status(401).json({ ok: false, erreur: 'clÃ© invalide' });
  try {
    const rows = (await pool.query("SELECT date, length(donnees::text) AS o FROM planning")).rows;
    let tot = 0; const G = {};
    rows.forEach(r => { const ty = String(r.date).split('_')[0]; const o = +r.o || 0; tot += o; G[ty] = G[ty] || { type: ty, n: 0, o: 0 }; G[ty].n++; G[ty].o += o; });
    try { const x = await pool.query("SELECT pg_total_relation_size('planning') AS t"); if (+x.rows[0].t) tot = +x.rows[0].t; } catch (e) {}
    const t = { rows: [{ t: tot, n: rows.length }] };
    const p = { rows: Object.values(G).sort((a, b) => b.o - a.o).slice(0, 8) };
    const NOMS = { BONPDF: 'Fichiers PDF des bons', BON: 'Fiches des bons', BONSIGNE: 'Bons signÃ©s', PHOTO: 'Photos', EV: 'Ã‰vÃ©nements', GRILLE: 'Planning partagÃ©', MAT: 'MatÃ©riel', JOURNAL: 'Journal' };
    res.json({ ok: true, total: taille(+t.rows[0].t), lignes: t.rows[0].n, parType: p.rows.map(x => ({ type: NOMS[x.type] || (/^\d{4}-/.test(x.type) ? 'JournÃ©es' : x.type), n: x.n, taille: taille(+x.o) })) });
  } catch (e) { res.status(500).json({ ok: false, erreur: e.message }); }
});
app.post('/admin/menage', async (req, res) => {
  if (!cleAdmin(req)) return res.status(401).json({ ok: false, erreur: 'clÃ© invalide' });
  const mois = Math.max(3, parseInt(req.query.mois || '12', 10) || 12);
  try {
    const r = await pool.query(`DELETE FROM planning WHERE updated_at < now() - ($1 || ' months')::interval AND (
        (date LIKE 'BONPDF\\_%' AND date NOT LIKE 'BONPDF\\_S%') OR date LIKE 'PHOTO\\_%' OR date LIKE 'EV\\_%' OR date LIKE 'POS\\_%' OR date LIKE 'JOURNAL\\_%')`, [String(mois)]);
    res.json({ ok: true, supprimees: r.rowCount });
  } catch (e) { res.status(500).json({ ok: false, erreur: e.message }); }
});

// ---- COMPTAGE DES BACS GASTRO SUR PHOTO (IA) ----
//  Variable Scalingo : ANTHROPIC_API_KEY (et, facultatif, ANTHROPIC_MODEL)
app.post('/api/compter-bacs', verifCle, async (req, res) => {
  try {
    const KEYIA = process.env.ANTHROPIC_API_KEY;
    if (!KEYIA) return res.status(404).json({ ok: false, erreur: 'comptage par photo pas encore activÃ© (ANTHROPIC_API_KEY)' });
    let { image, media } = req.body || {};
    if (!image) return res.status(400).json({ ok: false, erreur: 'photo manquante' });
    if (KEYIA === 'test') return res.json({ ok: true, gn1: 12, gn12: 8, autres: 0, total: 20, confiance: 'moyenne', conseil: '' });
    const m = String(image).match(/^data:(image\/[a-z]+);base64,(.*)$/); if (m) { media = m[1]; image = m[2]; }
    const consigne = "Tu es le contrÃ´leur matÃ©riel d'un traiteur. La photo montre des bacs gastronormes (inox ou plastique) : " +
      "GN 1/1 = grand rectangle (environ 53 x 32 cm), GN 1/2 = moitiÃ© (environ 32 x 26 cm). Ils sont souvent EMPILÃ‰S les uns dans les autres, parfois dans des caisses. " +
      "MÃ©thode : repÃ¨re chaque pile ; pour chaque pile, compte les rebords visibles sur le cÃ´tÃ© (chaque rebord = 1 bac) ; si une pile est trop haute, estime avec sa hauteur (un bac emboÃ®tÃ© ajoute environ 1,5 Ã  2 cm). Additionne toutes les piles. " +
      "RÃ©ponds UNIQUEMENT avec ce JSON, sans texte autour : {\"gn1\":0,\"gn12\":0,\"autres\":0,\"total\":0,\"piles\":[{\"type\":\"GN 1/1\",\"nb\":0}],\"confiance\":\"haute|moyenne|faible\",\"conseil\":\"une phrase courte pour mieux prendre la photo si besoin\"}";
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
// ---- COPIE depuis Supabase : en arriÃ¨re-plan, par petits paquets, avec reprise sur erreur ----
//  Ouvrir : https://<ton-app>.osc-fr1.scalingo.io/admin/importer?cle=<API_KEY>   (la page se met Ã  jour toute seule)
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
  Object.assign(IMPORT, { enCours: true, fini: false, total: 0, n: 0, erreurs: [], debut: new Date(), fin: null, message: 'Liste des lignesâ€¦' });
  try {
    // 1) la liste des lignes, page par page ; si Supabase coupe (dÃ©lai dÃ©passÃ©), on prend des pages plus petites
    let cles = [], dernier = '', taille = 200;
    const filtre = depuis ? `&updated_at=gte.${encodeURIComponent(depuis)}` : '';
    while (true) {
      const apres = dernier ? `&date=gt.${encodeURIComponent(dernier)}` : '';
      let p;
      try { p = await supaGet(`${SUPA}/rest/v1/planning?select=date&order=date.asc&limit=${taille}${apres}${filtre}`, H, 2); }
      catch (e) { if (taille > 10) { taille = Math.max(10, Math.floor(taille / 3)); IMPORT.message = 'Supabase est lent, pages plus petites (' + taille + ')â€¦'; continue; } throw e; }
      p.forEach(x => cles.push(x.date)); IMPORT.message = new Set(cles).size + ' lignes trouvÃ©esâ€¦';
      if (p.length < taille) break; dernier = p[p.length - 1].date;
    }
    cles = [...new Set(cles)];
    IMPORT.total = cles.length; IMPORT.message = 'Copie en coursâ€¦';
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
    IMPORT.message = IMPORT.erreurs.length ? `TerminÃ© avec ${IMPORT.erreurs.length} ligne(s) non copiÃ©e(s)` : 'Copie terminÃ©e';
  } catch (e) { IMPORT.message = 'ArrÃªtÃ©e : Supabase rÃ©pond ' + e.message; IMPORT.erreurs.push(String(e.message)); }
  IMPORT.enCours = false; IMPORT.fini = true; IMPORT.fin = new Date();
}
function pageImport(cle) {
  const pct = IMPORT.total ? Math.round(IMPORT.n * 100 / IMPORT.total) : 0;
  const ok = IMPORT.fini && !IMPORT.erreurs.length;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${IMPORT.enCours ? `<meta http-equiv="refresh" content="3;url=/admin/importer?cle=${encodeURIComponent(cle)}&suivre=1">` : ''}
  <title>Copie Supabase â†’ Scalingo</title><body style="font-family:system-ui,Arial;max-width:640px;margin:40px auto;padding:0 16px;color:#0f172a">
  <h2>ðŸ“¦ Copie des donnÃ©es Supabase â†’ Scalingo</h2>
  <p style="font-size:20px;font-weight:800">${IMPORT.enCours ? 'â³ ' : ok ? 'âœ… ' : IMPORT.fini ? 'âš ï¸ ' : ''}${IMPORT.message}</p>
  <div style="background:#e2e8f0;border-radius:10px;height:22px;overflow:hidden"><div style="background:#16a34a;height:100%;width:${pct}%"></div></div>
  <p><b>${IMPORT.n}</b> / ${IMPORT.total || '?'} lignes copiÃ©es (${pct} %)</p>
  ${IMPORT.enCours ? '<p>La page se met Ã  jour toute seule. Tu peux la laisser ouverte.</p>' : ''}
  ${IMPORT.erreurs.length ? '<details open><summary>ProblÃ¨mes (' + IMPORT.erreurs.length + ')</summary><pre style="white-space:pre-wrap;font-size:12px">' + IMPORT.erreurs.slice(0, 30).join('\n').replace(/</g, '&lt;') + '</pre></details><p><a href="/admin/importer?cle=' + encodeURIComponent(cle) + '&relancer=1">ðŸ”„ Relancer la copie</a> (ce qui est dÃ©jÃ  copiÃ© est simplement remis Ã  jour)</p>' : ''}
  ${ok ? '<p>ðŸ‘‰ Ouvre maintenant le planning : <a href="/cana-livraisons.html">cana-livraisons.html</a></p>' : ''}</body>`;
}
app.get('/admin/importer', async (req, res) => {
  if (CLE && req.query.cle !== CLE) return res.status(401).type('text').send('clÃ© invalide');
  if (!IMPORT.enCours && (!IMPORT.debut || req.query.relancer || (!req.query.suivre && IMPORT.fini))) lancerImport(req.query.depuis || '');
  await attendre(400);
  res.type('html').send(pageImport(req.query.cle || ''));
});

module.exports = { app, preparer, setPool: p => { pool = p; } };
if (require.main === module) {
  preparer().then(() => app.listen(PORT, () => console.log('Serveur CANA prÃªt sur le port ' + PORT)))
    .catch(e => { console.error('Base inaccessible :', e.message); process.exit(1); });
}
