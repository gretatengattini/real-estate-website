(function () {
  const dataEl = document.getElementById("noe-valley-homes-data");
  const root = document.querySelector("[data-sale-reveal]");
  if (!dataEl || !root) return;

  let homes;
  try {
    homes = JSON.parse(dataEl.textContent);
  } catch (err) {
    return;
  }
  if (!Array.isArray(homes) || homes.length === 0) return;

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });

  const sqftFmt = new Intl.NumberFormat("en-US");

  function dollarsAbove(listed, sold) {
    return sold - listed;
  }

  function percentAbove(listed, sold) {
    return ((sold - listed) / listed) * 100;
  }

  function formatPercent(value) {
    return value.toFixed(1) + "%";
  }

  function metaLine(home) {
    const parts = [home.beds, home.baths];
    if (home.sqft) parts.push(sqftFmt.format(home.sqft) + " sq ft");
    return parts.join(" · ");
  }

  const els = {
    progress: root.querySelector("[data-progress]"),
    address: root.querySelector("[data-address]"),
    closed: root.querySelector("[data-closed]"),
    photoWrap: root.querySelector("[data-photo-wrap]"),
    photo: root.querySelector("[data-photo]"),
    meta: root.querySelector("[data-meta]"),
    listed: root.querySelector("[data-listed]"),
    prompt: root.querySelector("[data-prompt]"),
    revealBtn: root.querySelector("[data-reveal]"),
    result: root.querySelector("[data-result]"),
    sold: root.querySelector("[data-sold]"),
    diff: root.querySelector("[data-diff]"),
    pct: root.querySelector("[data-pct]"),
    prev: root.querySelector("[data-prev]"),
    next: root.querySelector("[data-next]"),
    live: root.querySelector("[data-live]")
  };

  let index = 0;
  const revealed = new Set();

  function announce(message) {
    if (!els.live) return;
    els.live.textContent = "";
    window.requestAnimationFrame(() => {
      els.live.textContent = message;
    });
  }

  function renderMedia(home) {
    if (!els.photoWrap || !els.photo) return;

    if (home.photo) {
      els.photo.src = home.photo;
      els.photo.alt = home.photoAlt || "Exterior of " + home.address;
      if (home.photoWidth) els.photo.width = home.photoWidth;
      else els.photo.removeAttribute("width");
      if (home.photoHeight) els.photo.height = home.photoHeight;
      else els.photo.removeAttribute("height");
      els.photoWrap.hidden = false;
    } else {
      els.photo.removeAttribute("src");
      els.photo.alt = "";
      els.photo.removeAttribute("width");
      els.photo.removeAttribute("height");
      els.photoWrap.hidden = true;
    }
  }

  function render() {
    const home = homes[index];
    const isRevealed = revealed.has(index);
    const diff = dollarsAbove(home.listed, home.sold);
    const pct = percentAbove(home.listed, home.sold);

    els.progress.textContent = "Home " + (index + 1) + " of " + homes.length;
    els.address.textContent = home.address;
    if (els.closed) {
      els.closed.textContent = home.closed ? "Closed " + home.closed : "";
      els.closed.hidden = !home.closed;
    }
    renderMedia(home);
    els.meta.textContent = metaLine(home);
    els.listed.textContent = money.format(home.listed);

    els.revealBtn.hidden = isRevealed;
    els.prompt.hidden = isRevealed;

    els.result.hidden = !isRevealed;
    els.result.classList.toggle("is-revealing", isRevealed);

    if (isRevealed) {
      els.sold.textContent = money.format(home.sold);
      els.diff.textContent = money.format(diff);
      els.pct.textContent = formatPercent(pct);
    } else {
      els.sold.textContent = "";
      els.diff.textContent = "";
      els.pct.textContent = "";
    }

    els.prev.disabled = index === 0;
    els.next.disabled = index === homes.length - 1;
  }

  els.revealBtn.addEventListener("click", () => {
    const home = homes[index];
    revealed.add(index);
    render();
    announce(
      home.address +
        " sold for " +
        money.format(home.sold) +
        ", " +
        money.format(dollarsAbove(home.listed, home.sold)) +
        " above asking (" +
        formatPercent(percentAbove(home.listed, home.sold)) +
        ")."
    );
  });

  els.prev.addEventListener("click", () => {
    if (index === 0) return;
    index -= 1;
    render();
    announce(homes[index].address);
  });

  els.next.addEventListener("click", () => {
    if (index >= homes.length - 1) return;
    index += 1;
    render();
    announce(homes[index].address);
  });

  root.hidden = false;
  render();
})();
