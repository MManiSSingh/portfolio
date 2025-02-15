import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = [];
let commits = [];

async function loadData() {
    data = await d3.csv('../meta/loc.csv', (row) => ({
        ...row,
        line: +row.line,
        depth: +row.depth,
        length: +row.length,
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    processCommits();
    displayStats();
    createScatterplot();
}

function processCommits() {
    commits = d3.groups(data, d => d.commit).map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;

        let ret = {
            id: commit,
            url: `https://github.com/YOUR_REPO/commit/${commit}`,
            author,
            date,
            time,
            timezone,
            datetime,
            hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
            totalLines: lines.length,
        };

        Object.defineProperty(ret, 'lines', { value: lines, enumerable: false });

        return ret;
    });
}

function displayStats() {
    document.getElementById('commits-count').textContent = commits.length;
    document.getElementById('files-count').textContent = d3.group(data, d => d.file).size;
    document.getElementById('loc-count').textContent = data.length;
    document.getElementById('max-depth').textContent = d3.max(data, d => d.depth);
    document.getElementById('longest-line').textContent = d3.max(data, d => d.length);
    document.getElementById('max-lines').textContent = d3.max(data, d => d.line);
}

function createScatterplot() {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 50 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3
        .select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .style("overflow", "visible");

    const xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    const yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
    
    // Use square root scale for proportional perception
    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]); // Adjust size range

    const dots = svg.append("g").attr("class", "dots");

    // Sort commits by size so smaller dots are always on top
    const sortedCommits = d3.sort(commits, d => -d.totalLines);

    dots
        .selectAll("circle")
        .data(sortedCommits)
        .join("circle")
        .attr("cx", d => xScale(d.datetime))
        .attr("cy", d => yScale(d.hourFrac))
        .attr("r", d => rScale(d.totalLines))
        .attr("fill", "steelblue")
        .style("fill-opacity", 0.7)
        .on("mouseenter", function (event, commit) {
            d3.select(event.currentTarget).style("fill-opacity", 1); 
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on("mouseleave", function () {
            d3.select(event.currentTarget).style("fill-opacity", 0.7); 
            updateTooltipVisibility(false);
        });

    // Add X and Y axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).tickFormat(d => `${String(d).padStart(2, '0')}:00`);

    svg.append("g").attr("transform", `translate(0, ${usableArea.bottom})`).call(xAxis);
    svg.append("g").attr("transform", `translate(${usableArea.left}, 0)`).call(yAxis);

    // Add Grid Lines
    const gridlines = svg.append("g").attr("class", "gridlines").attr("transform", `translate(${usableArea.left}, 0)`);
    gridlines.call(d3.axisLeft(yScale).tickFormat("").tickSize(-usableArea.width));
}

function updateTooltipContent(commit) {
    const link = document.getElementById("commit-link");
    const date = document.getElementById("commit-date");

    if (!commit || Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString("en", { dateStyle: "full" });
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById("commit-tooltip");
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById("commit-tooltip");
    tooltip.style.left = `${event.clientX + 10}px`;
    tooltip.style.top = `${event.clientY + 10}px`;
}

document.addEventListener("DOMContentLoaded", loadData);
