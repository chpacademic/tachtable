function buildLoadingSkeleton(lines = 3) {
  return `
    <div class="loading-skeleton" aria-hidden="true">
      ${Array.from({ length: lines }, (_, index) => `<span class="loading-skeleton-line line-${index + 1}"></span>`).join("")}
    </div>
  `;
}

export {
  buildLoadingSkeleton,
};
