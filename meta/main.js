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

    // Basic statistics
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    // Advanced statistics
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

document.addEventListener('DOMContentLoaded', loadData);
