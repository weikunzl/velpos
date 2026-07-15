export { SettingsDialog } from './ui/SettingsDialog'
export { useSettingsManager } from './model/useSettingsManager'
export {
  getSettings,
  updateSettings,
  listChannelProfiles,
  createChannelProfile,
  updateChannelProfile,
  deleteChannelProfile,
  activateChannelProfile,
  fetchModelsForChannel,
} from './api/settingsApi'
export type { SettingsData, ChannelProfile } from './api/settingsApi'
