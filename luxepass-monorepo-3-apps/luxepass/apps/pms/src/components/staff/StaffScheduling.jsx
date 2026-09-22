import { useState } from "react";
import { CalendarClock, Check, Plus, Settings, Trash2 } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";
import Modal from "@shared/components/common/Modal";
import { STAFF_DEPARTMENTS, STAFF_MEMBERS, STAFF_SCHEDULE } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE — PLANNING DE L'ÉQUIPE
// ─────────────────────────────────────────────────────────────
export default function StaffScheduling() {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const schedule = appState.staffSchedule || STAFF_SCHEDULE;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // id of shift being edited, or null = new
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const DAY_OPTIONS = ["Aujourd'hui", "Demain", "Après-demain"];
  const emptyForm = { staffId: "", name: "", role: "", start: "09:00", end: "17:00", day: "Aujourd'hui" };
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };

  const openEdit = (s) => {
    setEditingId(s.id);
    const [start, end] = (s.shift || "").split("–").map(x => x?.trim() || "");
    setForm({ staffId: s.staffId || "", name: s.name, role: s.role, start: start || "09:00", end: end || "17:00", day: s.day });
    setModalOpen(true);
  };

  const pickStaffMember = (id) => {
    if (!id) { setForm({ ...form, staffId: "" }); return; }
    const member = STAFF_MEMBERS.find(m => m.id === id);
    setForm({ ...form, staffId: id, name: member?.name || form.name, role: member?.role || form.role });
  };

  const saveShift = () => {
    if (!form.name.trim() || !form.role.trim()) return;
    const shift = `${form.start}–${form.end}`;
    setAppState(prev => {
      const list = prev.staffSchedule || STAFF_SCHEDULE;
      if (editingId) {
        return {
          ...prev,
          staffSchedule: list.map(s => s.id === editingId ? { ...s, staffId: form.staffId || null, name: form.name, role: form.role, shift, day: form.day } : s),
          auditLog: [{ id: `al_${Date.now()}`, action: `Planning modifié — ${form.name} (${form.day}, ${shift})`, time: "à l'instant" }, ...(prev.auditLog || [])],
        };
      }
      const newShift = { id: `st_${Date.now()}`, staffId: form.staffId || null, name: form.name, role: form.role, shift, day: form.day };
      return {
        ...prev,
        staffSchedule: [newShift, ...list],
        auditLog: [{ id: `al_${Date.now()}`, action: `Créneau ajouté au planning — ${form.name} (${form.day}, ${shift})`, time: "à l'instant" }, ...(prev.auditLog || [])],
      };
    });
    setModalOpen(false);
  };

  const deleteShift = (id) => {
    const s = schedule.find(x => x.id === id);
    setAppState(prev => ({
      ...prev,
      staffSchedule: (prev.staffSchedule || STAFF_SCHEDULE).filter(x => x.id !== id),
      auditLog: s ? [{ id: `al_${Date.now()}`, action: `Créneau supprimé du planning — ${s.name} (${s.day}, ${s.shift})`, time: "à l'instant" }, ...(prev.auditLog || [])] : (prev.auditLog || []),
    }));
    setConfirmDeleteId(null);
  };

  const groupedDays = [...DAY_OPTIONS, ...Array.from(new Set(schedule.map(s => s.day).filter(d => !DAY_OPTIONS.includes(d))))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2"><CalendarClock size={16} style={{ color: gold }} />{t.staffingTitle}</h3>
          <p className="text-white/40 text-xs mt-1">{t.staffingSub}</p>
        </div>
        <GoldButton onClick={openNew} className="text-xs px-3 py-2 flex-shrink-0"><Plus size={14} />Ajouter</GoldButton>
      </div>

      {schedule.length === 0 ? (
        <GlassCard className="p-6 text-center text-white/40 text-sm">Aucun créneau planifié. Ajoutez le premier créneau du jour.</GlassCard>
      ) : (
        groupedDays.map(day => {
          const shifts = schedule.filter(s => s.day === day);
          if (shifts.length === 0) return null;
          return (
            <div key={day}>
              <h4 className="text-white/50 text-xs uppercase tracking-wider mb-2">{day} <span className="text-white/25 normal-case">({shifts.length})</span></h4>
              <div className="space-y-2">
                {shifts.map(s => (
                  <GlassCard key={s.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                          {s.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{s.name}</p>
                          <p className="text-white/40 text-xs truncate">{s.role}</p>
                        </div>
                      </div>
                      <p className="text-xs font-semibold flex-shrink-0" style={{ color: gold }}>{s.shift}</p>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                      <button onClick={() => openEdit(s)} className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(212,175,55,0.1)", color: gold }}>
                        <Settings size={10} />{t.edit}
                      </button>
                      {confirmDeleteId === s.id ? (
                        <button onClick={() => deleteShift(s.id)} className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/20 text-red-400">
                          <Check size={10} />{t.confirmDelete}
                        </button>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(s.id)} className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 bg-red-500/10 text-red-400">
                          <Trash2 size={10} />{t.delete}
                        </button>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          );
        })
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Modifier le créneau" : "Nouveau créneau"}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Collaborateur (hiérarchie)</label>
            <select value={form.staffId} onChange={e => pickStaffMember(e.target.value)}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }}>
              <option value="" style={{ background: "#111" }}>— Saisie libre —</option>
              {STAFF_DEPARTMENTS.map(dept => (
                <optgroup key={dept} label={dept} style={{ background: "#111" }}>
                  {STAFF_MEMBERS.filter(m => m.department === dept).map(m => (
                    <option key={m.id} value={m.id} style={{ background: "#111" }}>{m.name} — {m.role}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Nom</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Poste</label>
            <input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
              style={{ borderColor: "rgba(212,175,55,0.2)" }} />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-white/40 mb-1 block">Début</label>
              <input type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })}
                className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                style={{ borderColor: "rgba(212,175,55,0.2)" }} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-white/40 mb-1 block">Fin</label>
              <input type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })}
                className="w-full bg-white/5 border rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                style={{ borderColor: "rgba(212,175,55,0.2)" }} />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Jour</label>
            <div className="flex gap-2">
              {DAY_OPTIONS.map(d => (
                <button key={d} onClick={() => setForm({ ...form, day: d })}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                  style={form.day === d ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <GoldButton onClick={saveShift} className="w-full mt-2"><Check size={14} />{t.save}</GoldButton>
        </div>
      </Modal>
    </div>
  );
}
