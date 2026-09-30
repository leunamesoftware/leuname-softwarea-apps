// Catálogo de planos. Configurável SEM nova versão do app: defina o segredo/variável
// PLANS_JSON com o mesmo formato de DEFAULT_CATALOG. Preços NÃO ficam aqui — vêm da
// Play Store (moeda/imposto locais). Funções essenciais (Ver, Ler, Ouvir, Comunicar)
// são sempre liberadas no app, independentemente do plano.

export interface Plan {
  id: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  productId?: string | null;
  basePlanIds?: string[];
  features: string[];
  limits: Record<string, number>;
}

export interface PlanCatalog {
  version: number;
  monetizationEnabled: boolean;
  defaultPlanId: string;
  plans: Plan[];
}

export const DEFAULT_CATALOG: PlanCatalog = {
  version: 1,
  monetizationEnabled: false,
  defaultPlanId: 'free',
  plans: [
    {
      id: 'free',
      name: { 'pt-BR': 'Gratuito', en: 'Free', es: 'Gratis' },
      productId: null,
      features: ['CLOUD_DESCRIPTION'],
      limits: { cloud_descriptions_per_day: 30 },
    },
    {
      // Exemplo de plano futuro. Só aparece no app quando monetizationEnabled = true
      // e a assinatura "lerguie_plus" existir no Google Play Console.
      id: 'plus',
      name: { 'pt-BR': 'Lerguie Plus', en: 'Lerguie Plus', es: 'Lerguie Plus' },
      description: { 'pt-BR': 'Mais descrições avançadas por dia e recursos extras.' },
      productId: 'lerguie_plus',
      basePlanIds: ['mensal', 'anual'],
      features: ['CLOUD_DESCRIPTION', 'CLOUD_SYNC', 'DOCUMENT_SUMMARY', 'EXPORT'],
      limits: { cloud_descriptions_per_day: 500 },
    },
  ],
};

export function loadCatalog(plansJson?: string): PlanCatalog {
  if (!plansJson) return DEFAULT_CATALOG;
  try {
    const parsed = JSON.parse(plansJson) as PlanCatalog;
    if (!Array.isArray(parsed.plans) || parsed.plans.length === 0) return DEFAULT_CATALOG;
    return parsed;
  } catch {
    return DEFAULT_CATALOG;
  }
}

export function findPlan(catalog: PlanCatalog, id: string | undefined): Plan {
  return catalog.plans.find((p) => p.id === id) ?? catalog.plans.find((p) => p.id === catalog.defaultPlanId) ?? catalog.plans[0];
}
