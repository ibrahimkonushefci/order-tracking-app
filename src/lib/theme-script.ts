/**
 * Night Mode before first paint (no flash): the saved choice, else light.
 * Inlined into <head>; keep it tiny and dependency-free.
 */
export const THEME_KEY = 'ot-theme';
export const THEME_COLOR = { dark: '#121816' } as const;

export const themeScript = `(function(){var t=null;try{t=localStorage.getItem('${THEME_KEY}')}catch(e){}if(t!=='dark')t='light';document.documentElement.dataset.theme=t;})();`;
