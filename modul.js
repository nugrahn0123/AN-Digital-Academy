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

  function initModule2VideoBoard() {
    var chapterButtons = document.querySelectorAll(".chapter-nav-item");
    if (!chapterButtons.length) return;

    var chapterLabelEl = document.getElementById("activeChapterLabel");
    var titleEl = document.getElementById("activeVideoTitle");
    var summaryEl = document.getElementById("activeVideoSummary");
    var iframeEl = document.getElementById("moduleMainVideo");
    var frameWrapEl = document.getElementById("videoFrameWrap");
    var unavailableNoteEl = document.getElementById("videoUnavailableNote");
    var youtubeBtnEl = document.getElementById("openYoutubeBtn");

    if (!chapterLabelEl || !titleEl || !summaryEl || !iframeEl || !frameWrapEl || !unavailableNoteEl || !youtubeBtnEl) {
      return;
    }

    function normalizeYoutubeEmbedUrl(url) {
      if (!url) return "";

      if (url.indexOf("youtube.com/embed/") !== -1) {
        return url;
      }

      var matchShort = url.match(/youtu\.be\/([^?&/]+)/i);
      if (matchShort && matchShort[1]) {
        return "https://www.youtube.com/embed/" + matchShort[1];
      }

      var matchWatch = url.match(/[?&]v=([^?&/]+)/i);
      if (matchWatch && matchWatch[1]) {
        return "https://www.youtube.com/embed/" + matchWatch[1];
      }

      return url;
    }

    function setActiveChapter(buttonEl) {
      for (var i = 0; i < chapterButtons.length; i += 1) {
        chapterButtons[i].classList.remove("is-active");
      }
      buttonEl.classList.add("is-active");

      var chapter = buttonEl.getAttribute("data-chapter") || "Chapter";
      var title = buttonEl.getAttribute("data-title") || "Materi";
      var summary = buttonEl.getAttribute("data-summary") || "";
      var embedUrl = normalizeYoutubeEmbedUrl(buttonEl.getAttribute("data-embed-url") || "");
      var youtubeUrl = buttonEl.getAttribute("data-youtube-url") || "";

      chapterLabelEl.textContent = chapter;
      titleEl.textContent = title;
      summaryEl.textContent = summary;

      if (embedUrl) {
        iframeEl.src = embedUrl;
        frameWrapEl.classList.remove("hidden");
        unavailableNoteEl.classList.add("hidden");
      } else {
        iframeEl.src = "";
        frameWrapEl.classList.add("hidden");
        unavailableNoteEl.classList.remove("hidden");
      }

      if (youtubeUrl) {
        youtubeBtnEl.href = youtubeUrl;
        youtubeBtnEl.classList.remove("hidden");
      } else {
        youtubeBtnEl.href = "#";
        youtubeBtnEl.classList.add("hidden");
      }
    }

    for (var j = 0; j < chapterButtons.length; j += 1) {
      chapterButtons[j].addEventListener("click", function () {
        setActiveChapter(this);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillCurrentYear();
    markActiveModule();
    initModule2VideoBoard();
  });
})();
