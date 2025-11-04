const resources = [
  {
    id: "r1",
    title: "Basic Mathematics - Primary 6",
    subject: "Mathematics",
    level: "Primary",
    language: "English",
    summary: "A compact guide covering arithmetic and fractions.",
    thumbnail: "https://picsum.photos/seed/math/400/240",
    size: "1.2 MB",
    url: "#"
  },
  {
    id: "r2",
    title: "Kinyarwanda Grammar Essentials",
    subject: "Languages",
    level: "Secondary",
    language: "Kinyarwanda",
    summary: "Grammar rules and exercises in Kinyarwanda.",
    thumbnail: "https://picsum.photos/seed/kin/400/240",
    size: "800 KB",
    url: "#"
  },
  {
    id: "r3",
    title: "Intro to Biology (Audio)",
    subject: "Biology",
    level: "Secondary",
    language: "English",
    summary: "Audio lessons optimized for low bandwidth.",
    thumbnail: "https://picsum.photos/seed/bio/400/240",
    size: "3 MB",
    url: "#"
  }
];

const list = document.getElementById("resourceList");
const modal = document.getElementById("modal");
const searchInput = document.getElementById("searchInput");
const levelFilter = document.getElementById("levelFilter");
const subjectFilter = document.getElementById("subjectFilter");
const languageFilter = document.getElementById("languageFilter");

function renderResources() {
  const q = searchInput.value.toLowerCase();
  const level = levelFilter.value;
  const subject = subjectFilter.value;
  const language = languageFilter.value;

  list.innerHTML = "";
  resources.filter(r => {
    return (
      (level === "Any" || r.level === level) &&
      (subject === "Any" || r.subject === subject) &&
      (language === "Any" || r.language === language) &&
      (r.title.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q))
    );
  }).forEach(r => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${r.thumbnail}" alt="">
      <div class="card-body">
        <h3>${r.title}</h3>
        <p>${r.summary}</p>
        <button onclick="openModal('${r.id}')">View</button>
      </div>
    `;
    list.appendChild(div);
  });
}

function openModal(id) {
  const r = resources.find(x => x.id === id);
  modal.innerHTML = `
    <div class="modal-content">
      <h2>${r.title}</h2>
      <p><strong>Subject:</strong> ${r.subject} | <strong>Level:</strong> ${r.level} | <strong>Language:</strong> ${r.language}</p>
      <p>${r.summary}</p>
      <a href="${r.url}" target="_blank">Open Resource</a>
      <button onclick="closeModal()">Close</button>
    </div>
  `;
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
}

searchInput.addEventListener("input", renderResources);
levelFilter.addEventListener("change", renderResources);
subjectFilter.addEventListener("change", renderResources);
languageFilter.addEventListener("change", renderResources);

renderResources();
