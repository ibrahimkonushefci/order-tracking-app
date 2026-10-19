/**
 * Night Mode before first paint (no white flash): the saved choice, else the device setting.
 * Inlined into <head>; keep it tiny and dependency-free.
 */
export const THEME_KEY = 'ot-theme';
export const THEME_COLOR = { dark: '#121816' } as const;

export const themeScript = `(function(){var t=null;try{t=localStorage.getItem('${THEME_KEY}')}catch(e){}if(t!=='dark'&&t!=='light')t=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;})();`;
