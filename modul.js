(function () {
  "use strict";

  // Utility kecil agar footer selalu mengikuti tahun saat ini.
  function fillCurrentYear() {
    var yearEls = document.querySelectorAll("[data-current-year]");
    var year = String(new Date().getFullYear());

    for (var i = 0; i < yearEls.length; i += 1) {
      yearEls[i].textContent = year;
    }
  }

  // Menandai modul yang sedang dibuka agar pengguna tidak bingung.
  function markActiveModule() {
    var pageModule = document.body.getAttribute("data-module");
    if (!pageModule) return;

    var infoEl = document.getElementById("moduleStatusInfo");
    if (!infoEl) return;

    infoEl.classList.add("success");
    infoEl.textContent = "Anda sedang membuka " + pageModule + ". Selesaikan chapter berurutan untuk hasil belajar terbaik.";
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillCurrentYear();
    markActiveModule();
  });
})();
