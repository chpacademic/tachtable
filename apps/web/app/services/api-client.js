import {
  applyMutation,
  autoSchedule,
  claimLock,
  configureApi as configureBaseApi,
  deleteResource,
  exportCsv,
  exportPdf,
  getActivity,
  getBootstrap,
  getSuggestions,
  heartbeat,
  joinCollaboration,
  printTimetable,
  releaseLock,
  saveResource,
  saveSettings,
  validateTimetable,
} from "../../api.js";

export function configureApiClient(options = {}) {
  configureBaseApi(options);
}

export {
  applyMutation,
  autoSchedule,
  claimLock,
  deleteResource,
  exportCsv,
  exportPdf,
  getActivity,
  getBootstrap,
  getSuggestions,
  heartbeat,
  joinCollaboration,
  printTimetable,
  releaseLock,
  saveResource,
  saveSettings,
  validateTimetable,
};
