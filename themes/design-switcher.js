/**
 * Internal design comparison switcher for /design-* preview routes.
 */
(function () {
  var DESIGNS = [
    { id: "design-original", label: "Original" },
    { id: "design-quiet-luxury", label: "Quiet Luxury" },
    { id: "design-modern-tech", label: "Modern Tech" },
    { id: "design-classic-luxury", label: "Classic Luxury" },
  ];

  var parts = window.location.pathname.split("/").filter(Boolean);
  var currentDesign = "";
  var pageFile = "index.html";

  for (var i = 0; i < parts.length; i++) {
    if (parts[i].indexOf("design-") === 0) {
      currentDesign = parts[i];
      pageFile = parts[i + 1] || "index.html";
      break;
    }
  }

  if (!currentDesign) return;
  if (!/\.html$/i.test(pageFile)) pageFile = "index.html";

  var bar = document.createElement("div");
  bar.className = "design-switcher";
  bar.setAttribute("role", "navigation");
  bar.setAttribute("aria-label", "Design version switcher");

  var inner = document.createElement("div");
  inner.className = "design-switcher-inner";

  var label = document.createElement("span");
  label.className = "design-switcher-label";
  label.textContent = "Design";
  inner.appendChild(label);

  var links = document.createElement("div");
  links.className = "design-switcher-links";

  DESIGNS.forEach(function (design) {
    var a = document.createElement("a");
    a.href = "../" + design.id + "/" + pageFile + window.location.search + window.location.hash;
    a.textContent = design.label;
    if (design.id === currentDesign) {
      a.className = "is-active";
      a.setAttribute("aria-current", "page");
    }
    links.appendChild(a);
  });

  inner.appendChild(links);

  var note = document.createElement("span");
  note.className = "design-switcher-note";
  note.textContent = "Preview only — live site unchanged";
  inner.appendChild(note);

  bar.appendChild(inner);
  document.body.insertBefore(bar, document.body.firstChild);
})();
