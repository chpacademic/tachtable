export async function bootstrapApplication({ start, onFatalError } = {}) {
  if (typeof start !== "function") {
    throw new Error("bootstrapApplication ต้องได้รับฟังก์ชัน start");
  }

  try {
    return await start();
  } catch (error) {
    if (typeof onFatalError === "function") {
      onFatalError(error);
      return null;
    }

    throw error;
  }
}
