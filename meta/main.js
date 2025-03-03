import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = [];
let commits = [];
// Removed brushSelection; we now have selectedCommits
let selectedCommits = [];
let xScale, yScale; // Declare global scales

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

        Object.defineProperty(ret, 'lines', {
            value: lines,
            enumerable: false,
        });

        return ret;
    });
}

/**
 *  Displays the summary stats (commits, files, total LOC, etc.)
 *  in a row with large numbers and small labels.
 */
function displayStats() {
    // Remove any previous content in #stats
    d3.select('#stats').selectAll('*').remove();

    // Compute stats
    const totalLOC = data.length;
    const totalCommits = commits.length;
    const numFiles = d3.group(data, d => d.file).size;
    const maxFileLength = d3.max(data, d => d.line);
    const avgFileLength = d3.mean(
        d3.rollups(data, v => d3.max(v, d => d.line), d => d.file),
        d => d[1]
    );
    const mostActivePeriod = d3.rollups(
        data,
        v => v.length,
        d => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })
    );
    const maxPeriod = d3.greatest(mostActivePeriod, d => d[1])?.[0] ?? 'N/A';

    // Create a container for the summary row
    const summary = d3.select('#stats')
        .append('div')
        .attr('class', 'summary');  // Make sure .summary is styled in your CSS

    // Each stat is a .stat-item with a <span> label and a <strong> value
    summary.append('div')
        .attr('class', 'stat-item')
        .html(`
            <span>Commits</span>
            <strong>${totalCommits}</strong>
        `);

    summary.append('div')
        .attr('class', 'stat-item')
        .html(`
            <span>Files</span>
            <strong>${numFiles}</strong>
        `);

    summary.append('div')
        .attr('class', 'stat-item')
        .html(`
            <span>Total LOC</span>
            <strong>${totalLOC}</strong>
        `);

    summary.append('div')
        .attr('class', 'stat-item')
        .html(`
            <span>Longest Line</span>
            <strong>${maxFileLength}</strong>
        `);

    summary.append('div')
        .attr('class', 'stat-item')
        .html(`
            <span>Avg File</span>
            <strong>${avgFileLength.toFixed(2)}</strong>
        `);

    summary.append('div')
        .attr('class', 'stat-item')
        .html(`
            <span>Most Active</span>
            <strong>${maxPeriod}</strong>
        `);
}

function createScatterplot() {
    const width = 1000,
          height = 600,
          margin = { top: 10, right: 10, bottom: 30, left: 50 };

    const svg = d3.select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    // Define global scales
    xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([margin.left, width - margin.right])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, 24])
        .range([height - margin.bottom, margin.top]);

    const rScale = d3.scaleSqrt()
        .domain(d3.extent(commits, d => d.totalLines))
        .range([2, 30]);

    // Add axes
    svg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale));
    svg.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(
            d3.axisLeft(yScale)
              .tickFormat(d => String(d % 24).padStart(2, '0') + ':00')
        );

    // Add gridlines
    svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(
            d3.axisLeft(yScale)
              .tickFormat('')
              .tickSize(-width + margin.right + margin.left)
        );

    const dots = svg.append('g').attr('class', 'dots');

    dots.selectAll('circle')
        .data(d3.sort(commits, d => -d.totalLines))
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .style('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
            // Optionally add a visual cue for selected elements
            d3.select(event.currentTarget).classed('selected', true);
        })
        .on('mouseleave', function () {
            updateTooltipVisibility(false);
            d3.select(this).classed('selected', false);
        });

    // Brushing
    const brush = d3.brush()
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
        .on('start brush end', brushed);

    svg.append('g')
        .attr('class', 'brush')
        .call(brush);
}

// Update the brushed function to directly update selectedCommits
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

// Simplify isCommitSelected to check directly for inclusion in selectedCommits
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
