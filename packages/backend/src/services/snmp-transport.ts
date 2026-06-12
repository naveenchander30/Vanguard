import snmp from 'net-snmp';
import type { SnmpTransport, SnmpVarbind } from './snmp-poller.js';

export function createSnmpSession(host: string, community: string): SnmpTransport {
  const session = snmp.createSession(host, community, {
    version: snmp.Version2c,
    timeout: 5000,
    retries: 1,
  });

  return {
    get(oids: string[]): Promise<SnmpVarbind[]> {
      return new Promise((resolve, reject) => {
        session.get(oids, (error, varbinds) => {
          if (error) {
            reject(error);
            return;
          }
          const list = varbinds ?? [];
          resolve(
            list.map((vb) => ({
              oid: vb.oid,
              value: typeof vb.value === 'number'
                ? vb.value
                : vb.value != null
                  ? String(vb.value)
                  : undefined,
            })),
          );
        });
      });
    },

    async close() {
      session.close();
    },
  };
}
