import { useState } from "react";
import { Check, Package, Plus, Settings, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import GoldButton from "@shared/components/common/GoldButton";
import Modal from "@shared/components/common/Modal";
import { SERVICES_CATALOG } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// HOTEL PMS
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// PMS MODULE — GESTION DES SERVICES (internes / externes, prix)
// ─────────────────────────────────────────────────────────────
export default function ServicesManager({ hotel }) {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // service being edited, or null = new
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [form, setForm] = useState({ name: "", category: "", type: "interne", provider: "", price: "" });
  const services = appState.services || SERVICES_CATALOG;

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", category: "", type: "interne", provider: "", price: "" });
    setModalOpen(true);
  };

  const openEdit = (svc) => {
    setEditing(svc);
    setForm({ name: svc.name, category: svc.category, type: svc.type, provider: svc.provider || "", price: svc.price });
    setModalOpen(true);
  };

  const saveService = () => {
    if (!form.name.trim()) return;
    setAppState(prev => {
      const list = prev.services || SERVICES_CATALOG;
      if (editing) {
        return { ...prev, services: list.map(s => s.id === editing.id ? { ...s, ...form, price: Number(form.price) || 0 } : s) };
      }
      const newSvc = { id: `sv_${Date.now()}`, ...form, price: Number(form.price) || 0, active: true };
      return { ...prev, services: [newSvc, ...list] };
    });
    setModalOpen(false);
  };

  const toggleActive = (id) => {
    setAppState(prev => ({ ...prev, services: (prev.services || SERVICES_CATALOG).map(s => s.id === id ? { ...s, active: !s.active } : s) }));
  };

  const deleteService = (id) => {
    setAppState(prev => ({ ...prev, services: (prev.services || SERVICES_CATALOG).filter(s => s.id !== id) }));
    setConfirmDeleteId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2"><Package size={16} style={{ color: gold }} />{t.manageServices}</h3>
          <p className="text-white/40 text-xs mt-0.5">{t.manageServicesSub}</p>
        </div>
        <GoldButton onClick={openNew} className="text-xs px-3 py-2 flex-shrink-0"><Plus size={14} />{t.newService}</GoldButton>
      </div>

      {services.length === 0 ? (
        <GlassCard className="p-6 text-center text-white/40 text-sm">{t.noServices}</GlassCard>
      ) : (
        <div className="space-y-2">
          {services.map(svc => (
            <GlassCard key={svc.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-white font-medium text-sm">{svc.name}</p>
                    <GoldBadge className={svc.active ? "" : "opacity-40"}>
                      {svc.type === "interne" ? t.internal : t.external}
                    </GoldBadge>
                  </div>
                  <p className="text-white/40 text-xs">{svc.category}{svc.provider ? ` • ${svc.provider}` : ""}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm" style={{ color: gold }}>{svc.price} {hotel.currencySymbol}</p>
                  {svc.duration && <p className="text-white/30 text-[10px]">{svc.duration}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <button onClick={() => toggleActive(svc.id)} className="flex items-center gap-1.5 text-xs" style={{ color: svc.active ? "#34d399" : "rgba(255,255,255,0.3)" }}>
                  {svc.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {svc.active ? t.active : t.inactive}
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(svc)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(212,175,55,0.1)", color: gold }}>
                    <Settings size={11} />{t.edit}
                  </button>
                  {confirmDeleteId === svc.id ? (
                    <button onClick={() => deleteService(svc.id)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/20 text-red-400">
                      <Check size={11} />{t.confirmDelete}
                    </button>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(svc.id)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/10 text-red-400">
                      <Trash2 size={11} />{t.delete}
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t.editService : t.newService}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">{t.serviceName}</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">{t.serviceCategory}</label>
            <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">{t.serviceType}</label>
            <div className="flex gap-2">
              {["interne", "externe"].map(ty => (
                <button key={ty} onClick={() => setForm({ ...form, type: ty })}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                  style={form.type === ty ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                  {ty === "interne" ? t.internal : t.external}
                </button>
              ))}
            </div>
          </div>
          {form.type === "externe" && (
            <div>
              <label className="text-xs text-white/40 mb-1 block">{t.provider}</label>
              <input value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}
                className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                style={{ borderColor: "rgba(212,175,55,0.2)" }} />
            </div>
          )}
          <div>
            <label className="text-xs text-white/40 mb-1 block">{t.price} ({hotel.currencySymbol})</label>
            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
          <GoldButton onClick={saveService} className="w-full mt-2"><Check size={14} />{t.save}</GoldButton>
        </div>
      </Modal>
    </div>
  );
}
