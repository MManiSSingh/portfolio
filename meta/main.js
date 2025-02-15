import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = [];
let commits = [];
const width = 1000;
const height = 600;
const margin = { top: 20, right: 20, bottom: 40, left: 60 };

// Load data and process statistics
async function loadData() {
    data = await d3.csv('../meta/loc.csv', (row) => ({
        ...row,
        line: +row.line,
        depth: +row.depth,
        length: +row.length,
        datetime: new Date(row.datetime),
        hourFrac: new Date(row.datetime).getHours() + new Date(row.datetime).getMinutes() / 60,
    }));

    processCommits();
    displayStats();
    createScatterplot(); // Create visualization after loading data
}

// Process commits data
function processCommits() {
    commits = d3.groups(data, d => d.commit).map(([commit, lines]) => {
        let first = lines[0];

        let { author, datetime } = first;
        let ret = {
            id: commit,
            url: `https://github.com/YOUR_REPO/commit/${commit}`,
            author,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
        };

        Object.defineProperty(ret, 'lines', {
            value: lines,
            enumerable: false,
        });

        return ret;
    });
}

// Display statistics summary
function displayStats() {
    const statsContainer = d3.select("#stats");
    statsContainer.html(""); // Clear previous content

    const summary = [
        { label: "Total LOC", value: data.length },
        { label: "Total commits", value: commits.length },
        { label: "Number of Files", value: d3.group(data, d => d.file).size },
        { label: "Longest File (Lines)", value: d3.max(data, d => d.line) },
        { label: "Avg File Length (Lines)", value: d3.mean(d3.rollups(data, v => d3.max(v, d => d.line), d => d.file), d => d[1]).toFixed(2) },
        { label: "Most Active Time of Day", value: getMostActiveTime() }
    ];

    summary.forEach(stat => {
        statsContainer
            .append("div")
            .attr("class", "stat-item")
            .html(`<span>${stat.label}</span><strong>${stat.value}</strong>`);
    });
}

// Determine most active commit time
function getMostActiveTime() {
    let mostActivePeriod = d3.rollups(data, v => v.length, d => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' }));
    return d3.greatest(mostActivePeriod, d => d[1])?.[0] || "N/A";
}

// Create scatter plot for commit times
function createScatterplot() {
    if (!commits.length) return;

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Create scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // Remove previous chart before rendering
    d3.select("#chart").selectAll("svg").remove();

    // Create SVG container
    const svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    // Add gridlines BEFORE axes
    const gridlines = svg.append("g")
        .attr("class", "gridlines")
        .attr("transform", `translate(${usableArea.left}, 0)`);

    gridlines.call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));

    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => `${String(d % 24).padStart(2, "0")}:00`);

    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Add Y axis
    svg.append("g")
        .attr("transform", `translate(${usableArea.left}, 0)`)
        .call(yAxis);

    // Color scale for dots (orange for day, blue for night)
    const colorScale = d3.scaleSequential(d3.interpolateWarm).domain([0, 24]);

    // Draw scatter points
    const dots = svg.append("g")
        .attr("class", "dots")
        .selectAll("circle")
        .data(commits)
        .join("circle")
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.hourFrac))
        .attr("r", 5)
        .attr("fill", d => colorScale(d.hourFrac))
        .attr("opacity", 0.8)
        .on("mouseenter", (event, commit) => {
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on("mouseleave", () => {
            updateTooltipContent({});
            updateTooltipVisibility(false);
        })
        .on("mousemove", updateTooltipPosition);
}

// Update tooltip content
function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');

    if (!commit.id) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });
}

// Update tooltip visibility
function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

// Update tooltip position
function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
}

// Run script after page loads
document.addEventListener("DOMContentLoaded", loadData);
