// @ts-check
import { useMemo } from "react";
import { pmsApi, staffApi } from "../api/apiClient";
import { useAuth } from "./useAuth";
import { useLiveFeed } from "./useLiveFeed";

/**
 * Actions du staff sur les tickets / commandes / séjours (remplace les
 * callbacks onResolveTicket, onAdvanceOrder… passés en props).
 * Extrait tel quel de LuxePassApp — même logique :
 * pas de refresh manuel pour tickets/maintenance/commandes, la mise à jour
 * arrive via l'événement SSE déclenché par la route côté backend.
 */
/** @returns {import("../types").StaffActions} */
export function useStaffActions() {
  const { staffToken, staffHotelId } = useAuth();
  const { refreshPmsSideData } = useLiveFeed();

  return useMemo(() => {
    const ready = () => staffToken && staffHotelId;
    return {
      resolveTicket: async (id) => {
        if (!ready()) return;
        await pmsApi.resolveTicket(staffHotelId, id, "done").catch(() => {});
      },
      resolveMaintenance: async (id) => {
        if (!ready()) return;
        await pmsApi.resolveMaintenance(staffHotelId, id, "done").catch(() => {});
      },
      advanceOrder: async (id, nextStatus) => {
        if (!ready()) return;
        await pmsApi.advanceOrderStatus(staffHotelId, id, nextStatus).catch(() => {});
      },
      markPmsSynced: async (stayId) => {
        if (!ready()) return;
        await staffApi.markPmsSynced(staffHotelId, stayId).catch(() => {});
        refreshPmsSideData();
      },
      digitalCheckout: async (stayId) => {
        if (!stayId || !ready()) return;
        // Route STAFF dédiée : POST /stays/:stayId/checkout exige le stayToken du
        // client (ACTION 1, PHASE 0), que la réception ne possède pas.
        await staffApi.checkoutStay(staffHotelId, stayId).catch(() => {});
        refreshPmsSideData();
      },
    };
  }, [staffToken, staffHotelId, refreshPmsSideData]);
}
