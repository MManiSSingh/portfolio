import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = [];
let commits = [];
let selectedCommits = [];
let xScale, yScale; // Global scales for scatterplot

// NEW variables for Step 1:
let commitProgress = 100; // slider value (0-100)
let progressScale;       // scale to map slider percent to commit datetime
let commitMaxTime;       // cutoff datetime for filtering
let filteredCommits;     // commits filtered by time

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
    // Initialize the progressScale: maps from the commit datetime domain to [0, 100]
    progressScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([0, 100]);
    // Determine the current max time based on commitProgress
    commitMaxTime = progressScale.invert(commitProgress);
    // Filter commits using the cutoff time
    filterCommitsByTime();

    displayStats();
    updateScatterplot(filteredCommits);

    // Hook up the slider event to update the visualization as the user moves it
    d3.select("#time-slider").on("input", updateTimeDisplay);
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

        Object.defineProperty(ret, 'lines', {
            value: lines,
            enumerable: false,
        });

        return ret;
    });
}

/**
 * Filter commits based on commitMaxTime.
 */
function filterCommitsByTime() {
    // Update the cutoff time based on current slider value
    commitMaxTime = progressScale.invert(commitProgress);
    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
}

/**
 * Called when the slider changes.
 */
function updateTimeDisplay() {
    commitProgress = +d3.select("#time-slider").property("value");
    commitMaxTime = progressScale.invert(commitProgress);
    // Update the <time> element to show the current cutoff time
    d3.select("#selectedTime").text(commitMaxTime.toLocaleString());
    // Filter commits and update the scatterplot
    filterCommitsByTime();
    updateScatterplot(filteredCommits);
    // Optionally, update summary stats if you want them to reflect the filtered subset
    displayStats();
}

function updateScatterplot(filteredCommits) {
    const width = 1000,
          height = 600,
          margin = { top: 10, right: 10, bottom: 30, left: 50 };

    // Remove the existing SVG so we can re-render
    d3.select('#chart').select('svg').remove();

    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // Update the xScale to use filteredCommits
    xScale = d3.scaleTime()
        .domain(d3.extent(filteredCommits, d => d.datetime))
        .range([margin.left, width - margin.right])
        .nice();

    // yScale remains the same
    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height - margin.bottom, margin.top]);

    const rScale = d3.scaleSqrt()
        .domain(d3.extent(filteredCommits, d => d.totalLines))
        .range([2, 30]);

    // Add axes and gridlines
    svg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale));
    svg.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(
            d3.axisLeft(yScale)
              .tickFormat(d => String(d % 24).padStart(2, '0') + ':00')
        );
    svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(
            d3.axisLeft(yScale)
              .tickFormat('')
              .tickSize(-width + margin.right + margin.left)
        );

    // Create circles for each commit
    const dots = svg.append('g').attr('class', 'dots');

    dots.selectAll('circle')
        .data(d3.sort(filteredCommits, d => -d.totalLines))
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        // The new circles will transition in from a radius of 0 (see CSS @starting-style below)
        .attr('r', d => rScale(d.totalLines))
        .style('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
            d3.select(event.currentTarget).classed('selected', true);
        })
        .on('mouseleave', function () {
            updateTooltipVisibility(false);
            d3.select(this).classed('selected', false);
        });

    // Add brushing back in
    const brush = d3.brush()
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
        .on('start brush end', brushed);

    svg.append('g')
        .attr('class', 'brush')
        .call(brush);
}

// Update brushed and selection functions remain the same
function brushed(event) {
    const selection = event.selection;
    selectedCommits = !selection
        ? []
        : commits.filter(commit => {
            const min = { x: selection[0][0], y: selection[0][1] };
            const max = { x: selection[1][0], y: selection[1][1] };
            const x = xScale(commit.datetime);
            const y = yScale(commit.hourFrac);
            return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
        });
    updateSelection();
}

function isCommitSelected(commit) {
    return selectedCommits.includes(commit);
}

function updateSelection() {
    d3.selectAll('circle').classed('selected', d => isCommitSelected(d));
    updateSelectionCount();
    updateLanguageBreakdown();
}

function updateSelectionCount() {
    document.getElementById('selection-count').textContent =
        `${selectedCommits.length || 'No'} commits selected`;
}

function updateLanguageBreakdown() {
    const container = document.getElementById('language-breakdown');
    
    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }

    const lines = selectedCommits.flatMap(d => d.lines);
    const breakdown = d3.rollup(lines, v => v.length, d => d.type);
    container.innerHTML = '';

    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);
        container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${formatted})</dd>`;
    }
}

document.addEventListener('DOMContentLoaded', loadData);
