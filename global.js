console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/", title: "Contact" },
  { url: "resume.html", title: "Resume" },
  { url: "https://github.com/MManiSSingh", title: "GitHub Profile" }
];

const ARE_WE_HOME = document.documentElement.classList.contains("home");

let nav = document.createElement("nav");
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  if (!ARE_WE_HOME && !url.startsWith("http")) {
    url = "../" + url;
  }

  let a = document.createElement("a");
  a.href = url;
  a.textContent = title;
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

async function loadProjects() {
    try {
        const projects = await fetchJSON("/portfolio/lib/projects.json");
        console.log("Projects data:", projects);

        const projectsContainer = document.querySelector(".projects");
        if (!projectsContainer) return;

        projectsContainer.innerHTML = "";

        projects.forEach((project) => {
            const article = document.createElement("article");
            article.innerHTML = `
                <h2>${project.title}</h2>
                <img src="${project.image}" alt="">
                <p>${project.description}</p>
            `;
            projectsContainer.appendChild(article);
        });
    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

if (document.querySelector(".projects")) {
    loadProjects();
}
