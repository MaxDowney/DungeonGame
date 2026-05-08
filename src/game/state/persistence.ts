import type { CampaignState, MapState, SavedGameState, Screen, SettingsState } from "../types";

const CAMPAIGN_KEY = "dungeon-threat:campaign";
const SAVE_KEY = "dungeon-threat:save";
const SETTINGS_KEY = "dungeon-threat:settings";

export const saveCampaign = (campaign: CampaignState | null): void => {
  if (!campaign) return;
  localStorage.setItem(
    CAMPAIGN_KEY,
    JSON.stringify({ ...campaign, lastSavedAt: Date.now() }),
  );
};

export const loadCampaign = (): CampaignState | null => {
  const raw = localStorage.getItem(CAMPAIGN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CampaignState;
  } catch {
    return null;
  }
};

export const clearCampaign = (): void => {
  localStorage.removeItem(CAMPAIGN_KEY);
  localStorage.removeItem(SAVE_KEY);
};

export const saveSnapshot = (
  campaign: CampaignState | null,
  mapState: MapState | null,
  screen: Screen,
): void => {
  if (!campaign) return;
  const snapshot: SavedGameState = { campaign, mapState, screen, savedAt: Date.now() };
  localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  saveCampaign(campaign);
};

export const loadSnapshot = (): SavedGameState | null => {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    const campaign = loadCampaign();
    return campaign ? { campaign, mapState: null, screen: "campaign", savedAt: campaign.lastSavedAt ?? 0 } : null;
  }
  try {
    return JSON.parse(raw) as SavedGameState;
  } catch {
    return null;
  }
};

export const saveSettings = (settings: SettingsState): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const loadSettings = (): SettingsState => {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { debug: false, reduceMotion: false };
  try {
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    return { debug: parsed.debug ?? false, reduceMotion: parsed.reduceMotion ?? false };
  } catch {
    return { debug: false, reduceMotion: false };
  }
};
