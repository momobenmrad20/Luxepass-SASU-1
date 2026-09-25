import { useState } from "react";
import { Check, LogOut, ScanFace, Users } from "lucide-react";
import { gold } from "@shared/components/common/theme";
import GlassCard from "@shared/components/common/GlassCard";
import GoldBadge from "@shared/components/common/GoldBadge";
import GoldButton from "@shared/components/common/GoldButton";
import { PMS_GUESTS, ROOMS_STATUS } from "@shared/constants";
import QrVerifyPanel from "./QrVerifyPanel";
import { useAppState } from "@shared/hooks/useAppState";
import { useI18n } from "@shared/hooks/useI18n";
import { useLiveFeed } from "@shared/hooks/useLiveFeed";
import { useStaffActions } from "@shared/hooks/useStaffActions";

// Extrait tel quel de LuxePass.jsx — aucun changement de logique, de props ni de nom.

export default function ManualCheckInOut({ hotel }) {
  const { t } = useI18n();
  const { appState, setAppState } = useAppState();
  const { digitalActiveStays, digitalPendingStays } = useLiveFeed();
  const {
    markPmsSynced: onMarkPmsSynced,
    digitalCheckout: onDigitalCheckout,
    // ⚠️ À AJOUTER dans useStaffActions.ts : doit appeler
    // PATCH /hotels/:hotelId/stays/:stayId/room et retourner { stayId, room }.
    assignStayRoom: onAssignStayRoom,
  } = useStaffActions();
  const [roomAssign, setRoomAssign] = useState({});
  // Saisie locale du numéro de chambre pour les vrais séjours digitaux
  // (distinct de `roomAssign` plus bas, qui reste sur le flux mock existant).
  const [digitalRoomInput, setDigitalRoomInput] = useState({});
  const [toast, setToast] = useState(null);
  const guests = appState.pmsGuests || PMS_GUESTS;
  const digitalInHouse = digitalActiveStays.filter(s => s.stage === "completed");
  const rooms = appState.rooms || ROOMS_STATUS;
  const pending = guests.filter(g => !g.checkedIn);
  const inHouse = guests.filter(g => g.checkedIn);

  const flashToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const confirmCheckin = (guestId) => {
    const room = roomAssign[guestId];
    const guestName = guests.find(g => g.id === guestId)?.name || guestId;
    setAppState(prev => ({
      ...prev,
      pmsGuests: (prev.pmsGuests || PMS_GUESTS).map(g => g.id === guestId
        ? { ...g, checkedIn: true, room: room || g.room, arrival: "Présent", status: "AI Validé" }
        : g),
      rooms: room ? (prev.rooms || ROOMS_STATUS).map(r => r.id === room ? { ...r, status: "occupied" } : r) : prev.rooms,
      auditLog: [{ id: `al_${Date.now()}`, action: `Check-in manuel confirmé — ${guestName} (chambre ${room || "—"})`, time: "à l'instant" }, ...(prev.auditLog || [])],
    }));
    flashToast(t.checkinSuccess);
  };

  const confirmCheckout = (guestId, room) => {
    const guestName = guests.find(g => g.id === guestId)?.name || guestId;
    setAppState(prev => ({
      ...prev,
      pmsGuests: (prev.pmsGuests || PMS_GUESTS).filter(g => g.id !== guestId),
      rooms: (prev.rooms || ROOMS_STATUS).map(r => r.id === room ? { ...r, status: "cleaning" } : r),
      auditLog: [{ id: `al_${Date.now()}`, action: `Check-out manuel confirmé — ${guestName} (chambre ${room})`, time: "à l'instant" }, ...(prev.auditLog || [])],
    }));
    flashToast(t.checkoutSuccess);
  };

  // Assigne la chambre saisie à un vrai séjour digital, puis marque
  // synchronisé — les deux actions restent séparées côté API (routes
  // distinctes) mais regroupées ici en un seul geste pour la réception.
  const assignRoomAndSync = async (stayId) => {
    const room = (digitalRoomInput[stayId] || "").trim();
    if (!room) {
      flashToast("Numéro de chambre requis");
      return;
    }
    try {
      await onAssignStayRoom?.(stayId, room);
      await onMarkPmsSynced?.(stayId);
      setDigitalRoomInput(prev => ({ ...prev, [stayId]: "" }));
      flashToast("Chambre assignée et synchronisée");
    } catch (err) {
      flashToast(err?.message || "Échec de l'assignation");
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: gold, color: "#000" }}>
          {toast}
        </div>
      )}

      <QrVerifyPanel />

      {/* Check-ins digitaux réels — parcours self-service complété par le client */}
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><ScanFace size={16} style={{ color: gold }} />Check-ins digitaux à reprendre en PMS</h3>
        <p className="text-white/40 text-xs mb-3">Complétés via l'app client, pas encore rapprochés (ancien PMS)</p>
        {digitalPendingStays.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">Aucun check-in digital en attente</GlassCard>
        ) : (
          <div className="space-y-2">
            {digitalPendingStays.map(s => (
              <GlassCard key={s.stayId} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white text-sm font-medium">{s.guestData?.firstName} {s.guestData?.lastName}</p>
                    <p className="text-white/40 text-xs">{t.room} {s.room || "—"} • Arrivée {s.guestData?.arrival}</p>
                  </div>
                  {!s.room && (
                    <GoldButton onClick={() => onMarkPmsSynced?.(s.stayId)} className="text-xs px-3 py-1.5 flex-shrink-0">
                      <Check size={13} /> Marquer synchronisé
                    </GoldButton>
                  )}
                </div>
                {/* Tant que la chambre n'est pas connue, on la saisit ici —
                    champ texte libre : il n'existe pas de référentiel de
                    chambres côté backend (pas de modèle Room en base). */}
                {!s.room && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={digitalRoomInput[s.stayId] || ""}
                      onChange={e => setDigitalRoomInput({ ...digitalRoomInput, [s.stayId]: e.target.value })}
                      placeholder="N° de chambre"
                      className="flex-1 bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                      style={{ borderColor: "rgba(212,175,55,0.2)" }}
                    />
                    <GoldButton onClick={() => assignRoomAndSync(s.stayId)} className="text-xs px-3 py-2 flex-shrink-0">
                      <Check size={13} /> Assigner et synchroniser
                    </GoldButton>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Séjours digitaux en cours — check-out réel via le backend */}
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><LogOut size={16} style={{ color: gold }} />Séjours digitaux en cours</h3>
        <p className="text-white/40 text-xs mb-3">Check-out réel (facture le folio, ferme la session)</p>
        {digitalInHouse.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">Aucun séjour digital actif</GlassCard>
        ) : (
          <div className="space-y-2">
            {digitalInHouse.map(s => (
              <GlassCard key={s.stayId} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-medium">{s.guestData?.firstName} {s.guestData?.lastName}</p>
                  <p className="text-white/40 text-xs">{t.room} {s.room || "—"}</p>
                </div>
                <GoldButton variant="ghost" onClick={() => onDigitalCheckout?.(s.stayId)} className="text-xs px-3 py-1.5 flex-shrink-0">
                  <LogOut size={13} /> {t.confirmCheckout}
                </GoldButton>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><Users size={16} style={{ color: gold }} />{t.manualCheckin}</h3>
        <p className="text-white/40 text-xs mb-3">{t.pendingCheckin}</p>
        {pending.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">{t.noPendingCheckin}</GlassCard>
        ) : (
          <div className="space-y-2">
            {pending.map(g => (
              <GlassCard key={g.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{g.nationality}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{g.name}</p>
                      <p className="text-white/40 text-xs">{g.arrival}</p>
                    </div>
                  </div>
                  <GoldBadge>{t.room} {g.room}</GoldBadge>
                </div>
                <div className="flex items-center gap-2">
                  <select value={roomAssign[g.id] || g.room} onChange={e => setRoomAssign({ ...roomAssign, [g.id]: e.target.value })}
                    className="flex-1 bg-white/5 border rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                    style={{ borderColor: "rgba(212,175,55,0.2)" }}>
                    {rooms.filter(r => r.status === "ready" || r.id === g.room).map(r => (
                      <option key={r.id} value={r.id} className="bg-black">{r.id}</option>
                    ))}
                  </select>
                  <GoldButton onClick={() => confirmCheckin(g.id)} className="text-xs px-3 py-2 flex-shrink-0">
                    <Check size={13} />{t.confirmCheckin}
                  </GoldButton>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-white font-semibold flex items-center gap-2 mb-1"><LogOut size={16} style={{ color: gold }} />{t.manualCheckout}</h3>
        <p className="text-white/40 text-xs mb-3">{t.checkedInGuests}</p>
        {inHouse.length === 0 ? (
          <GlassCard className="p-5 text-center text-white/40 text-sm">{t.noCheckedInGuests}</GlassCard>
        ) : (
          <div className="space-y-2">
            {inHouse.map(g => (
              <GlassCard key={g.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{g.nationality}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{g.name}</p>
                    <p className="text-white/40 text-xs">{t.room} {g.room}</p>
                  </div>
                </div>
                <GoldButton variant="ghost" onClick={() => confirmCheckout(g.id, g.room)} className="text-xs px-3 py-1.5 flex-shrink-0">
                  <LogOut size={13} />{t.confirmCheckout}
                </GoldButton>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
