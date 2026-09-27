export const appearance = $state<{ mode: 'light' | 'dark' | 'system' }>({ mode: 'system' });

export function setAppearance(mode: 'light' | 'dark') {
  appearance.mode = mode;
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = mode;
    try {
      localStorage.setItem('easypg-native-appearance', mode);
    } catch {
      /* Storage is optional. */
    }
  }
}
