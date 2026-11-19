const MAX_BYTES = 1000000;
const MAX_ATTRIBUTES = 100;
const MAX_ATTRIBUTE_VALUE = 1024;

const PROJECT_ID = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const RESOURCE_ID = /^[A-Za-z][A-Za-z0-9_.~+%-]{2,254}$/;
const ATTRIBUTE_KEY = /^[A-Za-z][A-Za-z0-9_.-]{0,255}$/;

function resourceName(projectId, collection, name) {
  if (!PROJECT_ID.test(projectId)) throw new Error("project id 格式不對");
  if (typeof name !== "string" || name.includes("\\") || name.includes("..")) {
    throw new Error("資源名稱不對");
  }
  if (name.startsWith("projects/")) {
    const parts = name.split("/");
    if (
      parts.length !== 4 ||
      parts[0] !== "projects" ||
      parts[1] !== projectId ||
      parts[2] !== collection ||
      !RESOURCE_ID.test(parts[3])
    ) {
      throw new Error("資源名稱不對");
    }
    return name;
  }
  if (!RESOURCE_ID.test(name)) throw new Error("資源名稱不對");
  return `projects/${projectId}/${collection}/${name}`;
}

function attributeMap(raw) {
  if (raw == null || raw === "") return {};
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("attributes 要是物件");
  }
  const keys = Object.keys(parsed);
  if (keys.length > MAX_ATTRIBUTES) throw new Error("attributes 最多 100 個");
  const out = {};
  for (const key of keys) {
    if (!ATTRIBUTE_KEY.test(key)) throw new Error("attribute 名稱不對");
    const value = parsed[key];
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      throw new Error("attribute 值只能是字串、數字或布林");
    }
    const text = String(value);
    if (text.length > MAX_ATTRIBUTE_VALUE) throw new Error("attribute 值太長");
    out[key] = text;
  }
  return out;
}

function messageData(buffer, decodeJson) {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (bytes.length > MAX_BYTES) {
    const error = new Error("訊息超過 1MB");
    error.code = "TOO_LARGE";
    throw error;
  }
  const text = bytes.toString("utf8");
  // Batch notifications leave data empty. Parsing that throws "Unexpected end of JSON input".
  if (!decodeJson || text.length === 0) return text;
  return JSON.parse(text);
}

function copyAttributes(source) {
  const out = {};
  const keys = Object.keys(source || {}).slice(0, MAX_ATTRIBUTES);
  for (const key of keys) out[key] = String(source[key]).slice(0, MAX_ATTRIBUTE_VALUE);
  return out;
}

module.exports = {
  MAX_BYTES,
  resourceName,
  attributeMap,
  messageData,
  copyAttributes,
};
