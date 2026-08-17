import { db } from "@/db/client";
import { aiModels, userModelFavorites } from "@/db/schema";
import { eq, sql, inArray, and, or, ilike, between, asc, desc } from "drizzle-orm";
import type { AIModel, ModelScrapeResult } from "@/types/models";
import type { ModelsSearchParamsType } from "@/features/data-explorer/models/models-search-params";
import type { SQL } from "drizzle-orm";
import { logger } from "@/lib/logger";

// Import sort priorities from route file (shared constants)
// Single provider sort order — drives both default table sort and facet ordering
const PROVIDER_SORT_ORDER = [
  // Tier 1 — Frontier model providers
  "Anthropic",
  "OpenAI",
  "Google AI Studio",
  "DeepSeek",
  "xAI",
  "MoonshotAI",
  "Z.AI",
  "Perplexity",
  "MiniMax",
  "Mistral",
  "Cohere",
  "AI21",
  "Inflection",
  "Amazon Bedrock",
  "Alibaba Cloud",
  "Xiaomi",
  // Tier 2 — Fast inference / dev-favorite hosting
  "Groq",
  "Together",
  "Fireworks",
  "Cerebras",
  "SambaNova",
  "DeepInfra",
  // Tier 3 — Cloud platforms / enterprise
  "Google Vertex",
  "Azure",
  "NVIDIA",
  "Amazon Nova",
  "Cloudflare",
  "Nebius",
  "Crusoe",
  // Tier 4 — Inference platforms / growing
  "BaseTen",
  "Friendli",
  "SiliconFlow",
  "Hyperbolic",
  "Novita",
  "Chutes",
  "Venice",
  // Tier 5 — Specialized / niche
  "Phala",
  "AtlasCloud",
  "Weights and Biases",
  "NextBit",
  "Parasail",
  "NCompass",
  "Inception",
  "Relace",
  "Morph",
  "Infermatic",
  "AionLabs",
  "Mancer",
  "Liquid",
  "OpenInference",
  "GMICloud",
  "Switchpoint",
  "Featherless",
  "InferenceNet",
  // Tier 6 — New dynamic providers
  "Ambient",
  "Arcee AI",
  "Avian",
  "Black Forest Labs",
  "BytePlus",
  "Cirrascale",
  "Clarifai",
  "Inceptron",
  "Io Net",
  "Mara",
  "ModelRun",
  "Modular",
  "Seed",
  "Sourceful",
  "Stealth",
  "StepFun",
  "StreamLake",
  "Upstage",
];

const PROVIDER_SORT_PRIORITY: Record<string, number> = Object.fromEntries(
  PROVIDER_SORT_ORDER.map((name, i) => [name, i + 1]),
);

// Single author sort order — drives facet ordering
const AUTHOR_SORT_ORDER = [
  "OpenAI",
  "Anthropic",
  "xAI",
  "Google",
  "Meta",
  "DeepSeek",
  "Mistral",
  "Cohere",
  "Perplexity",
  "NVIDIA",
  "Microsoft",
  "Qwen",
  "Z.AI",
  "MoonshotAI",
  "Amazon",
  "Alibaba",
  "Baidu",
  "Tencent",
  "ByteDance",
  "AI21",
  "MiniMax",
  "Inflection",
  "Meituan",
  "Liquid",
  "Inception",
  "StepFun",
  "AionLabs",
  "Arcee AI",
  "AllenAI",
  "ArliAI",
  "Deep Cogito",
  "Morph",
  "inclusionAI",
  "Relace",
  "Switchpoint",
  "Nous Research",
  "EleutherAI",
  "NeverSleep",
  "Gryphe",
  "Cognitive Computations",
  "Anthracite",
  "AlfredPros",
  "Mancer",
  "Alpindale",
  "THUDM",
  "OpenGVLab",
  "Sao10K",
  "Undi",
  "Shisa AI",
  "rAIfle",
  "Agentica",
  "TNG",
  "TheDrummer",
  "BAAI",
  "Black Forest Labs",
  "Essential AI",
  "IBM",
  "intfloat",
  "KwaiPilot",
  "Nex AGI",
  "Prime Intellect",
  "Sentence Transformers",
  "Sourceful",
  "StepFun",
  "thenlper",
  "Upstage",
  "Venice",
  "Writer",
  "Xiaomi",
];

const AUTHOR_SORT_PRIORITY: Record<string, number> = Object.fromEntries(
  AUTHOR_SORT_ORDER.map((name, i) => [name, i + 1]),
);

const PROVIDER_PRIORITY_ARRAY_SQL = sql.raw(
  `ARRAY[${PROVIDER_SORT_ORDER.map((provider) => `'${provider.replace(/'/g, "''")}'`).join(", ")}]`,
);

const parseNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const computeModalityScore = (
  inputModalities?: string[] | null,
  outputModalities?: string[] | null,
): number => {
  const inputs = Array.isArray(inputModalities) ? inputModalities : [];
  const outputs = Array.isArray(outputModalities) ? outputModalities : [];
  if (!inputs.length && !outputs.length) {
    return 0;
  }
  const unique = new Set<string>();
  for (const modality of inputs) {
    if (typeof modality === 'string' && modality.trim().length > 0) {
      unique.add(modality);
    }
  }
  for (const modality of outputs) {
    if (typeof modality === 'string' && modality.trim().length > 0) {
      unique.add(modality);
    }
  }
  return unique.size;
};

const providerPriorityExpression = sql<number>`
  COALESCE(
    array_position(${PROVIDER_PRIORITY_ARRAY_SQL}, ${aiModels.provider}),
    999
  )
`;

const buildProviderOrderBy = (isDesc: boolean): SQL<unknown>[] => {
  const direction = isDesc ? sql.raw("DESC") : sql.raw("ASC");
  const providerNameExpr = sql`COALESCE(lower(${aiModels.provider}), '')`;
  return [
    sql`${providerPriorityExpression} ${direction}`,
    sql`${providerNameExpr} ${direction}`,
  ];
};

type AIModelRow = typeof aiModels.$inferSelect;

const mapRowToAIModel = (row: AIModelRow): AIModel => {
  const pricingData = (row.pricing as Record<string, unknown>) || {};
  const promptPrice = parseNullableNumber(
    row.promptPrice !== undefined ? row.promptPrice : pricingData?.prompt,
  );
  const completionPrice = parseNullableNumber(
    row.completionPrice !== undefined ? row.completionPrice : pricingData?.completion,
  );
  const storedModalityScore = typeof row.modalityScore === 'number' ? row.modalityScore : null;
  const modalityScore = storedModalityScore ?? computeModalityScore(row.inputModalities, row.outputModalities);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name || undefined,
    shortName: row.shortName || undefined,
    author: row.author || undefined,
    description: row.description || undefined,
    modelVersionGroupId: row.modelVersionGroupId || undefined,
    contextLength: row.contextLength || undefined,
    inputModalities: row.inputModalities || [],
    outputModalities: row.outputModalities || [],
    hasTextOutput: row.hasTextOutput ?? "false",
    group: row.group || undefined,
    instructType: row.instructType || undefined,
    permaslug: row.permaslug || undefined,
    endpointId: row.endpointId || undefined,
    pricing: pricingData,
    features: row.features as Record<string, unknown>,
    provider: row.provider,
    throughput: parseNullableNumber(row.throughput),
    maxCompletionTokens: row.maxCompletionTokens ?? null,
    supportedParameters: row.supportedParameters || [],
    promptPrice,
    completionPrice,
    modalityScore,
    scrapedAt: row.scrapedAt.toISOString(),
  };
};

function buildModelFilterConditions(search: ModelsSearchParamsType) {
  const conditions: SQL<unknown>[] = [];

  if (search.provider && search.provider.length > 0) {
    conditions.push(inArray(aiModels.provider, search.provider));
  }

  if (search.author && search.author.length > 0) {
    conditions.push(inArray(aiModels.author, search.author));
  }

  if (
    search.contextLength &&
    Array.isArray(search.contextLength) &&
    search.contextLength.length === 2
  ) {
    const [min, max] = search.contextLength;
    if (max >= 1000000) {
      conditions.push(sql`${aiModels.contextLength} >= ${min}`);
    } else {
      conditions.push(
        and(sql`${aiModels.contextLength} >= ${min}`, sql`${aiModels.contextLength} <= ${max}`)!,
      );
    }
  }

  if (search.inputPrice && Array.isArray(search.inputPrice) && search.inputPrice.length === 2) {
    const [min, max] = search.inputPrice;
    const minPerToken = (min ?? 0) / 1_000_000;
    const maxPerToken = (max ?? 0) / 1_000_000;
    conditions.push(
      sql`${aiModels.promptPrice} BETWEEN ${minPerToken} AND ${maxPerToken}`,
    );
  }

  if (search.outputPrice && Array.isArray(search.outputPrice) && search.outputPrice.length === 2) {
    const [min, max] = search.outputPrice;
    const minPerToken = (min ?? 0) / 1_000_000;
    const maxPerToken = (max ?? 0) / 1_000_000;
    conditions.push(
      sql`${aiModels.completionPrice} BETWEEN ${minPerToken} AND ${maxPerToken}`,
    );
  }

  if (search.name) {
    conditions.push(ilike(aiModels.shortName, `%${search.name}%`));
  }

  if (search.description) {
    conditions.push(ilike(aiModels.description, `%${search.description}%`));
  }

  if (search.modalities && search.modalities.length > 0) {
    const directionEntries = new Map<string, "input" | "output" | "both">();
    (search.modalityDirections ?? []).forEach((entry) => {
      const [modality, direction] = entry.split(":");
      if (!modality) return;
      if (direction === "input" || direction === "output") {
        directionEntries.set(modality, direction);
      }
    });

    const modalityConditions = search.modalities.map((modality) => {
      const direction = directionEntries.get(modality) ?? "input";
      if (direction === "input") {
        return sql`${modality} = ANY(${aiModels.inputModalities})`;
      }
      if (direction === "output") {
        return sql`${modality} = ANY(${aiModels.outputModalities})`;
      }
      return or(
        sql`${modality} = ANY(${aiModels.inputModalities})`,
        sql`${modality} = ANY(${aiModels.outputModalities})`,
      )!;
    });

    if (modalityConditions.length === 1) {
      conditions.push(modalityConditions[0]);
    } else if (modalityConditions.length > 1) {
      conditions.push(and(...modalityConditions)!);
    }
  }

  if (search.search) {
    const searchTerm = `%${search.search}%`;
    conditions.push(
      or(
        ilike(aiModels.provider, searchTerm),
        ilike(aiModels.shortName, searchTerm),
        ilike(aiModels.name, searchTerm),
        ilike(aiModels.author, searchTerm),
        sql`array_to_string(${aiModels.supportedParameters}, ',') ILIKE ${searchTerm}`,
        sql`CAST(${aiModels.promptPrice} AS TEXT) ILIKE ${searchTerm}`,
        sql`CAST(${aiModels.completionPrice} AS TEXT) ILIKE ${searchTerm}`,
        sql`CAST(${aiModels.contextLength} AS TEXT) ILIKE ${searchTerm}`,
        sql`CAST(${aiModels.maxCompletionTokens} AS TEXT) ILIKE ${searchTerm}`,
        sql`CAST(${aiModels.throughput} AS TEXT) ILIKE ${searchTerm}`,
      )!,
    );
  }

  return conditions;
}

const MODEL_INSERT_CHUNK_SIZE = 100;

function chunkModels<T>(items: T[], size: number): T[][] {
  if (items.length <= size) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

class ModelsCache {
  /**
   * Store AI models data by wiping the table and inserting fresh data
   */
  async storeModels(result: ModelScrapeResult): Promise<number> {
    const { models } = result;

    logger.info(`[ModelsCache] Storing ${models.length} AI models (keeping all provider instances)...`);

    if (!models.length) {
      throw new Error("Refusing to replace AI models with an empty scrape result");
    }

    const rows = models.map((model) => ({
      id: model.id,
      slug: model.slug,
      name: model.name,
      shortName: model.shortName,
      author: model.author,
      description: model.description,
      modelVersionGroupId: model.modelVersionGroupId,
      contextLength: model.contextLength,
      inputModalities: model.inputModalities,
      outputModalities: model.outputModalities,
      hasTextOutput: model.hasTextOutput,
      group: model.group,
      instructType: model.instructType,
      permaslug: model.permaslug,
      endpointId: model.endpointId,
      pricing: model.pricing,
      features: model.features,
      provider: model.provider,
      throughput: model.throughput ?? null,
      maxCompletionTokens: model.maxCompletionTokens ?? null,
      supportedParameters: model.supportedParameters,
      modalityScore: computeModalityScore(model.inputModalities, model.outputModalities),
      promptPrice: parseNullableNumber(model.pricing?.prompt),
      completionPrice: parseNullableNumber(model.pricing?.completion),
      scrapedAt: new Date(model.scrapedAt),
    }));

    await db.transaction(async (tx) => {
      await tx.delete(aiModels);
      for (const chunk of chunkModels(rows, MODEL_INSERT_CHUNK_SIZE)) {
        await tx.insert(aiModels).values(chunk);
      }
    });

    logger.info(`[ModelsCache] Successfully stored ${models.length} AI models`);
    return models.length;
  }

  /**
   * Get all AI models
   */
  async getAllModels(): Promise<AIModel[]> {
    const rows = await db
      .select()
      .from(aiModels)
      .orderBy(sql`lower(${aiModels.shortName})`);
    return rows.map(mapRowToAIModel);
  }

  /**
   * Get models for a specific provider
   */
  async getModelsByProvider(provider: string): Promise<AIModel[]> {
    const rows = await db
      .select()
      .from(aiModels)
      .where(eq(aiModels.provider, provider))
      .orderBy(sql`lower(${aiModels.shortName})`);

    return rows.map(mapRowToAIModel);
  }

  /**
   * Get a specific model by slug
   */
  async getModelBySlug(slug: string): Promise<AIModel | null> {
    const rows = await db
      .select()
      .from(aiModels)
      .where(eq(aiModels.slug, slug))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return mapRowToAIModel(row);
  }

  async getModelsByIds(ids: string[]): Promise<AIModel[]> {
    if (ids.length === 0) {
      return [];
    }

    const uniqueIds = Array.from(new Set(ids));
    const rows = await db
      .select()
      .from(aiModels)
      .where(inArray(aiModels.id, uniqueIds));

    return rows.map(mapRowToAIModel);
  }

  /**
   * Get all available providers
   */
  async getAvailableProviders(): Promise<string[]> {
    const rows = await db
      .select({ provider: aiModels.provider })
      .from(aiModels)
      .groupBy(aiModels.provider);

    return rows.map(row => row.provider);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalModels: number;
    providers: string[];
    lastScrapedAt?: string;
  }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiModels);

    const providers = await this.getAvailableProviders();

    const [latestResult] = await db
      .select({ scrapedAt: sql<string>`max(scraped_at)` })
      .from(aiModels);

    return {
      totalModels: totalResult?.count || 0,
      providers,
      lastScrapedAt: latestResult?.scrapedAt,
    };
  }

  /**
   * Clear all models (useful for testing)
   */
  async clearAllModels(): Promise<number> {
    const deleted = await db.delete(aiModels).returning({ id: aiModels.id });
    logger.info(`[ModelsCache] Cleared ${deleted.length} models`);
    return deleted.length;
  }

  /**
   * Get models with database-level filtering, sorting, and pagination
   * This follows TanStack Table's recommended pattern for server-side pagination
   * 
   * @param search - Search parameters including filters, sort, and pagination
   * @returns Object containing paginated data and total count
   */
  async getModelsFiltered(
    search: ModelsSearchParamsType
  ): Promise<{ data: AIModel[]; totalCount: number; filterCount: number }> {
    const conditions = buildModelFilterConditions(search);
    const whereClause = conditions.length > 0 ? and(...conditions)! : undefined;

    // Get total count (for pagination)
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiModels)
      .where(whereClause);

    const filterCount = Number(countResult?.count || 0);

    // Build ORDER BY clause
    let orderByClause;
    if (search.sort) {
      const { id, desc: isDesc } = search.sort;
      const direction = isDesc ? desc : asc;
      const sqlDirection = isDesc ? sql.raw('DESC') : sql.raw('ASC');
      const nullsPlacement = isDesc ? sql.raw('NULLS LAST') : sql.raw('NULLS FIRST');

      switch (id) {
        case 'provider':
          orderByClause = direction(aiModels.provider);
          break;
        case 'name': {
          // Normalize to match client-side fallback: shortName -> name -> empty string
          const normalizedName = sql`COALESCE(
            lower(trim(${aiModels.shortName})),
            lower(trim(${aiModels.name})),
            ''
          )`;
          orderByClause = isDesc
            ? sql`${normalizedName} DESC`
            : sql`${normalizedName} ASC`;
          break;
        }
        case 'contextLength':
          orderByClause = sql`${aiModels.contextLength} ${sqlDirection} ${nullsPlacement}`;
          break;
        case 'inputPrice':
          orderByClause = sql`${aiModels.promptPrice} ${sqlDirection} ${nullsPlacement}`;
          break;
        case 'outputPrice':
          orderByClause = sql`${aiModels.completionPrice} ${sqlDirection} ${nullsPlacement}`;
          break;
        case 'throughput':
          orderByClause = sql`${aiModels.throughput} ${sqlDirection} ${nullsPlacement}`;
          break;
        case 'maxCompletionTokens':
          // Direct column sorting (much more efficient than JSONB extraction)
          orderByClause = sql`${aiModels.maxCompletionTokens} ${sqlDirection} ${nullsPlacement}`;
          break;
        case 'modalities': {
          const modalityOrderExpr = sql`COALESCE(${aiModels.modalityScore}, 0)`;
          orderByClause = sql`${modalityOrderExpr} ${sqlDirection} ${nullsPlacement}`;
          break;
        }
        default:
          // Default: sort by provider
          orderByClause = buildProviderOrderBy(false);
      }
    } else {
      // Default: sort by provider
      orderByClause = buildProviderOrderBy(false);
    }

    // Apply pagination
    const cursor = typeof search.cursor === 'number' && search.cursor >= 0 ? search.cursor : 0;
    const size = Math.min(Math.max(1, search.size ?? 50), 200); // Clamp size between 1 and 200

    // Execute query with filtering, sorting, and pagination
    const rows = await db
      .select()
      .from(aiModels)
      .where(whereClause)
      .orderBy(...(Array.isArray(orderByClause) ? orderByClause : [orderByClause]))
      .limit(size)
      .offset(cursor);

    return {
      data: rows.map(mapRowToAIModel),
      totalCount: filterCount, // Total matching filters
      filterCount: filterCount, // Same as totalCount (no separate unfiltered count needed)
    };
  }

  /**
   * Get favorite models with database-level filtering, sorting, and pagination
   * This follows TanStack Table's recommended pattern for server-side pagination
   * Uses JOIN to combine userModelFavorites with aiModels
   * 
   * @param userId - User ID to filter favorites
   * @param search - Search parameters including sort and pagination
   * @returns Object containing paginated data and total count
   */
  async getFavoriteModelsFiltered(
    userId: string,
    search: ModelsSearchParamsType
  ): Promise<{ data: AIModel[]; totalCount: number; filterCount: number }> {
    const filterConditions = buildModelFilterConditions(search);

    // Build ORDER BY clause (same logic as getModelsFiltered)
    const defaultOrderBy = [desc(userModelFavorites.createdAt), asc(aiModels.provider)];
    let orderByClause: SQL<unknown> | SQL<unknown>[] | undefined;
    if (search.sort) {
      const { id, desc: isDesc } = search.sort;
      const direction = isDesc ? desc : asc;
      const sqlDirection = isDesc ? sql.raw('DESC') : sql.raw('ASC');
      const nullsPlacement = isDesc ? sql.raw('NULLS LAST') : sql.raw('NULLS FIRST');

      switch (id) {
        case 'provider':
          orderByClause = direction(aiModels.provider);
          break;
        case 'name': {
          const normalizedName = sql`COALESCE(
            lower(trim(${aiModels.shortName})),
            lower(trim(${aiModels.name})),
            ''
          )`;
          orderByClause = isDesc
            ? sql`${normalizedName} DESC`
            : sql`${normalizedName} ASC`;
          break;
        }
        case 'contextLength':
          orderByClause = sql`${aiModels.contextLength} ${sqlDirection} ${nullsPlacement}`;
          break;
        case 'inputPrice':
          orderByClause = sql`${aiModels.promptPrice} ${sqlDirection} ${nullsPlacement}`;
          break;
        case 'outputPrice':
          orderByClause = sql`${aiModels.completionPrice} ${sqlDirection} ${nullsPlacement}`;
          break;
        case 'throughput':
          orderByClause = sql`${aiModels.throughput} ${sqlDirection} ${nullsPlacement}`;
          break;
        case 'maxCompletionTokens':
          // Direct column sorting (much more efficient than JSONB extraction)
          orderByClause = sql`${aiModels.maxCompletionTokens} ${sqlDirection} ${nullsPlacement}`;
          break;
        case 'modalities': {
          const modalityOrderExpr = sql`COALESCE(${aiModels.modalityScore}, 0)`;
          orderByClause = sql`${modalityOrderExpr} ${sqlDirection} ${nullsPlacement}`;
          break;
        }
        default:
          orderByClause = defaultOrderBy;
      }
    }

    if (!Array.isArray(orderByClause)) {
      orderByClause = orderByClause ? [orderByClause] : defaultOrderBy;
    }

    // Apply pagination
    const cursor = typeof search.cursor === 'number' && search.cursor >= 0 ? search.cursor : 0;
    const size = Math.min(Math.max(1, search.size ?? 50), 200); // Clamp size between 1 and 200

    // Get total count of favorites for this user (without filters)
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userModelFavorites)
      .where(eq(userModelFavorites.userId, userId));

    const totalCount = Number(countResult?.count || 0);

    const baseCondition = eq(userModelFavorites.userId, userId);
    const whereClause =
      filterConditions.length > 0 ? and(baseCondition, ...filterConditions)! : baseCondition;

    const [filteredCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(userModelFavorites)
      .innerJoin(aiModels, eq(userModelFavorites.modelId, aiModels.id))
      .where(whereClause);

    const filterCount = Number(filteredCountResult?.count || 0);

    if (filterCount === 0) {
      return {
        data: [],
        totalCount,
        filterCount: 0,
      };
    }

    // Execute query with JOIN, sorting, and pagination at database level
    // JOIN userModelFavorites with aiModels, filter by userId, sort, and paginate
    const rows = await db
      .select({
        id: aiModels.id,
        slug: aiModels.slug,
        name: aiModels.name,
        shortName: aiModels.shortName,
        author: aiModels.author,
        description: aiModels.description,
        modelVersionGroupId: aiModels.modelVersionGroupId,
        contextLength: aiModels.contextLength,
        inputModalities: aiModels.inputModalities,
        outputModalities: aiModels.outputModalities,
        hasTextOutput: aiModels.hasTextOutput,
        group: aiModels.group,
        instructType: aiModels.instructType,
        permaslug: aiModels.permaslug,
        endpointId: aiModels.endpointId,
        pricing: aiModels.pricing,
        features: aiModels.features,
        modalityScore: aiModels.modalityScore,
        promptPrice: aiModels.promptPrice,
        completionPrice: aiModels.completionPrice,
        provider: aiModels.provider,
        throughput: aiModels.throughput,
        maxCompletionTokens: aiModels.maxCompletionTokens,
        supportedParameters: aiModels.supportedParameters,
        scrapedAt: aiModels.scrapedAt,
      })
      .from(userModelFavorites)
      .innerJoin(aiModels, eq(userModelFavorites.modelId, aiModels.id))
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(size)
      .offset(cursor);

    return {
      data: rows.map(mapRowToAIModel),
      totalCount,
      filterCount,
    };
  }

  /**
   * Generate facets directly from database using SQL aggregations
   * This avoids loading all models into memory (2MB cache limit issue)
   * Returns facet data: provider, author, modalities, name counts
   */
  async getModelsFacets(): Promise<{
    provider: { rows: { value: string; total: number }[]; total: number };
    author: { rows: { value: string; total: number }[]; total: number };
    modalities: { rows: { value: string; total: number }[]; total: number };
    name: { rows: { value: string; total: number }[]; total: number };
  }> {
    // Get total count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiModels);
    const totalCount = Number(totalResult?.count || 0);

    // Provider facet (GROUP BY provider)
    const providerRows = await db
      .select({
        provider: aiModels.provider,
        count: sql<number>`count(*)`,
      })
      .from(aiModels)
      .groupBy(aiModels.provider);

    const providerFacet = {
      rows: providerRows
        .map((r) => ({ value: r.provider, total: Number(r.count) }))
        .sort((a, b) => {
          const aPriority = PROVIDER_SORT_PRIORITY[a.value] || 999;
          const bPriority = PROVIDER_SORT_PRIORITY[b.value] || 999;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return a.value.localeCompare(b.value);
        }),
      total: totalCount,
    };

    // Author facet (GROUP BY author, exclude nulls)
    const authorRows = await db
      .select({
        author: aiModels.author,
        count: sql<number>`count(*)`,
      })
      .from(aiModels)
      .where(sql`${aiModels.author} IS NOT NULL`)
      .groupBy(aiModels.author);

    const authorFacet = {
      rows: authorRows
        .map((r) => ({ value: r.author || '', total: Number(r.count) }))
        .sort((a, b) => {
          const aPriority = AUTHOR_SORT_PRIORITY[a.value] || 999;
          const bPriority = AUTHOR_SORT_PRIORITY[b.value] || 999;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return a.value.localeCompare(b.value);
        }),
      total: totalCount,
    };

    // Modalities facet (need to unnest arrays and count)
    // This is more complex - we need to unnest both input and output modalities
    // Use a subquery with UNION ALL to combine input and output modalities
    const modalityRows = await db.execute(sql`
      SELECT modality, COUNT(*) as count
      FROM (
        SELECT unnest(input_modalities) as modality FROM ${aiModels}
        UNION ALL
        SELECT unnest(output_modalities) as modality FROM ${aiModels}
      ) AS all_modalities
      WHERE modality IS NOT NULL
      GROUP BY modality
    `);

    const modalityFacet = {
      rows: (modalityRows as unknown as Array<{ modality: string; count: string | number }>)
        .map((r) => ({ value: r.modality, total: Number(r.count) }))
        .sort((a, b) => a.value.localeCompare(b.value)),
      total: totalCount,
    };

    // Name facet (top 20 most common names)
    const nameRows = await db
      .select({
        name: aiModels.shortName,
        count: sql<number>`count(*)`,
      })
      .from(aiModels)
      .where(sql`${aiModels.shortName} IS NOT NULL`)
      .groupBy(aiModels.shortName)
      .orderBy(sql`count(*) DESC`)
      .limit(20);

    const nameFacet = {
      rows: nameRows.map((r) => ({ value: r.name || '', total: Number(r.count) })),
      total: totalCount,
    };

    return {
      provider: providerFacet,
      author: authorFacet,
      modalities: modalityFacet,
      name: nameFacet,
    };
  }
}

// Export singleton instance
export const modelsCache = new ModelsCache();
