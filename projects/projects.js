import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js';

(async function() {
    // Step 1: Fetch and Render Projects
    let projects = await fetchJSON('../lib/projects.json');
    const projectsContainer = document.querySelector('.projects');
    renderProjects(projects, projectsContainer, 'h2');

    let query = '';
    let searchInput = document.querySelector('.searchBar');

    // Function to render Pie Chart based on current projects
    function renderPieChart(projectsGiven) {
        // Recalculate rolled data
        let newRolledData = d3.rollups(
            projectsGiven,
            (v) => v.length,  // Count projects per year
            (d) => d.year      // Group by year
        );

        // Convert to { label, value } format
        let newData = newRolledData.map(([year, count]) => ({
            value: count,
            label: year
        }));

        let colorScale = d3.scaleOrdinal(d3.schemeTableau10);

        // Clear previous SVG and legend before re-rendering
        let svg = d3.select("#projects-pie-plot");
        svg.selectAll("path").remove();
        let legend = d3.select(".legend");
        legend.selectAll("li").remove();

        // Generate Pie Chart
        let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
        let sliceGenerator = d3.pie().value(d => d.value);
        let arcData = sliceGenerator(newData);

        svg.selectAll("path")
            .data(arcData)
            .enter()
            .append("path")
            .attr("d", arcGenerator)
            .attr("fill", (d, i) => colorScale(i))
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

        // Generate the Legend
        newData.forEach((d, idx) => {
            legend.append('li')
                .attr('style', `--color:${colorScale(idx)}`)
                .attr('class', 'legend-item')
                .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
        });
    }

    // Initial render
    renderPieChart(projects);

    // Search event listener
    searchInput.addEventListener('input', (event) => {
        query = event.target.value.toLowerCase();

        // Filter projects dynamically
        let filteredProjects = projects.filter((project) => {
            let values = Object.values(project).join('\n').toLowerCase();
            return values.includes(query);
        });

        // Re-render projects and pie chart
        renderProjects(filteredProjects, projectsContainer, 'h2');
        renderPieChart(filteredProjects);
    });

})();
