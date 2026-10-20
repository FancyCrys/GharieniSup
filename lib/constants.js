export const SITES = ["Gharieni", "GharieniGroup", "Bentlon", "Cobot", "MetaWell"];

// Old site names → current names, so existing tickets show and filter correctly.
export const SITE_RENAMES = { Cobalt: "Cobot" };

export const PRIORITIES = [
  { value: "high", label: "High", hint: "Immediate fix needed" },
  { value: "medium", label: "Medium", hint: "Fix soon" },
  { value: "low", label: "Low", hint: "When there's time" },
];

export const STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

export const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
export const STATUS_RANK = { open: 0, in_progress: 1, done: 2 };
