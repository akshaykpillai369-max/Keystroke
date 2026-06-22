(function () {
  var views = Array.prototype.slice.call(document.querySelectorAll('.view'));
  var navItems = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));
  var seconds = 1500;
  var running = false;
  var timer = null;

  function showView(name) {
    views.forEach(function (view) {
      view.classList.toggle('hidden', view.id !== 'view-' + name);
    });
    navItems.forEach(function (item) {
      var active = item.dataset.view === name;
      item.className = 'nav-item w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ' + (active ? 'text-primary font-semibold border-r-2 border-primary bg-surface-variant/20' : 'text-on-surface-variant font-medium hover:bg-surface-variant/50');
    });
  }

  function formatTime(total) {
    var min = Math.floor(total / 60);
    var sec = total % 60;
    return String(min).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  function initTimer() {
    var display = document.getElementById('timer-display');
    var play = document.getElementById('timer-play');
    var reset = document.getElementById('timer-reset');
    if (!display || !play || !reset) return;
    play.addEventListener('click', function () {
      running = !running;
      play.querySelector('span').textContent = running ? 'pause' : 'play_arrow';
      play.classList.toggle('animate-pulse', running);
      if (!running) {
        clearInterval(timer);
        return;
      }
      timer = setInterval(function () {
        if (seconds <= 0) {
          clearInterval(timer);
          running = false;
          play.querySelector('span').textContent = 'play_arrow';
          play.classList.remove('animate-pulse');
          return;
        }
        seconds -= 1;
        display.textContent = formatTime(seconds);
      }, 1000);
    });
    reset.addEventListener('click', function () {
      clearInterval(timer);
      seconds = 1500;
      running = false;
      display.textContent = '25:00';
      play.querySelector('span').textContent = 'play_arrow';
      play.classList.remove('animate-pulse');
    });
  }

  navItems.forEach(function (item) {
    item.addEventListener('click', function () { showView(item.dataset.view); });
  });
  initTimer();
})();
