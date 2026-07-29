export interface LeaderElection {
  isLeader(): boolean;
  start(): void;
  stop(): void;
}

const HEARTBEAT_MS = 2_000;
const PEER_TIMEOUT_MS = 6_000;

/**
 * BroadcastChannel-based leader election so N open tabs don't all spin the
 * evaluation loop. This is an OPTIMIZATION ONLY: the transactional lease
 * claim in the run store is the real correctness mechanism, so two tabs that
 * both believe they are leader still cannot double-run a card.
 */
export function createLeaderElection(
  channelName: string,
  clientId: string,
  opts?: { now?: () => number },
): LeaderElection {
  const now = opts?.now ?? (() => Date.now());
  const supported = typeof BroadcastChannel !== 'undefined';

  let channel: BroadcastChannel | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const peers = new Map<string, number>();
  let started = false;

  return {
    isLeader() {
      if (!supported || !started) return true;
      const cutoff = now() - PEER_TIMEOUT_MS;
      for (const [id, ts] of peers) {
        if (ts < cutoff) peers.delete(id);
      }
      for (const id of peers.keys()) {
        if (id < clientId) return false;
      }
      return true;
    },

    start() {
      if (started || !supported) return;
      started = true;
      channel = new BroadcastChannel(channelName);
      channel.onmessage = event => {
        const id = (event.data as { clientId?: string })?.clientId;
        if (typeof id === 'string' && id !== clientId) {
          peers.set(id, now());
        }
      };
      const beat = () => channel?.postMessage({ clientId, ts: now() });
      beat();
      heartbeat = setInterval(beat, HEARTBEAT_MS);
    },

    stop() {
      if (!started) return;
      started = false;
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      channel?.close();
      channel = null;
      peers.clear();
    },
  };
}
