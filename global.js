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
