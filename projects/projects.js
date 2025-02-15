import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js';

(async function() {
    // Step 1: Fetch and Render Projects
    const projects = await fetchJSON('../lib/projects.json');
    const projectsContainer = document.querySelector('.projects');
    renderProjects(projects, projectsContainer, 'h2');

    // Step 2: Process Data for Pie Chart
    const projectCounts = projects.map(proj => proj.category).reduce((acc, category) => {
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});

    const data = Object.values(projectCounts); // Convert category counts to an array
    const colorScale = d3.scaleOrdinal(d3.schemeTableau10); // Color scale

    // Step 3: Create Pie Chart
    const arcGenerator = d3.arc()
        .innerRadius(0)  // Pie chart (0) or donut (>0)
        .outerRadius(50);

    const sliceGenerator = d3.pie();
    const arcData = sliceGenerator(data);

    d3.select("#projects-pie-plot")
        .selectAll("path")
        .data(arcData)
        .enter()
        .append("path")
        .attr("d", arcGenerator)
        .attr("fill", (d, i) => colorScale(i))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1);
})();
