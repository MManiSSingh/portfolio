import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js';

(async function() {
    // Step 1: Fetch and Render Projects
    const projects = await fetchJSON('../lib/projects.json');
    const projectsContainer = document.querySelector('.projects');
    renderProjects(projects, projectsContainer, 'h2');

    // Step 2: Group Projects by Year
    let rolledData = d3.rollups(
        projects,
        (v) => v.length,  // Count projects per year
        (d) => d.year      // Group by year
    );

    // Step 3: Convert to { label, value } format
    let data = rolledData.map(([year, count]) => ({
        value: count,
        label: year
    }));

    let colorScale = d3.scaleOrdinal(d3.schemeTableau10);

    // Step 4: Create Pie Chart
    let arcGenerator = d3.arc()
        .innerRadius(0)  // Pie chart (0) or donut (>0)
        .outerRadius(50);

    let sliceGenerator = d3.pie().value(d => d.value);
    let arcData = sliceGenerator(data);

    let svg = d3.select("#projects-pie-plot");

    svg.selectAll("path")
        .data(arcData)
        .enter()
        .append("path")
        .attr("d", arcGenerator)
        .attr("fill", (d, i) => colorScale(i))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1);

    // Step 5: Generate the Legend
    let legend = d3.select('.legend');
    
    data.forEach((d, idx) => {
        legend.append('li')
            .attr('style', `--color:${colorScale(idx)}`)
            .attr('class', 'legend-item')
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
    });
})();
