import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { fetchJSON, renderProjects } from '../global.js';

(async function() {
    // Step 1: Fetch and Render Projects
    const projects = await fetchJSON('../lib/projects.json');
    const projectsContainer = document.querySelector('.projects');
    renderProjects(projects, projectsContainer, 'h2');

    // Step 2: Create an SVG for the Pie Chart
    const svg = d3.select("#projects-pie-plot");

    // Step 3: Draw a Simple Circle Using d3.arc()
    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

    let fullCircle = arcGenerator({
        startAngle: 0,
        endAngle: 2 * Math.PI
    });

    svg.append("path")
       .attr("d", fullCircle)
       .attr("fill", "red"); // A full red circle (placeholder for pie chart)

    // Step 4: Static Pie Chart with Two Slices
    let data = [1, 2]; // Two slices, 33% and 66%
    
    let total = data.reduce((sum, d) => sum + d, 0);
    let angle = 0;
    let arcData = data.map(d => {
        let endAngle = angle + (d / total) * 2 * Math.PI;
        let slice = { startAngle: angle, endAngle };
        angle = endAngle;
        return slice;
    });

    let arcs = arcData.map(d => arcGenerator(d));

    // Add paths to SVG
    let colors = ["gold", "purple"]; // Two slice colors
    arcs.forEach((arc, idx) => {
        svg.append("path")
           .attr("d", arc)
           .attr("fill", colors[idx]); // Assign color to each slice
    });

    // Step 5: Dynamic Pie Chart Using d3.pie()
    let dynamicData = [1, 2, 3, 4, 5, 5]; // More slices

    let colorScale = d3.scaleOrdinal(d3.schemeTableau10); // Auto color generation

    let sliceGenerator = d3.pie();
    let arcDataDynamic = sliceGenerator(dynamicData);
    let arcsDynamic = arcDataDynamic.map(d => arcGenerator(d));

    // Append the dynamic pie chart slices
    svg.selectAll("path")
       .data(arcsDynamic)
       .enter()
       .append("path")
       .attr("d", arcGenerator)
       .attr("fill", (d, i) => colorScale(i)) // Assign colors dynamically
       .attr("stroke", "#fff")
       .attr("stroke-width", 1);
})();
