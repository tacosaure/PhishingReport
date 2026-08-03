const TEAMS_URL = "https://raw.githubusercontent.com/tacosaure/PhishingReport/refs/heads/main/security_team_company_list.json";

const params = new URLSearchParams(window.location.search);
const messageId = params.get("messageId");

const listEl = document.getElementById("team-list");
const searchBox = document.getElementById("search-box");
const resultCountEl = document.getElementById("result-count");

let allTeams = [];

async function loadTeams() {
  try {
    const response = await fetch(TEAMS_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`);
    }
    const teams = await response.json();

    // Sort alphabetically by name (case-insensitive, locale-aware for accents)
    allTeams = teams.slice().sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

    renderTeams(allTeams);
  } catch (err) {
    resultCountEl.textContent = "";
    listEl.innerHTML = `<p id="status" class="error">Could not load team list: ${err.message}</p>`;
  }
}

function renderTeams(teams) {
  listEl.innerHTML = "";

  if (!Array.isArray(teams) || teams.length === 0) {
    resultCountEl.textContent = "";
    listEl.innerHTML = `<p id="status">No matching teams.</p>`;
    return;
  }

  resultCountEl.textContent = `${teams.length} team${teams.length === 1 ? "" : "s"}`;

  for (const team of teams) {
    const row = document.createElement("button");
    row.className = "team-row";
    row.type = "button";

    const info = document.createElement("span");
    info.className = "team-info";

    const name = document.createElement("div");
    name.className = "team-name";
    name.textContent = team.name;

    const email = document.createElement("div");
    email.className = "team-email";
    email.textContent = team.email;

    info.appendChild(name);
    info.appendChild(email);

    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.setAttribute("viewBox", "0 0 24 24");
    chevron.setAttribute("fill", "none");
    chevron.setAttribute("stroke", "currentColor");
    chevron.setAttribute("stroke-width", "2");
    chevron.innerHTML = '<path d="m9 6 6 6-6 6"/>';

    row.appendChild(info);
    row.appendChild(chevron);
    row.addEventListener("click", () => selectTeam(team));
    listEl.appendChild(row);
  }
}

function filterTeams(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return allTeams;
  }
  return allTeams.filter(
    (team) =>
      team.name.toLowerCase().includes(q) ||
      team.email.toLowerCase().includes(q)
  );
}

searchBox.addEventListener("input", () => {
  renderTeams(filterTeams(searchBox.value));
});

async function selectTeam(team) {
  // Tell the background script which team + message to report
  await messenger.runtime.sendMessage({
    type: "report-to-team",
    messageId: Number(messageId),
    teamName: team.name,
    teamEmail: team.email
  });
  window.close();
}

loadTeams();
