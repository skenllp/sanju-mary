// ---- Opening (letter-unfold) animation ----
const cover = document.getElementById('cover');
const main = document.getElementById('main');
document.documentElement.classList.add('locked');

// ---- Background music setup ----
const audio = document.getElementById('bg-music');
const muteBtn = document.getElementById('mute-btn');
const iconSound = document.getElementById('icon-sound');
const iconMuted = document.getElementById('icon-muted');

let musicStarted = false; // becomes true only once play() actually succeeds
let opened = false;       // guards against openInvite() running more than once

// Single source of truth for starting music. Safe to call repeatedly —
// it only marks success once the promise actually resolves, so an early
// failed attempt (e.g. a gesture that doesn't count on some browsers)
// never blocks a later, better attempt.
function tryPlayMusic() {
  if (musicStarted) return;
  audio.volume = 0.45;
  audio.play().then(() => {
    musicStarted = true;
  }).catch(() => {
    // still blocked — a later user gesture will try again
  });
}

function openInvite() {
  if (opened) return; // prevent double-fire from bubbling touch/click events
  opened = true;

  cover.classList.add('open');
  main.classList.add('show');
  document.documentElement.classList.remove('locked');
  setTimeout(() => {
    cover.classList.add('hidden');
  }, 1250);

  // This tap is a guaranteed trusted gesture — best chance for audio to start
  tryPlayMusic();
}

// Only one listener needed on the outer cover — tapToOpen is inside it,
// so a tap anywhere on the cover (including the seal) already bubbles here.
cover.addEventListener('click', openInvite);
cover.addEventListener('touchend', (e) => {
  if (e.target.closest('#mute-btn')) return; // let the mute button handle its own taps
  e.preventDefault();
  openInvite();
}, { passive: false });

// ---- Countdown timer ----
// Target date: Wedding on December 27, 2026 at 11:00 AM IST (UTC+5:30)
const weddingTarget = new Date('2026-12-27T11:00:00+05:30').getTime();

function tick() {
  const now = Date.now();
  let diff = Math.max(0, weddingTarget - now);

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const pad = n => String(n).padStart(2, '0');

  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-mins');
  const secsEl = document.getElementById('cd-secs');

  if (daysEl) daysEl.textContent = pad(d);
  if (hoursEl) hoursEl.textContent = pad(h);
  if (minsEl) minsEl.textContent = pad(m);
  if (secsEl) secsEl.textContent = pad(s);
}

tick();
setInterval(tick, 1000);

// ---- Background music: additional fallback attempts ----
// Covers people who scroll or tap elsewhere before hitting "tap to open"
// (e.g. if opened is somehow already true from a prior state).
document.addEventListener('click', tryPlayMusic, { once: true });
document.addEventListener('scroll', tryPlayMusic, { once: true, passive: true });
document.addEventListener('touchstart', tryPlayMusic, { once: true, passive: true });

// Also try immediate autoplay on load (works on some desktop browsers,
// almost always blocked on mobile — that's fine, the gesture-based
// attempts above are the real path on phones).
window.addEventListener('load', tryPlayMusic);

// ---- Mute / unmute toggle ----
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // don't let this bubble to cover's click/touchend
  tryPlayMusic();
  if (audio.paused) {
    audio.play().catch(() => {});
    iconSound.style.display = '';
    iconMuted.style.display = 'none';
  } else {
    audio.pause();
    iconSound.style.display = 'none';
    iconMuted.style.display = '';
  }
});

// ---- RSVP Form Handling ----
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFZhRQ27VeMynjQBP85zXI6jkzQCCfrs5E0_g7l15hZMa3baPD2DyAyX_Cy3SNqsB1pw/exec';

const rsvpForm = document.getElementById('rsvp-form');
const rsvpSuccess = document.getElementById('rsvp-success');
const rsvpSuccessMsg = document.getElementById('rsvp-success-msg');
const rsvpResetBtn = document.getElementById('rsvp-reset-btn');

if (rsvpForm) {
  rsvpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const submitBtn = rsvpForm.querySelector('.rsvp-submit-btn');
    const originalBtnText = submitBtn ? submitBtn.textContent : 'Send RSVP';

    const name = document.getElementById('rsvp-name').value;
    const attending = document.getElementById('rsvp-attending').value;
    const guests = document.getElementById('rsvp-guests').value;
    const message = document.getElementById('rsvp-message').value;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    const formData = new URLSearchParams();
    formData.append('name', name);
    formData.append('attending', attending);
    formData.append('guests', guests);
    formData.append('message', message);
    formData.append('timestamp', new Date().toLocaleString());

    // If SCRIPT_URL is configured, post to Google Apps Script
    if (SCRIPT_URL && SCRIPT_URL !== 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      })
      .then(() => {
        showSuccessMessage(name, attending);
      })
      .catch((err) => {
        console.error('Error submitting RSVP:', err);
        // Still show success to user if network succeeds in background (CORS no-cors fallback)
        showSuccessMessage(name, attending);
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      });
    } else {
      // Local fallback if Web App URL is not yet added
      setTimeout(() => {
        showSuccessMessage(name, attending);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }, 500);
    }
  });

  function showSuccessMessage(name, attending) {
    if (attending === 'Joyfully Accepts') {
      rsvpSuccessMsg.textContent = `Thank you, ${name}! Your RSVP has been received. We can't wait to celebrate with you!`;
    } else {
      rsvpSuccessMsg.textContent = `Thank you, ${name}. We appreciate your response and will miss you on our special day!`;
    }
    
    rsvpForm.style.display = 'none';
    rsvpSuccess.style.display = 'block';
  }

  if (rsvpResetBtn) {
    rsvpResetBtn.addEventListener('click', () => {
      rsvpForm.reset();
      rsvpForm.style.display = 'block';
      rsvpSuccess.style.display = 'none';
    });
  }
}

// ---- Gallery Lightbox Modal ----
const galleryItems = document.querySelectorAll('.gallery-item');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');

if (galleryItems.length && lightbox) {
  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      const caption = item.querySelector('.gallery-overlay span');
      if (img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxCaption.textContent = caption ? caption.textContent : '';
        lightbox.classList.add('active');
        document.documentElement.classList.add('locked');
      }
    });
  });

  const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.documentElement.classList.remove('locked');
  };

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target === lightboxClose) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      closeLightbox();
    }
  });
}