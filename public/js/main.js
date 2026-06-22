(function () {
  function initDrawerControls() {
    window.toggleDrawer = function toggleDrawer() {
      var drawer = document.getElementById('ai-drawer');
      if (!drawer) return;
      drawer.classList.toggle('translate-x-full');
      drawer.classList.toggle('lumina-drawer-open');
    };

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var drawer = document.getElementById('ai-drawer');
      if (!drawer) return;
      drawer.classList.add('translate-x-full');
      drawer.classList.remove('lumina-drawer-open');
    });
  }

  function initRevealAnimation() {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.glass-card'));
    cards.forEach(function (card) {
      card.classList.add('lumina-reveal', 'lumina-spotlight');
      card.style.transition = 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    });

    if (!('IntersectionObserver' in window)) {
      cards.forEach(function (card) { card.classList.add('lumina-revealed'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('lumina-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });

    cards.forEach(function (card, index) {
      card.style.transitionDelay = Math.min(index * 35, 220) + 'ms';
      observer.observe(card);
    });
  }

  function initSpotlight() {
    document.querySelectorAll('.glass-card').forEach(function (card) {
      card.addEventListener('mousemove', function (event) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--mouse-x', event.clientX - rect.left + 'px');
        card.style.setProperty('--mouse-y', event.clientY - rect.top + 'px');
      });
    });
  }

  function initSocketRefresh() {
    if (typeof io !== 'function') return;
    try {
      var socket = io();
      ['task:created', 'task:updated', 'task:deleted', 'project:created', 'project:updated'].forEach(function (eventName) {
        socket.on(eventName, function () {
          document.documentElement.dataset.lastRealtimeUpdate = String(Date.now());
        });
      });
    } catch (error) {
      console.warn('Realtime connection unavailable', error);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initDrawerControls();
    initRevealAnimation();
    initSpotlight();
    initSocketRefresh();
  });
})();
