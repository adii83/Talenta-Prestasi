/* Runtime global seluruh halaman publik. */
(() => {
 const settings=getGlobalSettings(),pageId=publicPageId();
 if(pageId&&!isPublicPageEnabled(pageId,settings)){location.replace(getFirstEnabledPublicPage(settings));return}
 const navMap={download:'unduh.html',winners:'pemenang.html',archive:'arsip.html',faq:'faq.html'};
 Object.entries(navMap).forEach(([id,file])=>document.querySelectorAll(`.navbar__link[href="${file}"],.bottom-nav__item[href="${file}"]`).forEach(el=>{el.hidden=settings.navigation[id]===false;el.dataset.globalPage=id}));
 const visible=[...document.querySelectorAll('.bottom-nav__item')].filter(el=>!el.hidden);document.querySelectorAll('.bottom-nav').forEach(nav=>nav.dataset.itemCount=String(visible.length));
 document.documentElement.style.setProperty('--c-primary',settings.theme.primaryColor);document.documentElement.style.setProperty('--c-gold',settings.theme.accentColor);
 const initials=settings.identity.eventName.split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,3).join('').toUpperCase();
 document.querySelectorAll('.navbar__brand-text,.mobile-header__text').forEach(el=>el.textContent=settings.identity.eventName);document.querySelectorAll('.navbar__logo,.mobile-header__logo,.footer__logo').forEach(el=>{el.textContent=initials;if(settings.identity.logo)el.innerHTML=`<img src="${settings.identity.logo}" alt="Logo ${settings.identity.eventName}">`});
 document.querySelectorAll('.footer__brand-text').forEach(el=>el.textContent=settings.footer.brandName||settings.identity.eventName);document.querySelectorAll('.footer__desc').forEach(el=>el.textContent=settings.footer.description);document.querySelectorAll('.footer__heading').forEach(el=>el.textContent=settings.footer.contactHeading);
 document.querySelectorAll('.footer__links').forEach(el=>el.innerHTML=`${settings.contact.email?`<a class="footer__link" href="mailto:${settings.contact.email}">${settings.contact.email}</a>`:''}${settings.contact.whatsappDisplay?`<a class="footer__link t-mono" href="${buildWhatsappUrl(settings)}" target="_blank" rel="noopener">${settings.contact.whatsappDisplay}</a>`:''}${settings.contact.address?`<span class="footer__link">${settings.contact.address}</span>`:''}`);document.querySelectorAll('.footer__bottom p').forEach(el=>el.textContent=settings.footer.copyright);
 const wa=buildWhatsappUrl(settings);document.querySelectorAll('.floating-wa').forEach(el=>{if(!wa)el.hidden=true;else el.href=wa});
})();
