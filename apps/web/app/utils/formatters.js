export function getInitials(value) {
  const source = String(value || "TT").trim();
  if (!source) {
    return "TT";
  }

  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function formatTimeLabel(value) {
  return new Date(value).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSyncTime(value) {
  if (!value) {
    return "รอการซิงก์ครั้งแรก";
  }
  return `ซิงก์ล่าสุด ${formatTimeLabel(value)}`;
}

export function humanizeProvider(provider) {
  if (!provider) {
    return "เข้าสู่ระบบแล้ว";
  }
  if (provider === "google.com") {
    return "เข้าสู่ระบบด้วย Google";
  }
  if (provider === "password") {
    return "เข้าสู่ระบบด้วยอีเมล";
  }
  return `เข้าสู่ระบบผ่าน ${provider}`;
}
