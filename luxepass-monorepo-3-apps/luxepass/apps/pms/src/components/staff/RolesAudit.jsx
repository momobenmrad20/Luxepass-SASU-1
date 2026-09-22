import { useState, useEffect } from "react";
import { Building2, ChevronDown, ChevronRight, ListChecks, Lock, Plus, Search, Trash2, UserCog } from "lucide-react";
import { staffApi } from "@shared/api/apiClient";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldButton from "@shared/components/common/GoldButton";
import { ALL_PMS_MODULES, STAFF_DEPARTMENTS, STAFF_MEMBERS } from "@shared/constants";
import { useAppState } from "@shared/hooks/useAppState";
import { useAuth } from "@shared/hooks/useAuth";
import { useI18n } from "@shared/hooks/useI18n";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

// ─────────────────────────────────────────────────────────────
// MODULE 12 — RÔLES, PERMISSIONS & AUDIT TRAIL
// ─────────────────────────────────────────────────────────────
export default function RolesAudit() {
  const { t } = useI18n();
  const { appState } = useAppState();
  const { staffAuth, staffHotelId } = useAuth();
  const [subTab, setSubTab] = useState("roles");
  const [query, setQuery] = useState("");
  const [openDepts, setOpenDepts] = useState({ "Direction Générale": true });
  const auditLog = appState.auditLog || [];

  // ── Comptes staff réels (backend) — réservé gm/super_admin ──
  const [realStaff, setRealStaff] = useState(null); // null = pas encore chargé / pas autorisé
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ email: "", password: "", role: "reception", name: "" });
  const [staffFormError, setStaffFormError] = useState(null);
  const [staffFormLoading, setStaffFormLoading] = useState(false);
  // MIGRATION SÉCURITÉ : plus un JWT, juste un booléen "session staff active"
  // (le token lui-même vit en cookie HttpOnly, illisible en JS) — cf. staffToken.
  const token = staffAuth?.staff ? true : null;
  const canManageStaff = staffAuth?.staff?.role === "gm" || staffAuth?.staff?.role === "super_admin";

  const refreshRealStaff = () => {
    if (!token || !staffHotelId || !canManageStaff) return;
    staffApi.listStaff(staffHotelId).then(res => setRealStaff(res.staff || [])).catch(() => setRealStaff([]));
  };
  useEffect(() => { refreshRealStaff(); }, [token, staffHotelId, canManageStaff]);

  const submitStaffForm = async () => {
    setStaffFormLoading(true);
    setStaffFormError(null);
    try {
      await staffApi.createStaff(staffHotelId, staffForm);
      setStaffForm({ email: "", password: "", role: "reception", name: "" });
      setStaffFormOpen(false);
      refreshRealStaff();
    } catch (e) {
      setStaffFormError(e.message || "Création impossible");
    } finally {
      setStaffFormLoading(false);
    }
  };

  const removeStaff = async (staffId) => {
    if (!token || !staffHotelId) return;
    await staffApi.deleteStaff(staffHotelId, staffId).catch(() => {});
    refreshRealStaff();
  };

  const ROLE_LABELS = { reception: "Réception", gm: "Directeur Général", housekeeping: "Gouvernante", maintenance: "Maintenance", super_admin: "Super Admin" };

  // Clés réelles des 20 onglets du PMS (voir la barre d'onglets plus bas dans ce fichier).
  const allModuleKeys = ALL_PMS_MODULES;
  const moduleLabels = {
    overview: t.tabOverview, services: t.tabServices, police: t.tabPolice, checkinout: t.tabCheckInOut,
    reservations: t.tabReservations, billing: t.tabBilling, nightaudit: t.tabNightAudit, housekeeping2: t.tabHousekeeping2,
    crm: t.tabCRM, compliance: t.tabCompliance, reporting: t.tabReporting, locks: t.tabLocks, fnb: t.tabFnB,
    roles: t.tabRoles, noshow: t.tabNoShow, intelligence: t.tabIntelligence, events: t.tabEvents,
    loyalty: t.tabLoyalty, familysafety: t.tabFamilySafety, staffing: t.tabStaffing,
  };

  const q = query.trim().toLowerCase();
  const filtered = q
    ? STAFF_MEMBERS.filter(u => u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || u.department.toLowerCase().includes(q))
    : null;

  const toggleDept = (dept) => setOpenDepts(prev => ({ ...prev, [dept]: !prev[dept] }));

  const StaffCard = ({ u }) => (
    <GlassCard key={u.id} className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <UserCog size={16} style={{ color: gold }} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{u.name}</p>
          <p className="text-white/40 text-xs truncate">{u.role}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {allModuleKeys.map(m => (
          <span key={m} className="text-[10px] px-2 py-0.5 rounded-full" style={u.modules.includes(m) ? { background: "rgba(212,175,55,0.15)", color: gold } : { background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.2)" }}>
            {moduleLabels[m] || m}
          </span>
        ))}
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setSubTab("roles")} className="flex-1 py-2 rounded-xl text-xs font-medium" style={subTab === "roles" ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>Équipe & Permissions</button>
        <button onClick={() => setSubTab("audit")} className="flex-1 py-2 rounded-xl text-xs font-medium" style={subTab === "audit" ? { background: gold, color: "#000" } : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>Journal d'audit</button>
      </div>

      {subTab === "roles" && (
        <div className="space-y-3">
          {/* Comptes staff réels — connexion effective au backend */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white/70 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} style={{ color: gold }} />Comptes de connexion réels
              </h4>
              {canManageStaff && (
                <button onClick={() => setStaffFormOpen(o => !o)} className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ background: "rgba(212,175,55,0.15)", color: gold }}>
                  <Plus size={12} />Nouveau compte
                </button>
              )}
            </div>

            {!canManageStaff ? (
              <GlassCard className="p-4 text-center text-white/40 text-xs">Réservé aux rôles Directeur Général / Super Admin — connectez-vous avec un compte GM pour gérer les comptes.</GlassCard>
            ) : (
              <>
                {staffFormOpen && (
                  <GlassCard className="p-4 mb-2 space-y-2">
                    <input value={staffForm.name} onChange={e => setStaffForm(f => ({ ...f, name: e.target.value }))} placeholder="Nom affiché (ex: Amira B.)"
                      className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                    <input type="email" value={staffForm.email} onChange={e => setStaffForm(f => ({ ...f, email: e.target.value }))} placeholder="Email"
                      className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                    <input type="password" value={staffForm.password} onChange={e => setStaffForm(f => ({ ...f, password: e.target.value }))} placeholder="Mot de passe (8 caractères min.)"
                      className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }} />
                    <select value={staffForm.role} onChange={e => setStaffForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
                      {Object.entries(ROLE_LABELS).map(([k, label]) => <option key={k} value={k} style={{ background: "#111" }}>{label}</option>)}
                    </select>
                    {staffFormError && <p className="text-red-400 text-[11px]">{staffFormError}</p>}
                    <GoldButton className="w-full py-2 text-xs" disabled={staffFormLoading || !staffForm.email || staffForm.password.length < 8} onClick={submitStaffForm}>
                      {staffFormLoading ? "Création…" : "Créer le compte"}
                    </GoldButton>
                  </GlassCard>
                )}

                {realStaff === null ? (
                  <GlassCard className="p-4 text-center text-white/40 text-xs">Chargement…</GlassCard>
                ) : realStaff.length === 0 ? (
                  <GlassCard className="p-4 text-center text-white/40 text-xs">Aucun compte pour l'instant</GlassCard>
                ) : (
                  <div className="space-y-2 mb-3">
                    {realStaff.map(s => (
                      <GlassCard key={s.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{s.name || s.email}</p>
                          <p className="text-white/40 text-xs truncate">{s.email} • {ROLE_LABELS[s.role] || s.role}</p>
                        </div>
                        {s.id !== staffAuth?.staff?.id && (
                          <button onClick={() => removeStaff(s.id)} className="text-red-400/70 hover:text-red-400 flex-shrink-0 p-1">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </GlassCard>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-1 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <p className="text-white/40 text-[11px] mb-2">Organigramme (démo, non lié aux comptes de connexion) :</p>
          </div>

          <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
            <Search size={14} className="text-white/40 flex-shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher un collaborateur, un poste, un département..."
              className="bg-transparent text-white text-xs placeholder-white/30 outline-none w-full"
            />
            <span className="text-white/30 text-[10px] flex-shrink-0">{STAFF_MEMBERS.length} postes</span>
          </div>

          {filtered ? (
            filtered.length === 0 ? (
              <GlassCard className="p-6 text-center text-white/40 text-sm">Aucun résultat pour « {query} ».</GlassCard>
            ) : (
              <div className="space-y-2">
                {filtered.map(u => <StaffCard key={u.id} u={u} />)}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {STAFF_DEPARTMENTS.map(dept => {
                const members = STAFF_MEMBERS.filter(u => u.department === dept);
                if (members.length === 0) return null;
                const isOpen = !!openDepts[dept];
                return (
                  <div key={dept}>
                    <button
                      onClick={() => toggleDept(dept)}
                      className="w-full flex items-center justify-between px-1 py-2"
                    >
                      <span className="text-white/70 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 size={12} style={{ color: gold }} />{dept}
                        <span className="text-white/30 normal-case tracking-normal">({members.length})</span>
                      </span>
                      {isOpen ? <ChevronDown size={14} className="text-white/40" /> : <ChevronRight size={14} className="text-white/40" />}
                    </button>
                    {isOpen && (
                      <div className="space-y-2 mb-2">
                        {members.map(u => <StaffCard key={u.id} u={u} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {subTab === "audit" && (
        auditLog.length === 0 ? (
          <GlassCard className="p-6 text-center text-white/40 text-sm">Aucune action enregistrée pour le moment. Les actions du PMS (check-in, check-out, night audit, télédéclaration, clés...) apparaîtront ici automatiquement.</GlassCard>
        ) : (
          <div className="space-y-2">
            {auditLog.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-white/5 rounded-xl p-3">
                <ListChecks size={13} style={{ color: gold }} className="flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-xs truncate">{a.action}</p>
                  <p className="text-white/30 text-[10px]">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
