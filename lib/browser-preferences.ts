import type { Language } from './profile';
let memoryLanguage: Language = 'en';
export function getLanguage(): Language {
  try {
    const saved = localStorage.getItem('ignat-language');
    return saved === 'zh' ? 'zh' : saved === 'en' ? 'en' : memoryLanguage;
  } catch {
    return memoryLanguage;
  }
}
export function subscribeLanguage(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener('ignat-language-change', listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('ignat-language-change', listener);
  };
}
export function saveLanguage(language: Language) {
  memoryLanguage = language;
  try {
    localStorage.setItem('ignat-language', language);
  } catch {
    /* Keep a session preference when storage is blocked. */
  }
  window.dispatchEvent(new Event('ignat-language-change'));
}
export function subscribeHash(listener: () => void) {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
}
export function subscribeReducedMotion(listener: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
export function getReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
