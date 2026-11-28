/* =========================================================
   Essetara: Manifest – Rules page script (js/rules.js)

   1. Builds the chapter menu from the rulebook's headings
   2. Opens and closes chapters in the menu
   3. Opens and closes the whole menu on phones and tablets
   4. Highlights the section currently on screen
   5. Searches the rules
   6. Shows the Back to Top control after scrolling

   The rulebook HTML is the only place rules are written. Add or
   edit a <section class="rule"> and the menu and search update
   on their own.
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  var rulebook   = document.querySelector(".rulebook");
  var sidebar    = document.querySelector(".rules-sidebar");
  var toc        = document.querySelector(".toc");
  var navToggle  = document.querySelector(".rules-nav-toggle");
  var searchBox  = document.getElementById("rules-search");
  var statusText = document.getElementById("search-status");
  var resultList = document.getElementById("search-results");
  var nav        = document.getElementById("rules-nav");
  var backToTop  = document.querySelector(".back-to-top");

  var chapters = rulebook.querySelectorAll(".chapter");
  var linksById = {};        // section id -> its menu link
  var chapterOfId = {};      // section id -> its chapter's id
  var togglesByChapter = {}; // chapter id -> its expand button


  /* ---------- 1. Build the chapter menu ---------- */

  chapters.forEach(function (chapter) {
    var title = chapter.querySelector("h3").textContent;
    var li = document.createElement("li");
    var row = document.createElement("div");
    row.className = "toc-row";

    var link = makeLink(chapter.id, title);
    row.appendChild(link);
    li.appendChild(row);
    linksById[chapter.id] = link;
    chapterOfId[chapter.id] = chapter.id;

    // Numbered rules inside this chapter become a sub-list
    var rules = chapter.querySelectorAll(".rule[id]");
    if (rules.length > 0) {
      var subList = document.createElement("ol");
      subList.className = "toc-sub";
      subList.id = "toc-" + chapter.id;
      subList.hidden = true;

      rules.forEach(function (rule) {
        var subItem = document.createElement("li");
        var subLink = makeLink(rule.id, rule.querySelector("h4").textContent);
        subItem.appendChild(subLink);
        subList.appendChild(subItem);
        linksById[rule.id] = subLink;
        chapterOfId[rule.id] = chapter.id;
      });

      // Button that shows or hides this chapter's sections
      var toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "toc-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", subList.id);
      toggle.setAttribute("aria-label", "Sections in " + title);
      toggle.addEventListener("click", function () {
        setExpanded(chapter.id, toggle.getAttribute("aria-expanded") !== "true");
        // A chapter the visitor opens or closes by hand stays that way
        if (autoOpened === chapter.id) { autoOpened = null; }
      });
      row.appendChild(toggle);
      li.appendChild(subList);
      togglesByChapter[chapter.id] = toggle;
    }

    toc.appendChild(li);
  });

  function makeLink(id, text) {
    var a = document.createElement("a");
    a.href = "#" + id;
    a.className = "toc-link";
    a.textContent = text;
    return a;
  }


  /* ---------- 2. Open or close one chapter in the menu ---------- */

  function setExpanded(chapterId, open) {
    var toggle = togglesByChapter[chapterId];
    if (!toggle) { return; }
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.getElementById(toggle.getAttribute("aria-controls")).hidden = !open;
  }


  /* ---------- 3. Phone/tablet: open or close the whole menu ---------- */

  navToggle.addEventListener("click", function () {
    var open = navToggle.getAttribute("aria-expanded") !== "true";
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    sidebar.classList.toggle("nav-open", open);
  });

  // After choosing a section on a small screen, close the menu so the
  // rule is not hidden behind it
  sidebar.addEventListener("click", function (event) {
    if (event.target.closest("a") && navToggle.offsetParent !== null) {
      navToggle.setAttribute("aria-expanded", "false");
      sidebar.classList.remove("nav-open");
    }
  });


  /* ---------- 4. Highlight the section on screen ---------- */

  var sections = rulebook.querySelectorAll(".chapter, .rule[id]");
  var currentId = null;
  var autoOpened = null;   // chapter opened by scrolling (not by a click)

  function updateActive() {
    // The active section is the last one whose top has scrolled past
    // a line near the top of the window
    var activeId = null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top <= 120) {
        activeId = sections[i].id;
      } else {
        break;
      }
    }
    if (activeId === currentId) { return; }

    // Remove the old highlight
    toc.querySelectorAll(".active, .active-chapter").forEach(function (a) {
      a.classList.remove("active", "active-chapter");
      a.removeAttribute("aria-current");
    });
    currentId = activeId;
    if (!activeId) { return; }

    var link = linksById[activeId];
    var chapterId = chapterOfId[activeId];
    link.classList.add("active");
    link.setAttribute("aria-current", "location");
    if (chapterId !== activeId) {
      linksById[chapterId].classList.add("active-chapter");
    }

    // Open the current chapter; close the one scrolling opened before
    // (chapters the visitor opened by clicking stay open)
    var toggle = togglesByChapter[chapterId];
    if (autoOpened && autoOpened !== chapterId) {
      setExpanded(autoOpened, false);
      autoOpened = null;
    }
    if (toggle && toggle.getAttribute("aria-expanded") !== "true") {
      setExpanded(chapterId, true);
      autoOpened = chapterId;
    }

    // Keep the highlighted link visible inside the scrolling sidebar
    // (desktop only, where the sidebar scrolls on its own)
    if (sidebar.scrollHeight > sidebar.clientHeight) {
      var linkTop = link.offsetTop;
      if (linkTop < sidebar.scrollTop || linkTop > sidebar.scrollTop + sidebar.clientHeight - 40) {
        sidebar.scrollTop = linkTop - sidebar.clientHeight / 3;
      }
    }
  }


  /* ---------- 5. Search ---------- */

  // Each searchable unit: one numbered rule, or a chapter heading
  var searchIndex = [];
  chapters.forEach(function (chapter) {
    var chapterTitle = chapter.querySelector("h3").textContent;
    // Numbered chapters get their own heading-only entry
    if (chapter.querySelector(".rule[id]")) {
      searchIndex.push({ id: chapter.id, title: chapterTitle, text: chapterTitle });
    }

    chapter.querySelectorAll(".rule").forEach(function (rule) {
      var heading = rule.querySelector("h4");
      searchIndex.push({
        id: rule.id || chapter.id,
        title: heading ? heading.textContent : chapterTitle,
        text: rule.textContent.replace(/\s+/g, " ").trim()
      });
    });
  });

  searchBox.addEventListener("input", function () {
    var query = searchBox.value.trim().toLowerCase();
    resultList.innerHTML = "";

    // Empty search: go back to the normal chapter menu
    if (query === "") {
      resultList.hidden = true;
      nav.hidden = false;
      navToggle.hidden = false;
      statusText.textContent = "";
      currentId = null;   // re-highlight now that the menu is visible again
      updateActive();
      return;
    }

    var words = query.split(/\s+/);
    var matches = searchIndex.filter(function (item) {
      var haystack = (item.title + " " + item.text).toLowerCase();
      return words.every(function (w) { return haystack.indexOf(w) !== -1; });
    });

    // Matches in a heading are listed first
    matches.sort(function (a, b) {
      return headingHits(b) - headingHits(a);
    });
    function headingHits(item) {
      return item.title.toLowerCase().indexOf(words[0]) !== -1 ? 1 : 0;
    }

    matches.forEach(function (item) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + item.id;
      var title = document.createElement("strong");
      title.textContent = item.title;
      a.appendChild(title);
      if (item.text !== item.title) {
        a.appendChild(makeSnippet(item.text, words));
      }
      li.appendChild(a);
      resultList.appendChild(li);
    });

    // Results replace the chapter menu while searching
    resultList.hidden = false;
    nav.hidden = true;
    navToggle.hidden = true;
    statusText.textContent = matches.length === 0
      ? "No rules match “" + searchBox.value.trim() + "”."
      : matches.length + (matches.length === 1 ? " section matches." : " sections match.");
  });

  // A short piece of text around the first match, with matches marked
  function makeSnippet(text, words) {
    var lower = text.toLowerCase();
    var at = lower.indexOf(words[0]);
    var start = Math.max(0, at - 50);
    var end = Math.min(text.length, at + words[0].length + 70);
    var piece = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");

    var span = document.createElement("span");
    span.className = "snippet";

    // Split the piece around each search word and wrap words in <mark>
    var pattern = new RegExp("(" + words.map(escapeRegExp).join("|") + ")", "gi");
    piece.split(pattern).forEach(function (part) {
      if (part === "") { return; }
      if (pattern.test(part)) {
        var mark = document.createElement("mark");
        mark.textContent = part;
        span.appendChild(mark);
      } else {
        span.appendChild(document.createTextNode(part));
      }
      pattern.lastIndex = 0;
    });
    return span;
  }

  function escapeRegExp(word) {
    return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }


  /* ---------- 6. Back to Top ---------- */

  function updateBackToTop() {
    backToTop.hidden = window.scrollY < 600;
  }


  /* ---------- Run on scroll (at most once per frame) ---------- */

  var waiting = false;
  window.addEventListener("scroll", function () {
    if (waiting) { return; }
    waiting = true;
    window.requestAnimationFrame(function () {
      updateActive();
      updateBackToTop();
      waiting = false;
    });
  });

  updateActive();
  updateBackToTop();
});
