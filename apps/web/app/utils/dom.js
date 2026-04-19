export function queryRequired(id, root = document) {
  const node = root.getElementById(id);
  if (!node) {
    throw new Error(`ไม่พบ element ที่จำเป็น #${id}`);
  }
  return node;
}
