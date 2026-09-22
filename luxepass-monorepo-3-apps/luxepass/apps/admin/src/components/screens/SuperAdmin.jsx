import { useState, useEffect } from "react";
import { AlertTriangle, BrainCircuit, Building2, Check, ChevronRight, DollarSign, Globe2, Hash, Hotel, Plus, Server, Settings, Shield, Trash2, TrendingUp, Users } from "lucide-react";
import { gold, goldDark, handleImgError } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import GoldButton from "@shared/components/common/GoldButton";
import KpiCard from "@shared/components/common/KpiCard";
import Modal from "@shared/components/common/Modal";
import { ADMIN_HOTELS, EMPTY_PARTNER_HOTEL, makePartnerId } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// SUPER ADMIN CONSOLE
// ─────────────────────────────────────────────────────────────
export default function SuperAdmin({ partnerHotels = [], persistPartnerHotels, allAdminHotels, allClientHotels = [], onOpenPMS, currentPMSHotelId = null }) {
  const { t } = useI18n();
  const { storageAvailable } = useAppState();
  const [activeSection, setActiveSection] = useState("network");
  const adminHotels = allAdminHotels || ADMIN_HOTELS;
  const [modules, setModules] = useState(
    Object.fromEntries(adminHotels.map(h => [h.id, new Set(h.modules)]))
  );

  // Ré-initialise les toggles de modules quand un nouvel hôtel partenaire apparaît,
  // sans écraser les toggles déjà en place pour les hôtels existants.
  useEffect(() => {
    setModules(prev => {
      const next = { ...prev };
      adminHotels.forEach(h => { if (!next[h.id]) next[h.id] = new Set(h.modules); });
      return next;
    });
  }, [adminHotels.length]);

  const toggleModule = (hotelId, mod) => {
    setModules(prev => {
      const s = new Set(prev[hotelId]);
      s.has(mod) ? s.delete(mod) : s.add(mod);
      const next = { ...prev, [hotelId]: s };
      // Si c'est un hôtel partenaire, on persiste aussi ses modules dans le stockage durable
      const partner = partnerHotels.find(p => p.id === hotelId);
      if (partner && persistPartnerHotels) {
        persistPartnerHotels(partnerHotels.map(p => p.id === hotelId ? { ...p, modules: Array.from(s) } : p));
      }
      return next;
    });
  };

  const allModules = ["checkin", "menu", "spa", "yacht", "tennis", "golf", "events"];
  const totalMRR = adminHotels.reduce((s, h) => s + h.mrr, 0);
  const activeCount = adminHotels.filter(h => h.status === "active").length;
  const pendingCount = adminHotels.length - activeCount;

  // ── État du formulaire d'ajout / édition d'hôtel partenaire ──
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [editingPartnerId, setEditingPartnerId] = useState(null);
  const [form, setForm] = useState(EMPTY_PARTNER_HOTEL);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const openNewHotel = () => { setEditingPartnerId(null); setForm(EMPTY_PARTNER_HOTEL); setHotelModalOpen(true); };
  const openEditHotel = (h) => { setEditingPartnerId(h.id); setForm({ ...EMPTY_PARTNER_HOTEL, ...h }); setHotelModalOpen(true); };

  const saveHotel = () => {
    if (!form.name.trim() || !persistPartnerHotels) return;
    if (editingPartnerId) {
      persistPartnerHotels(partnerHotels.map(p => p.id === editingPartnerId ? { ...p, ...form } : p));
    } else {
      const newHotel = { id: makePartnerId(form.name), ...form, guests: 0, mrr: 0, status: "pending", modules: ["checkin"] };
      persistPartnerHotels([...partnerHotels, newHotel]);
    }
    setHotelModalOpen(false);
  };

  const deleteHotel = (id) => {
    if (persistPartnerHotels) persistPartnerHotels(partnerHotels.filter(p => p.id !== id));
    setConfirmDeleteId(null);
  };

  const sections = [
    { key: "network", label: t.networkStats, icon: Globe2 },
    { key: "partners", label: "Hôtels Partenaires", icon: Building2 },
    { key: "billing", label: t.billing, icon: DollarSign },
    { key: "provisioning", label: t.provisioning, icon: Settings },
  ];

  return (
    <div className="min-h-screen px-4 py-6 space-y-6" style={{ background: "#080808" }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)" }}>
          <Shield size={20} style={{ color: gold }} />
        </div>
        <div>
          <h2 className="text-white font-bold">{t.superAdmin}</h2>
          <p className="text-xs text-white/40">LuxePass SASU — Governance Center</p>
        </div>
      </div>

      {!storageAvailable && (
        <GlassCard className="p-3 flex items-center gap-2" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-xs">Stockage persistant indisponible dans cet environnement — les hôtels ajoutés resteront le temps de la session uniquement.</p>
        </GlassCard>
      )}

      {/* Section nav */}
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {sections.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveSection(key)}
            className="flex-1 flex-shrink-0 flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-xs font-medium transition-all min-w-[70px]"
            style={activeSection === key ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
            <Icon size={16} />
            <span className="text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>

      {/* NETWORK STATS */}
      {activeSection === "network" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard icon={Building2} label={t.hotels} value={activeCount} sub={`${activeCount} actifs, ${pendingCount} en attente`} />
            <KpiCard icon={Users} label={t.totalUsers} value="—" trend={0} sub="Aucune donnée réseau réelle à ce jour" />
            <KpiCard icon={BrainCircuit} label={t.aiAccuracy} value="—" trend={0} sub="OCR non branché (stub)" />
            <KpiCard icon={TrendingUp} label="Transactions LuxePass" value="—" trend={0} sub="Aucune transaction réelle à ce jour" />
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Server size={16} style={{ color: gold }} /> Architecture technique (état réel, pas de monitoring temps réel)
            </h3>
            <GlassCard className="overflow-hidden">
              {[
                { name: "Backend LuxePass (Node.js / Express)", status: "En mémoire, non hébergé", detail: "Pas de base de données persistante à ce stade" },
                { name: "IA Concierge (API Anthropic)", status: "Réel si clé API configurée", detail: "Repli automatique si absente" },
                { name: "OCR pièce d'identité", status: "Non branché", detail: "Stub — champs renvoyés vides" },
                { name: "Paiement", status: "Simulé", detail: "Jeton de démonstration, aucun PSP réel intégré" },
                { name: "Synchronisation PMS ↔ app client", status: "Polling HTTP (6s)", detail: "Pas de websocket temps réel" },
                { name: "Stockage hôtels partenaires", status: storageAvailable ? "Disponible" : "Indisponible", detail: storageAvailable ? "Stockage navigateur local" : "—" },
              ].map((srv, i, arr) => (
                <div key={srv.name} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b" : ""}`}
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${srv.status.startsWith("Réel") || srv.status === "Disponible" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="text-sm text-white">{srv.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/70">{srv.status}</p>
                    <p className="text-xs text-white/30">{srv.detail}</p>
                  </div>
                </div>
              ))}
            </GlassCard>
          </div>

          {/* Synchronisation PMS ↔ Super Admin — accès direct au PMS de chaque hôtel */}
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Hotel size={16} style={{ color: gold }} /> Aperçu PMS par établissement
            </h3>
            <div className="space-y-2">
              {allClientHotels.map(h => {
                const isOpen = currentPMSHotelId === h.id;
                const isPartner = partnerHotels.some(p => p.id === h.id);
                return (
                  <GlassCard key={h.id} className="p-3 flex items-center gap-3" style={isOpen ? { borderColor: "rgba(212,175,55,0.4)" } : {}}>
                    {h.image ? (
                      <img src={h.image} alt={h.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={handleImgError} />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.1)" }}>
                        <Hotel size={16} style={{ color: gold }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">{h.name}</p>
                        {isPartner && <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>Partenaire</span>}
                      </div>
                      <p className="text-white/40 text-xs truncate">{h.location}</p>
                    </div>
                    {isOpen ? (
                      <span className="text-[10px] font-medium flex items-center gap-1 flex-shrink-0" style={{ color: gold }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: gold }} />Ouvert</span>
                    ) : (
                      <button onClick={() => onOpenPMS && onOpenPMS(h)} className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0" style={{ background: "rgba(212,175,55,0.1)", color: gold }}>
                        <ChevronRight size={12} />Voir le PMS
                      </button>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* HÔTELS PARTENAIRES — onboarding sans toucher au code */}
      {activeSection === "partners" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-white/50 text-xs max-w-[70%]">Ajoutez un nouvel hôtel partenaire — il apparaîtra automatiquement côté client, PMS et dans les autres sections admin.</p>
            <GoldButton onClick={openNewHotel} className="text-xs px-3 py-2 flex-shrink-0"><Plus size={14} />Ajouter</GoldButton>
          </div>

          {partnerHotels.length === 0 ? (
            <GlassCard className="p-6 text-center text-white/40 text-sm">Aucun hôtel partenaire ajouté pour le moment. Les hôtels de base (Oceana, Magic Resort, Radisson) restent gérés dans le code.</GlassCard>
          ) : (
            <div className="space-y-2">
              {partnerHotels.map(h => (
                <GlassCard key={h.id} className="p-4">
                  <div className="flex items-center gap-3">
                    {h.image ? (
                      <img src={h.image} alt={h.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={handleImgError} />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(212,175,55,0.1)" }}>
                        <Hotel size={18} style={{ color: gold }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{h.name}</p>
                      <p className="text-white/40 text-xs truncate">{h.location}</p>
                    </div>
                    <GoldBadge>{h.status === "active" ? "Actif" : "En attente"}</GoldBadge>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    <p className="text-white/30 text-[10px]">{h.rooms} chambres • {h.currencySymbol}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onOpenPMS && onOpenPMS(h)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                        <Hotel size={11} />PMS
                      </button>
                      <button onClick={() => openEditHotel(h)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(212,175,55,0.1)", color: gold }}>
                        <Settings size={11} />Modifier
                      </button>
                      {confirmDeleteId === h.id ? (
                        <button onClick={() => deleteHotel(h.id)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/20 text-red-400">
                          <Check size={11} />Confirmer
                        </button>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(h.id)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/10 text-red-400">
                          <Trash2 size={11} />Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          <Modal open={hotelModalOpen} onClose={() => setHotelModalOpen(false)} title={editingPartnerId ? "Modifier l'hôtel" : "Nouvel hôtel partenaire"}>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {[
                { key: "name", label: "Nom de l'hôtel", placeholder: "ex : Villa Azur Djerba" },
                { key: "location", label: "Localisation", placeholder: "ex : Djerba, Tunisie" },
                { key: "address", label: "Adresse complète", placeholder: "" },
                { key: "phone", label: "Téléphone", placeholder: "+216 ..." },
                { key: "email", label: "Email réservation", placeholder: "resa@..." },
                { key: "image", label: "URL Image (photo hôtel)", placeholder: "https://..." },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-white/40 mb-1 block">{f.label}</label>
                  <input value={form[f.key] || ""} placeholder={f.placeholder} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Devise</label>
                  <input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                    className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Symbole</label>
                  <input value={form.currencySymbol} onChange={e => setForm({ ...form, currencySymbol: e.target.value })}
                    className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Nombre de chambres</label>
                  <input type="number" value={form.rooms} onChange={e => setForm({ ...form, rooms: Number(e.target.value) || 0 })}
                    className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Étoiles</label>
                  <select value={form.stars} onChange={e => setForm({ ...form, stars: Number(e.target.value) })}
                    className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
                    {[3, 4, 5].map(n => <option key={n} value={n} className="bg-black">{n} ★</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Couleur d'accent</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.accent} onChange={e => setForm({ ...form, accent: e.target.value })} className="w-10 h-10 rounded-lg bg-transparent border-0 cursor-pointer" />
                  <input value={form.accent} onChange={e => setForm({ ...form, accent: e.target.value })}
                    className="flex-1 bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Description courte</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                  className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none resize-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
              </div>
              <GoldButton onClick={saveHotel} className="w-full mt-2"><Check size={14} />{editingPartnerId ? "Enregistrer les modifications" : "Ajouter l'hôtel partenaire"}</GoldButton>
            </div>
          </Modal>
        </div>
      )}

      {/* BILLING */}
      {activeSection === "billing" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard icon={DollarSign} label={t.mrr} value={`${totalMRR.toLocaleString()} €`} trend={18} />
            <KpiCard icon={Hash} label="Model : 6€ / nuit / client" value="6 €" sub="Collecté de façon transparente" />
          </div>
          <h3 className="text-white font-semibold">Revenus par Établissement</h3>
          {adminHotels.map(h => (
            <GlassCard key={h.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-medium text-sm">{h.name}</p>
                <GoldBadge>{h.status === "active" ? "Actif" : "En attente"}</GoldBadge>
              </div>
              <div className="flex gap-4">
                <div><p className="text-xs text-white/40">Clients actifs</p><p className="text-white font-bold">{h.guests}</p></div>
                <div><p className="text-xs text-white/40">MRR estimé</p><p className="font-bold" style={{ color: gold }}>{h.mrr} €</p></div>
                <div><p className="text-xs text-white/40">Nuitées traitées</p><p className="text-white font-bold">{Math.round(h.mrr / 6)}</p></div>
              </div>
              {h.mrr > 0 && (
                <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${(h.mrr / 5000) * 100}%`, background: `linear-gradient(90deg, ${gold}, ${goldDark})` }} />
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* PROVISIONING */}
      {activeSection === "provisioning" && (
        <div className="space-y-4">
          <p className="text-white/50 text-sm">Activez ou désactivez les modules fonctionnels par établissement.</p>
          {adminHotels.map(h => (
            <GlassCard key={h.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white font-semibold text-sm">{h.name}</p>
                <span className={`text-xs font-medium ${h.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                  {h.status === "active" ? "● Actif" : "○ En attente"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allModules.map(mod => {
                  const active = modules[h.id]?.has(mod);
                  return (
                    <button key={mod} onClick={() => toggleModule(h.id, mod)}
                      className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                      style={active ? { background: "rgba(212,175,55,0.2)", color: gold, border: `1px solid rgba(212,175,55,0.4)` } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {active ? "✓ " : ""}{mod}
                    </button>
                  );
                })}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
