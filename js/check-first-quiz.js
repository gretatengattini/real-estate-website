(function () {
  const root = document.querySelector("[data-check-first-quiz]");
  if (!root) return;

  const choices = Array.from(root.querySelectorAll("[data-choice]"));
  const feedback = root.querySelector("[data-feedback]");
  const explain = root.querySelector("[data-explain]");
  if (!choices.length || !feedback || !explain) return;

  const answers = {
    comps: {
      correct: false,
      message:
        "Try again. First, verify the legal unit count so you know which sales to compare."
    },
    records: {
      correct: true,
      message: "Correct! I’d check the city records and approved plans first."
    },
    cost: {
      correct: false,
      message:
        "Try again. First, find out whether the city could approve combining the units."
    }
  };

  function clearState() {
    choices.forEach((btn) => {
      btn.classList.remove("is-correct", "is-incorrect", "is-selected");
      btn.setAttribute("aria-pressed", "false");
      const status = btn.querySelector("[data-status]");
      if (status) {
        status.textContent = "";
        status.hidden = true;
      }
    });
    feedback.textContent = "";
    feedback.classList.remove("is-correct", "is-incorrect");
    explain.hidden = true;
  }

  function selectChoice(btn) {
    const key = btn.getAttribute("data-choice");
    const answer = answers[key];
    if (!answer) return;

    clearState();

    btn.classList.add("is-selected");
    btn.setAttribute("aria-pressed", "true");

    const status = btn.querySelector("[data-status]");
    if (answer.correct) {
      btn.classList.add("is-correct");
      if (status) {
        status.textContent = "Correct";
        status.hidden = false;
      }
      feedback.classList.add("is-correct");
      feedback.textContent = answer.message;
      explain.hidden = false;
    } else {
      btn.classList.add("is-incorrect");
      if (status) {
        status.textContent = "Incorrect";
        status.hidden = false;
      }
      feedback.classList.add("is-incorrect");
      feedback.textContent = answer.message;
    }
  }

  choices.forEach((btn) => {
    btn.addEventListener("click", () => selectChoice(btn));
  });

  root.hidden = false;
})();
