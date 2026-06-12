import type { ParsedTelemetry } from './kismet-parser.js';
import type { ChannelScore } from './scoring-engine.js';
import { calculateScores } from './scoring-engine.js';
import { getPrisma } from '../db/prisma.js';

export async function computeScoresFromTelemetry(
  entries: ParsedTelemetry[],
): Promise<ChannelScore[]> {
  const prisma = getPrisma();
  const known = await prisma.knownInfrastructure.findMany();
  const knownBssids = known.map((k) => k.bssid);
  const scores = calculateScores(entries, knownBssids);

  if (scores.length > 0) {
    await prisma.congestionScore.createMany({
      data: scores.map((s) => ({
        channel: s.channel,
        band: s.band,
        score: s.score,
        breakdown: s.breakdown,
      })),
    });
  }

  return scores;
}
