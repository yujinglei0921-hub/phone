'use strict';
// Fit the visual viewport (including browser bars and the software keyboard).
// Only the application contents scroll; the simulated phone stays in place.
const phoneViewportMedia=window.matchMedia('(max-width:720px), (hover:none) and (pointer:coarse)');
let phoneViewportFrame=0;
function updatePhoneViewport(){
 phoneViewportFrame=0;const root=document.documentElement;
 if(!phoneViewportMedia.matches){for(const key of ['height','width','top','left'])root.style.removeProperty('--phone-viewport-'+key);return}
 const viewport=window.visualViewport;
 // Preserve native pinch zoom rather than resizing the app around a zoomed viewport.
 if(viewport&&Math.abs(viewport.scale-1)>.01)return;
 const values={height:viewport?.height||window.innerHeight,width:viewport?.width||window.innerWidth,top:viewport?.offsetTop||0,left:viewport?.offsetLeft||0};
 for(const [key,value] of Object.entries(values))root.style.setProperty('--phone-viewport-'+key,value+'px');
}
function schedulePhoneViewport(){if(!phoneViewportFrame)phoneViewportFrame=requestAnimationFrame(updatePhoneViewport)}
window.addEventListener('resize',schedulePhoneViewport,{passive:true});
window.addEventListener('orientationchange',schedulePhoneViewport,{passive:true});
window.visualViewport?.addEventListener('resize',schedulePhoneViewport,{passive:true});
window.visualViewport?.addEventListener('scroll',schedulePhoneViewport,{passive:true});
phoneViewportMedia.addEventListener('change',schedulePhoneViewport);
updatePhoneViewport();
