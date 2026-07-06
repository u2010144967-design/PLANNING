import { useState, useEffect, useMemo } from "react";
import { Truck, Printer, Search, Plus, X, RotateCcw, ChefHat, Save } from "lucide-react";

const REGULIERS = [
  "AMPM", "BMPM", "BARQUETTE AMPM", "BARQUETTE BMPM",
  "ARGONAUTES", "ARGONAUTES PLAT TÉMOIN", "CAARUD LE SLEEP'IN",
  "CHRS CHEZ SIMONE MIDI", "CHRS CHEZ SIMONE SOIR",
  "CHRS LA MINOTERIE MIDI", "CHRS LA MINOTERIE SOIR",
  "CHRS LA SELONNE MIDI", "CHRS LA SELONNE SOIR",
  "COMPAGNONS MIDI", "COMPAGNONS SOIR", "ESAT ST JEAN",
  "LHSS FONTAINIEU MIDI", "LHSS FONTAINIEU SOIR",
  "PHOCÉEN", "SÉCURITÉ CIVILE",
  "UNITÉ A MIDI", "UNITÉ A SOIR", "UNITÉ B MIDI", "UNITÉ B SOIR",
  "UNITÉ C MIDI", "UNITÉ C SOIR", "UNITÉ D", "VILLA NIOZELLES",
];

const CENTRES = [
  "AGA FLAMANTS 1", "AGA FLAMANTS 2", "AGA FLAMANTS ADO", "AGORA", "AIR BEL",
  "BERNARD DUBOIS 1", "BERNARD DUBOIS 2", "BONNEVEINE ADO", "BONNEVEINE MAT",
  "BONNEVEINE MPT MAT", "BONNEVEINE PRIM 1", "BONNEVEINE PRIM 2", "BONNEVEINE PRIM 3",
  "CASTELLANE", "CASTELLANE ADO", "CCO SIÈGE", "CHÂTEAU GOMBERT 1", "CHÂTEAU GOMBERT 2",
  "CHÂTEAU GOMBERT ADO", "CHAVE COPELLO PRIM", "COIN JOLI", "COURS JULIEN MAT",
  "FRAIS VALLON", "LA BRICARDE 1", "LA BRICARDE 2", "LA LOUBIÈRE MAT", "LA LOUBIÈRE PRIM",
  "LA SAVINE", "LE GRAND CANET", "LE ROUET MAT", "LE ROUET PRIM", "LES 3 LUCS ADO",
  "LES 3 LUCS", "LES BOURRELY", "LES LIERRES 1", "LES LIERRES 2", "LES MUSARDISES",
  "MER ET COLLINE", "ROY D'ESPAGNE MAT", "ROY D'ESPAGNE PRIM", "SAINTE MARTHE PRIM",
  "ST GINIEZ ADO", "ST GINIEZ MAT", "ST GINIEZ PRIM", "ST JEROME", "ST THYS",
  "STE ELISABETH MAT", "STE ELISABETH PRIM", "TOROS",
];

const STORAGE_KEY = "repartition-livraisons-v1";

function buildInitialClients() {
  let i = 0;
  const mk = (name, category) => ({ id: `c${i++}`, name, category, lab: null, camion: null });
  return [
    ...REGULIERS.map((n) => mk(n, "reguliers")),
    ...CENTRES.map((n) => mk(n, "centres")),
  ];
}

const DEFAULT_CAMIONS = ["Camion 1", "Camion 2", "Camion 3"];

const LAB = {
  cana: { label: "La Table de Cana", short: "CANA", chip: "bg-emerald-600", ring: "ring-emerald-600", text: "text-emerald-700", soft: "bg-emerald-50 border-emerald-200" },
  sadi: { label: "Sadi Carnot", short: "SADI CARNOT", chip: "bg-sky-700", ring: "ring-sky-700", text: "text-sky-800", soft: "bg-sky-50 border-sky-200" },
};

export default function RepartitionLivraisons() {
  const [clients, setClients] = useState(buildInitialClients);
  const [camions, setCamions] = useState(DEFAULT_CAMIONS);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [filterCat, setFilterCat] = useState("all");
  const [filterLab, setFilterLab] = useState("all");
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("reguliers");
  const [newCamion, setNewCamion] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Chargement initial
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res && res.value) {
          const data = JSON.parse(res.value);
          if (Array.isArray(data.clients)) setClients(data.clients);
          if (Array.isArray(data.camions)) setCamions(data.camions);
        }
      } catch (e) {
        // Pas de sauvegarde existante : on garde la liste initiale
      }
      setLoaded(true);
    })();
  }, []);

  // Sauvegarde automatique
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({ clients, camions }));
        if (!cancelled) setSaveState("saved");
      } catch (e) {
        if (!cancelled) setSaveState("error");
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [clients, camions, loaded]);

  const counts = useMemo(() => {
    const c = { cana: 0, sadi: 0, none: 0 };
    clients.forEach((cl) => {
      if (cl.lab === "cana") c.cana++;
      else if (cl.lab === "sadi") c.sadi++;
      else c.none++;
    });
    return c;
  }, [clients]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((cl) => {
      if (filterCat !== "all" && cl.category !== filterCat) return false;
      if (filterLab === "cana" && cl.lab !== "cana") return false;
      if (filterLab === "sadi" && cl.lab !== "sadi") return false;
      if (filterLab === "none" && cl.lab !== null) return false;
      if (q && !cl.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clients, filterCat, filterLab, search]);

  const setLab = (id, lab) => {
    setClients((prev) =>
      prev.map((cl) => (cl.id === id ? { ...cl, lab: cl.lab === lab ? null : lab } : cl))
    );
  };

  const setCamion = (id, camion) => {
    setClients((prev) => prev.map((cl) => (cl.id === id ? { ...cl, camion: camion || null } : cl)));
  };

  const bulkAssign = (lab) => {
    const ids = new Set(visible.map((v) => v.id));
    setClients((prev) => prev.map((cl) => (ids.has(cl.id) ? { ...cl, lab } : cl)));
  };

  const addClient = () => {
    const name = newName.trim().toUpperCase();
    if (!name) return;
    setClients((prev) => [
      ...prev,
      { id: `c${Date.now()}`, name, category: newCat, lab: null, camion: null },
    ]);
    setNewName("");
  };

  const removeClient = (id) => {
    setClients((prev) => prev.filter((cl) => cl.id !== id));
  };

  const addCamion = () => {
    const n = newCamion.trim();
    if (!n || camions.includes(n)) return;
    setCamions((prev) => [...prev, n]);
    setNewCamion("");
  };

  const removeCamion = (name) => {
    setCamions((prev) => prev.filter((c) => c !== name));
    setClients((prev) => prev.map((cl) => (cl.camion === name ? { ...cl, camion: null } : cl)));
  };

  const doReset = () => {
    if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 4000); return; }
    setClients(buildInitialClients());
    setCamions(DEFAULT_CAMIONS);
    setConfirmReset(false);
  };

  const catLabel = (c) => (c === "reguliers" ? "Régulier" : "Centre aéré");

  // Groupement pour la vue impression : par labo puis par camion
  const printGroups = useMemo(() => {
    const group = (lab) => {
      const list = clients.filter((c) => c.lab === lab);
      const byCamion = {};
      list.forEach((c) => {
        const k = c.camion || "Sans camion";
        (byCamion[k] = byCamion[k] || []).push(c);
      });
      return { total: list.length, byCamion };
    };
    return {
      cana: group("cana"),
      sadi: group("sadi"),
      none: clients.filter((c) => c.lab === null),
    };
  }, [clients]);

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>

      {/* ===== ÉCRAN ===== */}
      <div className="print:hidden">
        {/* En-tête */}
        <header className="bg-stone-900 text-stone-100">
          <div className="max-w-6xl mx-auto px-4 py-5 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-stone-700 flex items-center justify-center">
                <ChefHat size={22} />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight tracking-wide uppercase">Répartition des livraisons</h1>
                <p className="text-stone-400 text-xs">Qui fabrique quoi — La Table de Cana / Sadi Carnot</p>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-sm">
              <span className="px-3 py-1.5 rounded bg-emerald-600 font-semibold">Cana : {counts.cana}</span>
              <span className="px-3 py-1.5 rounded bg-sky-700 font-semibold">Sadi Carnot : {counts.sadi}</span>
              <span className="px-3 py-1.5 rounded bg-stone-600 font-semibold">Non affectés : {counts.none}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3 py-2 rounded bg-stone-100 text-stone-900 text-sm font-semibold hover:bg-white"
              >
                <Printer size={16} /> Imprimer pour le chef
              </button>
              <button
                onClick={doReset}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold ${confirmReset ? "bg-red-600 text-white" : "bg-stone-700 text-stone-200 hover:bg-stone-600"}`}
              >
                <RotateCcw size={16} /> {confirmReset ? "Confirmer ?" : "Réinitialiser"}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-5">
          {/* Barre de statut sauvegarde */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-3">
            <Save size={13} />
            {saveState === "saving" && "Enregistrement…"}
            {saveState === "saved" && "Répartition enregistrée automatiquement"}
            {saveState === "error" && <span className="text-red-600">Échec de l'enregistrement — vos derniers changements ne sont peut-être pas sauvegardés</span>}
            {saveState === "idle" && "Les modifications s'enregistrent automatiquement"}
          </div>

          {/* Camions */}
          <section className="bg-white border border-stone-200 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-700 mr-2">
                <Truck size={16} /> Camions
              </span>
              {camions.map((c) => (
                <span key={c} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 border border-stone-300 text-sm">
                  {c}
                  <button onClick={() => removeCamion(c)} className="text-stone-400 hover:text-red-600" aria-label={`Supprimer ${c}`}>
                    <X size={13} />
                  </button>
                </span>
              ))}
              <input
                value={newCamion}
                onChange={(e) => setNewCamion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCamion()}
                placeholder="Nouveau camion…"
                className="px-2.5 py-1 rounded border border-stone-300 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-stone-400"
              />
              <button onClick={addCamion} className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 text-white text-sm hover:bg-stone-700">
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </section>

          {/* Filtres */}
          <section className="bg-white border border-stone-200 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded overflow-hidden border border-stone-300">
                {[["all", "Tous"], ["reguliers", "Réguliers"], ["centres", "Centres aérés"]].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setFilterCat(v)}
                    className={`px-3 py-1.5 text-sm font-medium ${filterCat === v ? "bg-stone-900 text-white" : "bg-white text-stone-700 hover:bg-stone-100"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="flex rounded overflow-hidden border border-stone-300">
                {[["all", "Tout voir"], ["cana", "Cana"], ["sadi", "Sadi Carnot"], ["none", "Non affectés"]].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setFilterLab(v)}
                    className={`px-3 py-1.5 text-sm font-medium ${filterLab === v ? "bg-stone-900 text-white" : "bg-white text-stone-700 hover:bg-stone-100"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un client…"
                  className="pl-8 pr-3 py-1.5 rounded border border-stone-300 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-stone-500">{visible.length} affiché(s) →</span>
                <button onClick={() => bulkAssign("cana")} className="px-2.5 py-1.5 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700">Tout → Cana</button>
                <button onClick={() => bulkAssign("sadi")} className="px-2.5 py-1.5 rounded bg-sky-700 text-white font-medium hover:bg-sky-800">Tout → Sadi Carnot</button>
                <button onClick={() => bulkAssign(null)} className="px-2.5 py-1.5 rounded bg-stone-500 text-white font-medium hover:bg-stone-600">Tout retirer</button>
              </div>
            </div>
          </section>

          {/* Liste des clients */}
          <section className="bg-white border border-stone-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-stone-800 text-stone-200 text-xs font-bold uppercase tracking-wide">
              <div className="col-span-5">Client</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-3">Site de fabrication</div>
              <div className="col-span-2">Camion</div>
            </div>
            {visible.length === 0 && (
              <div className="px-4 py-8 text-center text-stone-500 text-sm">
                Aucun client ne correspond à ces filtres. Modifiez la recherche ou les filtres ci-dessus.
              </div>
            )}
            {visible.map((cl) => (
              <div
                key={cl.id}
                className={`grid grid-cols-12 gap-2 items-center px-4 py-2 border-t border-stone-100 ${cl.lab === "cana" ? "bg-emerald-50/60" : cl.lab === "sadi" ? "bg-sky-50/60" : ""}`}
              >
                <div className="col-span-5 flex items-center gap-2 min-w-0">
                  <button onClick={() => removeClient(cl.id)} className="text-stone-300 hover:text-red-600 shrink-0" title="Supprimer ce client" aria-label={`Supprimer ${cl.name}`}>
                    <X size={14} />
                  </button>
                  <span className="font-semibold text-sm truncate">{cl.name}</span>
                </div>
                <div className="col-span-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${cl.category === "reguliers" ? "bg-amber-50 border-amber-300 text-amber-800" : "bg-violet-50 border-violet-300 text-violet-800"}`}>
                    {catLabel(cl.category)}
                  </span>
                </div>
                <div className="col-span-3 flex gap-1.5">
                  <button
                    onClick={() => setLab(cl.id, "cana")}
                    className={`px-2.5 py-1 rounded text-xs font-bold ${cl.lab === "cana" ? "bg-emerald-600 text-white" : "bg-white border border-stone-300 text-stone-600 hover:border-emerald-500 hover:text-emerald-700"}`}
                  >
                    CANA
                  </button>
                  <button
                    onClick={() => setLab(cl.id, "sadi")}
                    className={`px-2.5 py-1 rounded text-xs font-bold ${cl.lab === "sadi" ? "bg-sky-700 text-white" : "bg-white border border-stone-300 text-stone-600 hover:border-sky-600 hover:text-sky-800"}`}
                  >
                    SADI CARNOT
                  </button>
                </div>
                <div className="col-span-2">
                  <select
                    value={cl.camion || ""}
                    onChange={(e) => setCamion(cl.id, e.target.value)}
                    className="w-full px-2 py-1 rounded border border-stone-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-stone-400"
                  >
                    <option value="">— aucun —</option>
                    {camions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </section>

          {/* Ajouter un client */}
          <section className="mt-4">
            {!showAdd ? (
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-3 py-2 rounded bg-stone-800 text-white text-sm font-semibold hover:bg-stone-700">
                <Plus size={16} /> Ajouter un client
              </button>
            ) : (
              <div className="bg-white border border-stone-200 rounded-lg p-4 flex flex-wrap items-center gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addClient()}
                  placeholder="Nom du client…"
                  className="px-3 py-1.5 rounded border border-stone-300 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-stone-400"
                />
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="px-2 py-1.5 rounded border border-stone-300 text-sm bg-white"
                >
                  <option value="reguliers">Régulier</option>
                  <option value="centres">Centre aéré</option>
                </select>
                <button onClick={addClient} className="px-3 py-1.5 rounded bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800">Ajouter</button>
                <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded bg-stone-200 text-stone-700 text-sm hover:bg-stone-300">Fermer</button>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* ===== IMPRESSION (feuille pour le chef de cuisine) ===== */}
      <div className="hidden print:block p-6 text-stone-900 bg-white">
        <div className="border-b-4 border-stone-900 pb-2 mb-4">
          <h1 className="text-2xl font-black uppercase tracking-wide">Répartition de fabrication</h1>
          <p className="text-sm">Édité le {today} — Cana : {counts.cana} clients · Sadi Carnot : {counts.sadi} clients · Non affectés : {counts.none}</p>
        </div>

        {[["cana", printGroups.cana], ["sadi", printGroups.sadi]].map(([key, g]) => (
          <div key={key} className="mb-6">
            <h2 className={`text-lg font-black uppercase px-2 py-1 text-white ${key === "cana" ? "bg-emerald-700" : "bg-sky-800"}`}>
              {LAB[key].label} — {g.total} client(s)
            </h2>
            {Object.keys(g.byCamion).sort().map((cam) => (
              <div key={cam} className="mt-2">
                <h3 className="text-sm font-bold uppercase border-b border-stone-400 pb-0.5">🚚 {cam} — {g.byCamion[cam].length} client(s)</h3>
                <div className="grid grid-cols-3 gap-x-6">
                  {g.byCamion[cam].map((c) => (
                    <div key={c.id} className="text-sm py-0.5 border-b border-dotted border-stone-300 flex justify-between">
                      <span>{c.name}</span>
                      <span className="text-stone-500 text-xs">{catLabel(c.category)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {g.total === 0 && <p className="text-sm italic text-stone-500 mt-1">Aucun client affecté à ce site.</p>}
          </div>
        ))}

        {printGroups.none.length > 0 && (
          <div>
            <h2 className="text-lg font-black uppercase px-2 py-1 bg-stone-500 text-white">Non affectés — {printGroups.none.length}</h2>
            <div className="grid grid-cols-3 gap-x-6 mt-1">
              {printGroups.none.map((c) => (
                <div key={c.id} className="text-sm py-0.5 border-b border-dotted border-stone-300">{c.name}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
