import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js';

(async function() {
    let projects = await fetchJSON('../lib/projects.json');
    const projectsContainer = document.querySelector('.projects');
    renderProjects(projects, projectsContainer, 'h2');

    let query = '';
    let selectedYear = null;
    let searchInput = document.querySelector('.searchBar');

    function renderPieChart(projectsGiven) {
        let newRolledData = d3.rollups(
            projectsGiven,
            (v) => v.length,
            (d) => d.year
        );

        let newData = newRolledData.map(([year, count]) => ({
            value: count,
            label: year
        }));

        let colorScale = d3.scaleOrdinal(d3.schemeTableau10);

        // Clear previous SVG and legend
        let svg = d3.select("#projects-pie-plot");
        svg.selectAll("path").remove();
        let legend = d3.select(".legend");
        legend.selectAll("li").remove();

        let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
        let sliceGenerator = d3.pie().value(d => d.value);
        let arcData = sliceGenerator(newData);

        // Render Pie Chart
        svg.selectAll("path")
            .data(arcData)
            .enter()
            .append("path")
            .attr("d", arcGenerator)
            .attr("fill", (d, i) => colorScale(i))
            .attr("stroke", "#fff")
            .attr("stroke-width", 1)
            .attr("class", (d) => (d.data.label === selectedYear ? "selected" : ""))
            .on("click", function(event, d) {
                if (selectedYear === d.data.label) {
                    selectedYear = null; // Deselect
                } else {
                    selectedYear = d.data.label; // Select new year
                }
                updateFilteredProjects();
            });

        // Render Legend
        newData.forEach((d, idx) => {
            let legendItem = legend.append('li')
                .attr('style', `--color:${colorScale(idx)}`)
                .attr('class', 'legend-item')
                .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`)
                .on("click", () => {
                    if (selectedYear === d.label) {
                        selectedYear = null;
                    } else {
                        selectedYear = d.label;
                    }
                    updateFilteredProjects();
                });

            if (d.label === selectedYear) {
                legendItem.classed("selected", true);
            }
        });
    }

    function updateFilteredProjects() {
        let filteredProjects = projects.filter((project) => {
            let values = Object.values(project).join('\n').toLowerCase();
            let matchesSearch = values.includes(query);
            let matchesYear = selectedYear === null || project.year === selectedYear;
            return matchesSearch && matchesYear;
        });

        projectsContainer.innerHTML = '';
        renderProjects(filteredProjects, projectsContainer, 'h2');
        renderPieChart(filteredProjects);
    }

    renderPieChart(projects);

    searchInput.addEventListener('input', (event) => {
        query = event.target.value.toLowerCase();
        updateFilteredProjects();
    });

})();
