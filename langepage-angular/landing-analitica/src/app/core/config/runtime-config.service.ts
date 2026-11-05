import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Legal entity shown in the footer: company name, CNPJ and address. Never versioned. */
export interface FooterEntity {
  name: string;
  cnpj: string;
  address: string;
}

/**
 * Settings that change per environment without a new build: the same image is promoted DES → UAT → PRD and each
 * environment mounts its own `assets/env.json` (ConfigMap). Build-time flags stay in `src/environments/`.
 */
export interface RuntimeConfig {
  /** Prefix of every BFF call (rule R4), e.g. '/api' (routed by the Ingress). No trailing slash. */
  apiBase: string;
  /** Corporate sign-in entry point, used when the BFF answers 401. */
  loginUrl: string;
  /** Assistant chat: true = simulated agent (the chat's own mock flow, docs/contratos-de-dados.md section 9.5); false = BFF. */
  chatMock: boolean;
  /**
   * Data blocks (cards, charts, Tabela Analítica): true = local mocks in src/assets/data/ (no BFF call); false = BFF
   * contract v1 through ApiService (docs/contratos/openapi-agenda-normativa-v1.yaml).
   */
  dataMock: boolean;
  /** Legal entities listed in the footer; empty = no legal block. */
  footerEntities: readonly FooterEntity[];
}

/** File read before bootstrap, relative to the base href (served next to index.html). */
export const RUNTIME_CONFIG_URL = 'assets/env.json';

/**
 * Values used when env.json is missing, unreadable or has a key with the wrong type. Mocks only outside production
 * builds: a production image whose ConfigMap failed shows the blocks' error states, never fictional numbers taken for
 * real ones. The versioned env.json (local and demo) turns both mocks on explicitly.
 */
export function defaultRuntimeConfig(production: boolean): RuntimeConfig {
  return Object.freeze({
    apiBase: '/api',
    loginUrl: '/api/v1/autenticacao/login',
    chatMock: !production,
    dataMock: !production,
    footerEntities: Object.freeze([]) as readonly FooterEntity[]
  });
}

/** Defaults of this build (environment.production picks them). */
export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = defaultRuntimeConfig(environment.production);

/** Defaults the service falls back to; replaceable in tests to check the production build's values. */
export const RUNTIME_CONFIG_DEFAULTS = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG_DEFAULTS', {
  providedIn: 'root',
  factory: () => DEFAULT_RUNTIME_CONFIG
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

function isFooterEntity(value: unknown): value is FooterEntity {
  return isRecord(value) && nonEmptyString(value['name']) && nonEmptyString(value['cnpj']) && nonEmptyString(value['address']);
}

/**
 * Merges a parsed env.json over the defaults key by key: a missing or mistyped key keeps its default, so one bad value
 * never breaks the whole configuration. Unknown keys are ignored.
 */
export function parseRuntimeConfig(raw: unknown, defaults: RuntimeConfig = DEFAULT_RUNTIME_CONFIG): RuntimeConfig {
  if (!isRecord(raw)) {
    // No body details: the response may carry infrastructure data that must not reach the console.
    console.error(`Runtime config ${RUNTIME_CONFIG_URL} is not a JSON object; using safe defaults.`);
  }
  const source = isRecord(raw) ? raw : {};
  const entities = Array.isArray(source['footerEntities'])
    ? source['footerEntities'].filter(isFooterEntity).map(({ name, cnpj, address }) => ({ name, cnpj, address }))
    : defaults.footerEntities;
  return {
    apiBase: nonEmptyString(source['apiBase']) ? source['apiBase'].trim().replace(/\/+$/, '') : defaults.apiBase,
    loginUrl: nonEmptyString(source['loginUrl']) ? source['loginUrl'].trim() : defaults.loginUrl,
    chatMock: typeof source['chatMock'] === 'boolean' ? source['chatMock'] : defaults.chatMock,
    dataMock: typeof source['dataMock'] === 'boolean' ? source['dataMock'] : defaults.dataMock,
    footerEntities: entities
  };
}

/**
 * Holds the runtime configuration. `load()` runs once before bootstrap (provideAppInitializer in app.config.ts); until
 * then, and if the file cannot be read, `config` returns the build's defaults (RUNTIME_CONFIG_DEFAULTS).
 */
@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  // HttpBackend skips interceptors: the config is read before any of them (e.g. a 401 redirect) can depend on it.
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly defaults = inject(RUNTIME_CONFIG_DEFAULTS);
  private current: RuntimeConfig = this.defaults;

  get config(): RuntimeConfig {
    return this.current;
  }

  /** Reads assets/env.json. Never rejects: on failure keeps the defaults and logs once, so the app still starts. */
  async load(): Promise<void> {
    try {
      this.current = parseRuntimeConfig(await firstValueFrom(this.http.get<unknown>(RUNTIME_CONFIG_URL)), this.defaults);
    } catch {
      this.current = this.defaults;
      // No error details: the response may carry infrastructure data that must not reach the console.
      console.error(`Runtime config ${RUNTIME_CONFIG_URL} could not be read; using safe defaults.`);
    }
  }
}
