// ------------------------------------
// CONFIG
// ------------------------------------
const imageContainer = document.querySelector('#img-container');
const COL_WIDTH = 170;
const BASE_BATCH = 24;

let allImages = [];   // all image blocks
let loadedCount = 0;  // images displayed
let reachedEnd = false;
let isLoading = false;

// ------------------------------------
// FETCH ALL BLOCKS
// ------------------------------------
async function fetchAllBlocks() {
    try {
        const response = await fetch(
            `https://api.are.na/v2/channels/sadovnjak-garden-web/contents?per=150`,
            { method: 'GET', headers: { 'Cache-Control': 'no-cache' } }
        );
        const data = await response.json();
        return data.contents || [];
    } catch (err) {
        console.error("Fetch error:", err);
        return [];
    }
}

// ------------------------------------
// SHUFFLE FUNCTION
// ------------------------------------

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ------------------------------------
// INITIALIZATION
// ------------------------------------
async function init() {
    const blocks = await fetchAllBlocks();
    if (!blocks || blocks.length === 0) return;

    // --- Footer text blocks ---
    const textBlocks = blocks.filter(b => b.class === "Text");
    if (textBlocks.length >= 2) {
        const footer = document.querySelector('#footer');

        const textA = document.createElement("div");
        const textB = document.createElement("div");
        textA.className = "footer-text footer-text-a";
        textB.className = "footer-text footer-text-b";

        textA.innerHTML = textBlocks[0].content_html || textBlocks[0].content || textBlocks[0].title;
        textB.innerHTML = textBlocks[1].content_html || textBlocks[1].content || textBlocks[1].title;

        footer.appendChild(textA);
        footer.appendChild(textB);
    }

    // --- Image blocks ---
    allImages = blocks.filter(b => b.image && b.image.display);

    // --- Shuffle images ---
    shuffleArray(allImages);

    // Load first batch
    loadNextBatch();

    window.addEventListener('resize', debounce(() => buildGrid(), 50));
    window.addEventListener('scroll', handleScroll);
}

// ------------------------------------
// LOAD NEXT BATCH (full rows only)
// ------------------------------------
async function loadNextBatch() {
    if (isLoading || reachedEnd) return;
    isLoading = true;

    const cols = calculateCols();
    const batchSize = cols * Math.ceil(BASE_BATCH / cols);

    const batch = allImages.slice(loadedCount, loadedCount + batchSize);
    if (batch.length === 0) {
        reachedEnd = true;
        isLoading = false;
        return;
    }

    await preloadImages(batch);
    appendBlocks(batch);
    loadedCount += batch.length;

    if (loadedCount >= allImages.length) reachedEnd = true;
    isLoading = false;
}

// ------------------------------------
// SCROLL HANDLER
// ------------------------------------
function handleScroll() {
    if (reachedEnd || isLoading) return;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        loadNextBatch();
    }
}

// ------------------------------------
// GRID HELPERS
// ------------------------------------
function calculateCols() {
    const containerStyles = getComputedStyle(imageContainer);
    const paddingLeft = parseFloat(containerStyles.paddingLeft);
    const paddingRight = parseFloat(containerStyles.paddingRight);
    const usableWidth = imageContainer.getBoundingClientRect().width - paddingLeft - paddingRight;

    const tempRow = document.createElement("div");
    tempRow.className = "grid-row";
    tempRow.style.visibility = "hidden";
    tempRow.style.position = "absolute";

    const tempThumb = document.createElement("div");
    tempThumb.className = "thumbnail";
    tempRow.appendChild(tempThumb);
    imageContainer.appendChild(tempRow);

    let colGap = parseFloat(getComputedStyle(tempRow).columnGap);
    tempRow.remove();

    const totalItemWidth = COL_WIDTH + colGap;
    let cols = Math.floor((usableWidth + colGap) / totalItemWidth);

    // Restrict columns for mobile
    if (window.innerWidth <= 600) {
        cols = Math.min(2, cols);       // max 2 columns
        colGap = 20;                     // reduce gap
        document.querySelectorAll('.grid-row').forEach(row => {
            row.style.gap = `${colGap}px`;
        });
    }

    return Math.max(1, cols);
}

// ------------------------------------
// APPEND BLOCKS TO GRID
// ------------------------------------
function appendBlocks(newBlocks) {
    const cols = calculateCols();
    const footer = document.querySelector('#footer-container');
    const footerHeight = footer ? footer.offsetHeight : 0;

    for (let i = 0; i < newBlocks.length; i += cols) {
        const rowStartIndex = loadedCount + i;
        const rowItems = newBlocks.slice(i, i + cols);

        const row = document.createElement('div');
        row.className = "grid-row";

        rowItems.forEach(block => {
            const thumb = document.createElement('div');
            thumb.className = "thumbnail";

            const img = document.createElement('img');
            img.loading = "lazy";
            img.src = block.image.display.url;
            thumb.appendChild(img);

            const cap = document.createElement('p');
            cap.textContent = block.title || "";
            thumb.appendChild(cap);

            row.appendChild(thumb);
        });

        imageContainer.appendChild(row);

        // Only add separator if this is NOT the last row of all images
        if (rowStartIndex + rowItems.length < allImages.length) {
            const sep = document.createElement('div');
            sep.className = "row-separator";
            imageContainer.appendChild(sep);
        }
    }

    // Adjust padding to footer height
    imageContainer.style.paddingBottom = `${footerHeight}px`;
}

// ------------------------------------
// BUILD GRID ON RESIZE
// ------------------------------------
function buildGrid() {
    imageContainer.innerHTML = "";
    const visibleImages = allImages.slice(0, loadedCount);
    appendBlocks(visibleImages);
}

// ------------------------------------
// IMAGE PRELOADING
// ------------------------------------
function preloadImages(blocks) {
    const promises = blocks.map(block => {
        return new Promise(resolve => {
            const img = new Image();
            img.src = block.image.display.url;
            img.onload = resolve;
            img.onerror = resolve;
        });
    });
    return Promise.all(promises);
}

// ------------------------------------
// DEBOUNCE
// ------------------------------------
function debounce(fn, delay) {
    let timer;
    return function () {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
    };
}

// ------------------------------------
// SEASONS AND ORCHARD ACTIVITIES
// ------------------------------------
const seasons = [
    { name: 'winter', start: '12-21', end: '03-19', color: '#3F4057' },
    { name: 'spring', start: '03-20', end: '06-20', color: '#A0A98B' },
    { name: 'summer', start: '06-21', end: '09-22', color: '#57553F' },
    { name: 'autumn', start: '09-23', end: '12-20', color: '#573F3F' }
];

const activities = [
    // { start: '12-06', end: '02-10', activity_sl: 'sadovnjak počiva', activity_en: 'the orchard is resting' },
    { start: '12-06', end: '02-10', activity_sl: 'zorijo breskve, slive, renklode, mirabele, fige vendimke, jabolka in grozdje', activity_en: 'peach, plum, damson, mirabelle, late fig, apple and grape picking season' },
    { start: '02-11', end: '02-14', activity_sl: 'zimska rez', activity_en: 'winter pruning' },
    { start: '02-15', end: '02-24', activity_sl: 'zimska rez, cepljenje novo najdenih sort', activity_en: 'winter pruning, grafting of newly found varieties' },
    { start: '02-25', end: '02-27', activity_sl: 'zimska rez, cepljenje novo najdenih sort, cvetijo mandlji', activity_en: 'winter pruning, grafting of newly found varieties, almonds are blooming' },
    { start: '02-28', end: '03-05', activity_sl: 'zimska rez, cvetijo mandlji', activity_en: 'winter pruning, almonds are blooming' },
    { start: '03-06', end: '03-18', activity_sl: 'cvetijo marelice', activity_en: 'apricots are blooming' },
    { start: '03-19', end: '04-02', activity_sl: 'cvetijo hruške, breskve, češnje', activity_en: 'pears, peaches and cherries are blooming' },
    { start: '04-03', end: '04-12', activity_sl: 'cvetijo hruške, breskve, češnje, jablane in slive', activity_en: 'pears, peaches, cherries, apples and plums are blooming' },
    { start: '04-13', end: '04-18', activity_sl: 'cvetijo jablane in slive', activity_en: 'apples and plums are blooming' },
    { start: '04-19', end: '05-12', activity_sl: 'rastejo listje in veje', activity_en: 'leaves and branches are growing' },
    { start: '05-13', end: '05-24', activity_sl: 'cvetijo oljke, zorijo češnje', activity_en: 'olive trees are blooming, cherry picking season' },
    { start: '05-25', end: '05-28', activity_sl: 'cvetijo oljke in trta, zorijo češnje', activity_en: 'olive trees and grapes are blooming, cherry picking season' },
    { start: '05-29', end: '06-05', activity_sl: 'cveti trta, zorijo češnje', activity_en: 'grapes are blooming, cherry picking season' },
    { start: '06-06', end: '06-14', activity_sl: 'zorijo češnje', activity_en: 'cherry picking season' },
    { start: '06-15', end: '06-20', activity_sl: 'zorijo češnje in breskve', activity_en: 'cherry and peach picking season' },
    { start: '06-26', end: '07-08', activity_sl: 'zorijo breskve, marelice, zgodnje hruške in fige cvetonke', activity_en: 'peach, apricot, early pear and early fig picking season' },
    { start: '07-09', end: '08-15', activity_sl: 'zorijo breskve, zgodnje hruške, slive, renklode in mirabele', activity_en: 'peach, early pear, plum, damson and mirabelle picking season' },
    { start: '08-16', end: '08-20', activity_sl: 'zorijo breskve, slive, renklode, mirabele, fige vendimke in jabolka', activity_en: 'peach, plum, damson, mirabelle, late fig and apple picking season' },
    { start: '08-21', end: '08-25', activity_sl: 'zorijo breskve, slive, renklode, mirabele, fige vendimke, jabolka in grozdje', activity_en: 'peach, plum, damson, mirabelle, late fig, apple and grape picking season' },
    { start: '08-26', end: '09-05', activity_sl: 'zorijo slive, renklode, mirabele, fige vendimke, jabolka in grozdje', activity_en: 'plum, damson, mirabelle, late fig, apple and grape picking season' },
    { start: '09-06', end: '09-10', activity_sl: 'zorijo fige vendimke, jabolka in grozdje', activity_en: 'late fig, apple and grape picking season' },
    { start: '09-11', end: '09-20', activity_sl: 'zorijo jabolka in grozdje', activity_en: 'apple and grape picking season' },
    { start: '09-21', end: '10-01', activity_sl: 'zorijo jabolka in pozne hruške', activity_en: 'apple and late pear picking season' },
    { start: '10-02', end: '11-01', activity_sl: 'zorijo jabolka in pozne hruške, listje odpada', activity_en: 'apple and late pear picking season, falling leaves' },
    { start: '11-02', end: '11-10', activity_sl: 'zorijo pozne hruške in granatna jabolka, listje odpada', activity_en: 'late pear and pomegranate picking season, falling leaves' },
    { start: '11-11', end: '11-15', activity_sl: 'zorijo pozne hruške, listje odpada', activity_en: 'late pear picking season, falling leaves' },
    { start: '11-16', end: '12-05', activity_sl: 'listje odpada', activity_en: 'falling leaves' },
];

function padZero(n) { return n < 10 ? '0' + n : n; }
function parseMonthDay(mmdd) {
    const year = new Date().getFullYear();
    const [month, day] = mmdd.split('-').map(Number);
    return new Date(year, month - 1, day);
}
function isTodayInRange(start, end) {
    const today = new Date();
    const s = parseMonthDay(start);
    const e = parseMonthDay(end);
    if (e < s) return today >= s || today <= e; // winter across years
    return today >= s && today <= e;
}
function getCurrentSeason() {
    for (const s of seasons) if (isTodayInRange(s.start, s.end)) return s;
    return seasons[0];
}
function getCurrentActivity() {
    for (const act of activities) if (isTodayInRange(act.start, act.end)) return act;
    return { activity_sl: '', activity_en: '' };
}

// ------------------------------------
// UPDATE DATE, SEASON BG, AND ACTIVITY
// ------------------------------------
function updateDateAndActivity() {
    const today = new Date();
    const dateStr = padZero(today.getDate()) + '.' + padZero(today.getMonth() + 1) + '.' + today.getFullYear();

    // Set date
    const dateEl = document.querySelector('.date p');
    if (dateEl) dateEl.textContent = dateStr;

    // Set season background
    const season = getCurrentSeason();
    document.body.style.backgroundColor = season.color;
    const footerContainer = document.getElementById("footer-container");
    if (footerContainer) footerContainer.style.backgroundColor = season.color;

    // Set activity
    const activity = getCurrentActivity();
    const actSl = document.querySelector('.activity-sl p');
    const actEn = document.querySelector('.activity-en p');
    if (actSl) actSl.textContent = activity.activity_sl;
    if (actEn) actEn.textContent = activity.activity_en;
}

// Call immediately
updateDateAndActivity();

// Adjust image container padding for footer
function updateImageContainerPadding() {
    const footer = document.querySelector('#footer-container');
    if (footer && imageContainer) {
        imageContainer.style.paddingBottom = `${footer.offsetHeight}px`;
    }
}
updateImageContainerPadding();
window.addEventListener('resize', updateImageContainerPadding);

// ------------------------------------
// START APP
// ------------------------------------
init();


// --- Collapsible footer toggle ---
const footer = document.getElementById('footer');
const footerToggle = document.getElementById('footer-toggle');

footerToggle.addEventListener('click', () => {
    if (footer.classList.contains('open')) {
        // collapse
        footer.classList.remove('open');
        footerToggle.textContent = '+';
    } else {
        // expand
        footer.classList.add('open');
        footerToggle.textContent = '−';
    }

    // Adjust image container padding to account for footer height change
    updateImageContainerPadding();
});