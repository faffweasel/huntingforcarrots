export function isDusk(): boolean {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 6;
}

export function applyDuskMode(): void {
  if (isDusk()) {
    document.documentElement.setAttribute('data-theme', 'dusk');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}
