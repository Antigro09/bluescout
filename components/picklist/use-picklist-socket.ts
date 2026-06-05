"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { REALTIME_PATH, RT, type PresenceUser } from "@/lib/realtime/events";

/** Join a picklist room: tracks presence and fires onChanged on remote edits. */
export function usePicklistSocket(
  picklistId: string,
  user: PresenceUser,
  onChanged: () => void,
) {
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const changedRef = useRef(onChanged);
  changedRef.current = onChanged;

  useEffect(() => {
    const socket: Socket = io({ path: REALTIME_PATH });
    socket.on("connect", () => {
      socket.emit(RT.joinPicklist, { picklistId, user });
    });
    socket.on(RT.presence, (users: PresenceUser[]) => setPresence(users));
    socket.on(RT.changed, () => changedRef.current());
    return () => {
      socket.emit(RT.leavePicklist);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picklistId]);

  return { presence };
}
