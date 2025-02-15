import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let data = [];
let commits = [];
let brushSelection = null;
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

function displayStats() {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    let numFiles = d3.group(data, d => d.file).size;
    let maxFileLength = d3.max(data, d => d.line);
    let avgFileLength = d3.mean(d3.rollups(data, v => d3.max(v, d => d.line), d => d.file), d => d[1]);

    dl.append('dt').text('Number of Files');
    dl.append('dd').text(numFiles);

    dl.append('dt').text('Longest File (Lines)');
    dl.append('dd').text(maxFileLength);

    dl.append('dt').text('Avg File Length (Lines)');
    dl.append('dd').text(avgFileLength.toFixed(2));

    let mostActivePeriod = d3.rollups(data, v => v.length, d => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' }));
    let maxPeriod = d3.greatest(mostActivePeriod, d => d[1])?.[0];

    dl.append('dt').text('Most Active Time of Day');
    dl.append('dd').text(maxPeriod);
}

function createScatterplot() {
    const width = 1000, height = 600, margin = { top: 10, right: 10, bottom: 30, left: 50 };
    const svg = d3.select('#chart').append('svg')
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
    svg.append('g').attr('transform', `translate(0, ${height - margin.bottom})`).call(d3.axisBottom(xScale));
    svg.append('g').attr('transform', `translate(${margin.left}, 0)`).call(d3.axisLeft(yScale)
        .tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));

    // Add gridlines
    svg.append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-width + margin.right + margin.left));

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
            d3.select(event.currentTarget).style('fill-opacity', 1);
        })
        .on('mouseleave', function () {
            updateTooltipVisibility(false);
            d3.select(this).style('fill-opacity', 0.7);
        });

    // Brushing
    const brush = d3.brush()
        .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]])
        .on('start brush end', brushed);

    svg.append('g').attr('class', 'brush').call(brush);
}

function brushed(event) {
    brushSelection = event.selection;
    updateSelection();
}

function isCommitSelected(commit) {
    if (!brushSelection) return false;
    const min = { x: brushSelection[0][0], y: brushSelection[0][1] };
    const max = { x: brushSelection[1][0], y: brushSelection[1][1] };
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
}

function updateSelection() {
    d3.selectAll('circle').classed('selected', d => isCommitSelected(d));
    updateSelectionCount();
    updateLanguageBreakdown();
}

function updateSelectionCount() {
    const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
    document.getElementById('selection-count').textContent = `${selectedCommits.length || 'No'} commits selected`;
}

function updateLanguageBreakdown() {
    const selectedCommits = brushSelection ? commits.filter(isCommitSelected) : [];
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
