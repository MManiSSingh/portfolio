console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
    { url: "/portfolio/", title: "Home" },
    { url: "/portfolio/projects/", title: "Projects" },
    { url: "/portfolio/contact/", title: "Contact" },
    { url: "/portfolio/resume.html", title: "Resume" },
    { url: "/portfolio/meta", title: "Meta" },
    { url: "https://github.com/MManiSSingh", title: "GitHub Profile" }
];

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let a = document.createElement("a");
  a.href = p.url;
  a.textContent = p.title;
  a.classList.toggle("current", a.host === location.host && a.pathname === location.pathname);
  a.toggleAttribute("target", a.host !== location.host);
  nav.append(a);
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
    <label class="color-scheme">
        Theme:
        <select id="theme-selector">
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
        </select>
    </label>
  `
);

function setColorScheme(scheme) {
  document.documentElement.style.setProperty("color-scheme", scheme);
  localStorage.setItem("colorScheme", scheme);
}

const themeSelector = document.getElementById("theme-selector");
if (localStorage.getItem("colorScheme")) {
  let savedScheme = localStorage.getItem("colorScheme");
  setColorScheme(savedScheme);
  themeSelector.value = savedScheme;
}

themeSelector.addEventListener("input", function (event) {
  setColorScheme(event.target.value);
});

export async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    if (!containerElement) return;
    containerElement.innerHTML = '';

    projects.forEach((project) => {
        const article = document.createElement("article");
        article.innerHTML = `
            <${headingLevel}>${project.title}</${headingLevel}>
            <img src="${project.image}" alt="${project.title}">
            <p>${project.description}</p>
        `;
        containerElement.appendChild(article);
    });
}

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}

async function loadProjects() {
    try {
        const projects = await fetchJSON("/portfolio/lib/projects.json");
        console.log("Projects data:", projects);

        const projectsContainer = document.querySelector(".projects");
        const projectsTitle = document.querySelector(".projects-title");
        
        if (!projectsContainer) return;

        projectsContainer.innerHTML = "";
        if (projectsTitle) {
            projectsTitle.textContent = `Projects (${projects.length})`;
        }

        renderProjects(projects, projectsContainer, 'h2');
    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

if (document.querySelector(".projects")) {
    loadProjects();
}
