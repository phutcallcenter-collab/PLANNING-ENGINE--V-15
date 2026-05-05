import type { AgentKPIs } from '@/ui/reports/analysis-beta/types/dashboard.types';

export type RepresentativeIdentity = {
  id: string;
  name: string;
  isActive: boolean;
};

export type RepresentativeLinkMatch = {
  representativeId: string;
  representativeName: string;
  matchType: 'manual_override' | 'exact_normalized';
};

export type ManualRepresentativeLink = {
  agentName: string;
  representativeName: string;
};

export type RepresentativeLinkResolution<T extends RepresentativeIdentity> =
  | ({
      status: 'linked';
      representative: T;
    } & RepresentativeLinkMatch)
  | {
      status: 'omitted';
      agentName: string;
    }
  | {
      status: 'unlinked';
      agentName: string;
    };

export const OMIT_REPRESENTATIVE_LINK = '__OMITIR__';

export function normalizeRepresentativeLinkName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function createRepresentativeLinkResolver<T extends RepresentativeIdentity>(
  representatives: T[],
  manualLinks: ManualRepresentativeLink[] = [],
  options: {
    includeInactive?: boolean;
  } = {}
): (agentName: string | undefined | null) => RepresentativeLinkResolution<T> {
  const filteredRepresentatives = options.includeInactive
    ? representatives
    : representatives.filter((representative) => representative.isActive);
  const representativesByNormalizedName = new Map(
    filteredRepresentatives.map((representative) => [
      normalizeRepresentativeLinkName(representative.name),
      representative,
    ])
  );
  const manualLinksByAgentName = new Map(
    manualLinks.map((link) => [
      normalizeRepresentativeLinkName(link.agentName),
      link.representativeName,
    ])
  );

  return (agentName) => {
    const rawAgentName = String(agentName ?? '').trim();
    const normalizedAgentName = normalizeRepresentativeLinkName(rawAgentName);

    if (!normalizedAgentName) {
      return {
        status: 'unlinked',
        agentName: rawAgentName,
      };
    }

    const manualRepresentativeName = manualLinksByAgentName.get(normalizedAgentName);

    if (manualRepresentativeName) {
      if (
        normalizeRepresentativeLinkName(manualRepresentativeName) ===
        normalizeRepresentativeLinkName(OMIT_REPRESENTATIVE_LINK)
      ) {
        return {
          status: 'omitted',
          agentName: rawAgentName,
        };
      }

      const manualRepresentative = representativesByNormalizedName.get(
        normalizeRepresentativeLinkName(manualRepresentativeName)
      );

      if (manualRepresentative) {
        return {
          status: 'linked',
          representative: manualRepresentative,
          representativeId: manualRepresentative.id,
          representativeName: manualRepresentative.name,
          matchType: 'manual_override',
        };
      }
    }

    const matchedRepresentative = representativesByNormalizedName.get(normalizedAgentName);

    if (!matchedRepresentative) {
      return {
        status: 'unlinked',
        agentName: rawAgentName,
      };
    }

    return {
      status: 'linked',
      representative: matchedRepresentative,
      representativeId: matchedRepresentative.id,
      representativeName: matchedRepresentative.name,
      matchType: 'exact_normalized',
    };
  };
}

export function buildRepresentativeLinkMap(
  rows: AgentKPIs[],
  representatives: RepresentativeIdentity[],
  manualLinks: ManualRepresentativeLink[] = []
): Map<string, RepresentativeLinkMatch> {
  const resolveRepresentative = createRepresentativeLinkResolver(
    representatives,
    manualLinks
  );

  const links = new Map<string, RepresentativeLinkMatch>();

  rows.forEach((row) => {
    if (row.tipo !== 'agente') return;
    const resolution = resolveRepresentative(row.agente);

    if (resolution.status !== 'linked') return;

    links.set(row.agente, {
      representativeId: resolution.representativeId,
      representativeName: resolution.representativeName,
      matchType: resolution.matchType,
    });
  });

  return links;
}

export function summarizeRepresentativeCoverage(
  rows: AgentKPIs[],
  links: Map<string, RepresentativeLinkMatch>
): { totalAgents: number; linkedAgents: number; pendingAgents: number } {
  const totalAgents = rows.filter((row) => row.tipo === 'agente').length;
  const linkedAgents = rows.filter(
    (row) => row.tipo === 'agente' && links.has(row.agente)
  ).length;

  return {
    totalAgents,
    linkedAgents,
    pendingAgents: Math.max(totalAgents - linkedAgents, 0),
  };
}

export function listPendingAgentNames(
  rows: AgentKPIs[],
  links: Map<string, RepresentativeLinkMatch>
): string[] {
  return rows
    .filter((row) => row.tipo === 'agente' && !links.has(row.agente))
    .map((row) => row.agente)
    .sort((left, right) => left.localeCompare(right, 'es'));
}
