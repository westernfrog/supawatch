export const INTRO_SESSION_KEY = "sw-intro-marquee-v2";

/* Runs before first paint (see layout.tsx) so the server-rendered home page
   never flashes before the marquee covers it. It expires on its own in case
   the bundle never hydrates. */
export const introPrepaintScript = `(function(){try{var d=document.documentElement;if(location.pathname!=="/"||matchMedia("(prefers-reduced-motion: reduce)").matches||sessionStorage.getItem("${INTRO_SESSION_KEY}"))return;d.dataset.intro="pending";setTimeout(function(){delete d.dataset.intro},7000)}catch(e){}})()`;
