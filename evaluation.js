/**
 * Home Evaluation — FormSubmit + Geoapify SF address autocomplete.
 */
var RECEIVING_EMAIL = "davivinted99@gmail.com";
var GEOAPIFY_API_KEY = "cf899fff043047bdae1e7b3872e5224b";

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var PHONE_RE = /^[\d\s()+.-]{10,}$/;

/** San Francisco city bounds (SW → NE for Geoapify rect filter) */
var SF_BOUNDS = {
  south: 37.6398,
  west: -122.5389,
  north: 37.8324,
  east: -122.3485,
};

var form = document.getElementById("assessment-form");
var successEl = document.getElementById("success");
var submitBtn = document.getElementById("submit-btn");
var formErrorEl = document.getElementById("form-error");
var submitAnotherBtn = document.getElementById("submit-another");
var nextInput = document.getElementById("form-next");
var addressInput = document.getElementById("address");
var suggestionsEl = document.getElementById("address-suggestions");

var FIELDS = ["address", "email", "phone", "consent"];
var allowNativeSubmit = false;
var addressDebounceTimer = null;
var activeSuggestionIndex = -1;
var currentSuggestions = [];

if (!form || !successEl || !submitBtn || !formErrorEl || !nextInput) {
  // Page shell without form — nothing to wire.
} else {
  form.action = "https://formsubmit.co/" + encodeURIComponent(RECEIVING_EMAIL);

  nextInput.value =
    window.location.origin +
    window.location.pathname.replace(/\/?$/, "") +
    "?success=1";

  if (new URLSearchParams(window.location.search).get("success") === "1") {
    showSuccess();
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  form.addEventListener("submit", function (e) {
    if (allowNativeSubmit) return;

    e.preventDefault();
    var data = getFormData();
    if (!validate(data)) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    formErrorEl.hidden = true;
    allowNativeSubmit = true;
    form.submit();
  });

  if (submitAnotherBtn) {
    submitAnotherBtn.addEventListener("click", showFormView);
  }

  FIELDS.forEach(function (name) {
    var el = form.elements[name];
    if (!el) return;
    var eventName = name === "consent" ? "change" : "input";
    el.addEventListener(eventName, function () {
      var errorEl = document.getElementById(name + "-error");
      el.removeAttribute("aria-invalid");
      if (errorEl) {
        errorEl.hidden = true;
        errorEl.textContent = "";
      }
    });
  });

  if (addressInput) {
    addressInput.addEventListener("input", onAddressInput);
    addressInput.addEventListener("keydown", onAddressKeydown);
    addressInput.addEventListener("blur", function () {
      setTimeout(hideSuggestions, 150);
    });
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".address-autocomplete")) {
      hideSuggestions();
    }
  });

  markAddressUnverified();
}

function getFormData() {
  return {
    address: form.address.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    consent: form.consent.checked,
  };
}

function clearErrors() {
  FIELDS.forEach(function (name) {
    var input = form.elements[name];
    var errorEl = document.getElementById(name + "-error");
    if (input) input.removeAttribute("aria-invalid");
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
  });
  formErrorEl.hidden = true;
  formErrorEl.textContent = "";
}

function showError(name, message) {
  var input = form.elements[name];
  var errorEl = document.getElementById(name + "-error");
  if (input) input.setAttribute("aria-invalid", "true");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
}

function markAddressUnverified() {
  if (addressInput) addressInput.dataset.sfVerified = "0";
}

function markAddressVerified() {
  if (addressInput) addressInput.dataset.sfVerified = "1";
}

function isSanFranciscoResult(item) {
  var city = (item.city || item.county || "").toLowerCase();
  var state = (item.state_code || item.state || "").toLowerCase();
  var postcode = String(item.postcode || "");
  var formatted = (item.formatted || "").toLowerCase();

  if (city === "san francisco" && (state === "ca" || state.indexOf("california") !== -1)) {
    return true;
  }
  if (/^941\d{2}$/.test(postcode)) return true;
  if (formatted.indexOf("san francisco") !== -1 && /^941\d{2}/.test(postcode)) {
    return true;
  }
  if (typeof item.lat === "number" && typeof item.lon === "number") {
    return (
      item.lat >= SF_BOUNDS.south &&
      item.lat <= SF_BOUNDS.north &&
      item.lon >= SF_BOUNDS.west &&
      item.lon <= SF_BOUNDS.east
    );
  }
  return false;
}

function hideSuggestions() {
  if (!suggestionsEl) return;
  suggestionsEl.hidden = true;
  suggestionsEl.innerHTML = "";
  currentSuggestions = [];
  activeSuggestionIndex = -1;
  if (addressInput) addressInput.setAttribute("aria-expanded", "false");
}

function renderSuggestions(items) {
  currentSuggestions = items || [];
  activeSuggestionIndex = -1;
  suggestionsEl.innerHTML = "";

  if (!currentSuggestions.length) {
    hideSuggestions();
    return;
  }

  currentSuggestions.forEach(function (item, index) {
    var li = document.createElement("li");
    li.id = "address-option-" + index;
    li.className = "address-suggestion";
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", "false");
    li.textContent = item.formatted || item.address_line1 || "";
    li.addEventListener("mousedown", function (e) {
      e.preventDefault();
      selectSuggestion(index);
    });
    suggestionsEl.appendChild(li);
  });

  suggestionsEl.hidden = false;
  addressInput.setAttribute("aria-expanded", "true");
}

function selectSuggestion(index) {
  var item = currentSuggestions[index];
  if (!item) return;

  if (!isSanFranciscoResult(item)) {
    markAddressUnverified();
    addressInput.value = "";
    hideSuggestions();
    showError(
      "address",
      "Only San Francisco addresses are accepted. Please select an SF address."
    );
    return;
  }

  addressInput.value = item.formatted || item.address_line1 || "";
  markAddressVerified();
  hideSuggestions();

  var errorEl = document.getElementById("address-error");
  addressInput.removeAttribute("aria-invalid");
  if (errorEl) {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }
}

function fetchAddressSuggestions(query) {
  var filter =
    "rect:" +
    SF_BOUNDS.west +
    "," +
    SF_BOUNDS.south +
    "," +
    SF_BOUNDS.east +
    "," +
    SF_BOUNDS.north +
    "|countrycode:us";

  var bias = "proximity:" + -122.4194 + "," + 37.7749;

  var url =
    "https://api.geoapify.com/v1/geocode/autocomplete?" +
    "text=" +
    encodeURIComponent(query) +
    "&format=json" +
    "&limit=6" +
    "&lang=en" +
    "&filter=" +
    encodeURIComponent(filter) +
    "&bias=" +
    encodeURIComponent(bias) +
    "&apiKey=" +
    encodeURIComponent(GEOAPIFY_API_KEY);

  return fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error("Autocomplete request failed");
      return res.json();
    })
    .then(function (data) {
      var results = (data && data.results) || [];
      return results.filter(isSanFranciscoResult);
    });
}

function onAddressInput() {
  markAddressUnverified();
  var query = addressInput.value.trim();

  if (addressDebounceTimer) clearTimeout(addressDebounceTimer);

  if (query.length < 3) {
    hideSuggestions();
    return;
  }

  addressDebounceTimer = setTimeout(function () {
    fetchAddressSuggestions(query)
      .then(function (items) {
        if (addressInput.value.trim() !== query) return;
        renderSuggestions(items);
      })
      .catch(function () {
        hideSuggestions();
      });
  }, 280);
}

function onAddressKeydown(e) {
  if (suggestionsEl.hidden || !currentSuggestions.length) return;

  var options = suggestionsEl.querySelectorAll(".address-suggestion");

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeSuggestionIndex = Math.min(
      activeSuggestionIndex + 1,
      currentSuggestions.length - 1
    );
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, 0);
  } else if (e.key === "Enter" && activeSuggestionIndex >= 0) {
    e.preventDefault();
    selectSuggestion(activeSuggestionIndex);
    return;
  } else if (e.key === "Escape") {
    hideSuggestions();
    return;
  } else {
    return;
  }

  options.forEach(function (opt, i) {
    var selected = i === activeSuggestionIndex;
    opt.setAttribute("aria-selected", selected ? "true" : "false");
    opt.classList.toggle("is-active", selected);
  });
}

function validate(data) {
  clearErrors();
  var ok = true;

  if (!data.address) {
    showError("address", "Property address is required.");
    ok = false;
  } else if (addressInput.dataset.sfVerified !== "1") {
    showError(
      "address",
      "Please select a San Francisco address from the autocomplete suggestions."
    );
    ok = false;
  }

  if (!data.email) {
    showError("email", "Email is required.");
    ok = false;
  } else if (!EMAIL_RE.test(data.email)) {
    showError("email", "Enter a valid email address.");
    ok = false;
  }
  if (data.phone && !PHONE_RE.test(data.phone)) {
    showError("phone", "Enter a valid phone number.");
    ok = false;
  }
  if (!data.consent) {
    showError(
      "consent",
      "Please confirm you agree to be contacted and that this assessment may be shared with interested buyer clients."
    );
    ok = false;
  }

  return ok;
}

function showSuccess() {
  form.hidden = true;
  successEl.hidden = false;
}

function showFormView() {
  successEl.hidden = true;
  form.hidden = false;
  form.reset();
  clearErrors();
  hideSuggestions();
  markAddressUnverified();
  allowNativeSubmit = false;
  submitBtn.disabled = false;
  submitBtn.textContent = "Request My Personalized Review";
}
