// Build-time flags only. Anything that changes per environment (API base, sign-in URL, chat mock, footer entities)
// lives in src/assets/env.json, read at startup by RuntimeConfigService, so one image is promoted across environments.
export const environment = {
  production: false
};
