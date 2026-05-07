// PWA Lottery Checker App
// Uses localStorage data from damacai-checker folder

const API_BASE = 'https://api.telegram.org/bot8752373556:AAG0ucYHgQ7pchVoHuR8K9eOtxcbXqQPkos';

// State
let currentLottery = 'damacai';
let lastResults = { damacai: [], toto: [], magnum: [] };

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupLotteryTabs();
    loadLastResults();
    setupInstallPrompt();
    
    // Set default date to today for results
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('result-date').value = today;
    
    // Load results and analysis for first lottery by default
    setTimeout(() => {
        loadResults();
        showSummary();
    }, 100);
    
    // Setup button handlers
    document.querySelector('.btn-primary').addEventListener('click', checkNumber);
    document.querySelector('.btn-secondary').addEventListener('click', clearInput);
    document.querySelector('.btn-small').addEventListener('click', loadResults);
});

// Tab navigation
function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const targetTab = document.getElementById(tab.dataset.tab + '-tab');
            targetTab.classList.add('active');
            
            // Auto-load analysis when tab is opened
            if (tab.dataset.tab === 'analysis') {
                showSummary();
            }
        });
    });
}

// Lottery type tabs
function setupLotteryTabs() {
    document.querySelectorAll('.lottery-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.lottery-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentLottery = tab.dataset.lottery;
            loadResults();
        });
    });
}

// Check a number against all lotteries
async function checkNumber() {
    const input = document.getElementById('number-input');
    const number = input.value.trim();
    const drawsInput = document.getElementById('draws-input').value;
    const maxDraws = drawsInput ? parseInt(drawsInput) : Infinity; // Infinity = all draws
    
    if (!/^\d{4}$/.test(number)) {
        showResult('Please enter a valid 4-digit number', 'error');
        return;
    }
    
    // Get selected lotteries
    const lotteries = [];
    document.querySelectorAll('.lottery-select input:checked').forEach(cb => {
        lotteries.push(cb.value);
    });
    
    if (lotteries.length === 0) {
        showResult('Select at least one lottery', 'error');
        return;
    }
    
    showResult(`Checking ${number}...`, 'loading');
    
    // Load local data and check
    const results = [];
    let totalDrawsChecked = 0;
    
    for (const lottery of lotteries) {
        const data = await loadLotteryData(lottery);
        if (!data) continue;
        
        // Check draws (all or limited)
        const draws = data.draws || [];
        const drawsToCheck = draws.slice(0, maxDraws);
        totalDrawsChecked += drawsToCheck.length;
        
        for (const draw of drawsToCheck) {
            const prizes = draw[lottery] || draw;
            
            ['1st', '2nd', '3rd'].forEach(prize => {
                const winningNum = prizes[prize];
                if (winningNum && winningNum.toString().padStart(4, '0') === number) {
                    results.push({
                        lottery: lottery,
                        prize: prize,
                        date: draw.date
                    });
                }
            });
        }
    }
    
    if (results.length > 0) {
        let html = `<div class="winner-header">🎉 WINNER! Number: <strong>${number}</strong></div>`;
        html += `<p class="result-summary">Found ${results.length} win(s) across ${totalDrawsChecked} draw(s)</p>`;
        html += `<table class="results-table">`;
        html += `<tr><th>Lottery</th><th>Prize</th><th>Date</th></tr>`;
        results.forEach(r => {
            html += `<tr><td>${r.lottery.toUpperCase()}</td><td>${r.prize}</td><td>${formatDate(r.date)}</td></tr>`;
        });
        html += `</table>`;
        showResult(html, 'winner');
    } else {
        const html = `<div class="no-win">❌ No wins for <strong>${number}</strong></div>` +
            `<p class="result-summary">Checked ${totalDrawsChecked} draw(s) across ${lotteries.join(', ')}</p>`;
        showResult(html, 'loser');
    }
}

// Clear input field
function clearInput() {
    const input = document.getElementById('number-input');
    input.value = '';
    input.focus();
    document.getElementById('check-result').innerHTML = '';
}

// Show result in box
function showResult(msg, type) {
    const box = document.getElementById('check-result');
    box.innerHTML = msg;
    box.className = 'result-box';
    if (type === 'winner') box.classList.add('winner');
    else if (type === 'loser') box.classList.add('loser');
}

// Load lottery data from local JSON files
async function loadLotteryData(lottery) {
    // Map to actual file names
    const files = {
        damacai: 'damacai_full.json',
        toto: 'toto_full.json',
        magnum: 'magnum_full.json'
    };
    
    // Try to fetch from local files
    try {
        const response = await fetch(`./data/${files[lottery]}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.log('Local file not found, using mock data');
    }
    
    // Return mock data structure for demo
    return getMockData(lottery);
}

// Mock data for demo (when no local data available)
function getMockData(lottery) {
    return {
        draws: [
            { date: '2026-05-06', [lottery]: { '1st': '1234', '2nd': '5678', '3rd': '9012' } },
            { date: '2026-05-03', [lottery]: { '1st': '3456', '2nd': '7890', '3rd': '2345' } },
            { date: '2026-04-30', [lottery]: { '1st': '4567', '2nd': '8901', '3rd': '3456' } },
        ]
    };
}

// Load results for selected date
async function loadResults() {
    const dateInput = document.getElementById('result-date').value;
    const display = document.getElementById('results-display');
    
    display.innerHTML = '<p class="hint">Loading...</p>';
    
    const data = await loadLotteryData(currentLottery);
    let draw = null;
    
    if (dateInput) {
        draw = data.draws.find(d => d.date === dateInput);
    }
    
    // If no date or no results for that date, show latest
    if (!draw && data.draws && data.draws.length > 0) {
        draw = data.draws[0]; // Latest draw
        // Update date input to show the actual date
        document.getElementById('result-date').value = draw.date;
    }
    
    if (!draw) {
        display.innerHTML = '<p class="hint">No results available</p>';
        return;
    }
    
    const prizes = draw[currentLottery] || draw;
    
    display.innerHTML = `
        <h3 style="margin-bottom:15px;text-align:center">${formatDate(dateInput)}</h3>
        <div class="prize-item">
            <span class="prize-label">1st</span>
            <span class="prize-number">${prizes['1st'] || '-'}</span>
        </div>
        <div class="prize-item">
            <span class="prize-label">2nd</span>
            <span class="prize-number">${prizes['2nd'] || '-'}</span>
        </div>
        <div class="prize-item">
            <span class="prize-label">3rd</span>
            <span class="prize-number">${prizes['3rd'] || '-'}</span>
        </div>
    `;
}

// Load last results
async function loadLastResults() {
    for (const lottery of ['damacai', 'toto', 'magnum']) {
        const data = await loadLotteryData(lottery);
        if (data && data.draws) {
            lastResults[lottery] = data.draws.slice(0, 5);
        }
    }
}

// Analysis functions
function showHotNumbers() {
    analyzeNumbers('hot');
}

function showColdNumbers() {
    analyzeNumbers('cold');
}

function showFrequency() {
    analyzeNumbers('frequency');
}

function showSummary() {
    const display = document.getElementById('analysis-display');
    display.innerHTML = '<p class="hint">Loading analysis...</p>';
    
    // Load all data for all lotteries
    Promise.all([
        loadLotteryData('damacai'),
        loadLotteryData('toto'),
        loadLotteryData('magnum')
    ]).then(([damacaiData, totoData, magnumData]) => {
        const lotteries = {
            damacai: { data: damacaiData, color: '🟠', name: 'Damacai' },
            toto: { data: totoData, color: '🔴', name: 'Toto' },
            magnum: { data: magnumData, color: '🟢', name: 'Magnum' }
        };
        
        let html = '';
        
        // HOT FIRST DIGITS - Table format
        html += '<div class="analysis-section">';
        html += '<h4>🔥 HOT FIRST DIGITS</h4>';
        html += '<table class="summary-table"><tr><th>Lottery</th><th>1st</th><th>2nd</th><th>3rd</th></tr>';
        for (const [key, lot] of Object.entries(lotteries)) {
            const firstDigitCounts = {};
            lot.data.draws.forEach(draw => {
                const num = (draw[key] || draw)['1st'];
                if (num) {
                    const first = num.toString()[0];
                    firstDigitCounts[first] = (firstDigitCounts[first] || 0) + 1;
                }
            });
            const top3 = Object.entries(firstDigitCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
            html += `<tr><td>${lot.color} ${lot.name}</td>${top3.map(([d, c]) => `<td>${d} (${c})</td>`).join('')}<td></td><td></td></tr>`;
        }
        html += '</table></div>';
        
        // HOT LAST DIGITS - Table format
        html += '<div class="analysis-section">';
        html += '<h4>🔥 HOT LAST DIGITS</h4>';
        html += '<table class="summary-table"><tr><th>Lottery</th><th>1st</th><th>2nd</th><th>3rd</th></tr>';
        for (const [key, lot] of Object.entries(lotteries)) {
            const lastDigitCounts = {};
            lot.data.draws.forEach(draw => {
                const num = (draw[key] || draw)['1st'];
                if (num) {
                    const last = num.toString().slice(-1);
                    lastDigitCounts[last] = (lastDigitCounts[last] || 0) + 1;
                }
            });
            const top3 = Object.entries(lastDigitCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
            html += `<tr><td>${lot.color} ${lot.name}</td>${top3.map(([d, c]) => `<td>${d} (${c})</td>`).join('')}<td></td><td></td></tr>`;
        }
        html += '</table></div>';
        }
        html += '</div>';
        
        // ALL SAME DIGIT (1st Prize)
        html += '<div class="analysis-section">';
        html += '<h4>🔄 ALL SAME DIGIT (1st Prize)</h4>';
        for (const [key, lot] of Object.entries(lotteries)) {
            const sameDigit = [];
            lot.data.draws.forEach(draw => {
                const num = (draw[key] || draw)['1st'];
                if (num && num.toString().length === 4) {
                    const s = num.toString();
                    if (s[0] === s[1] && s[1] === s[2] && s[2] === s[3]) {
                        if (!sameDigit.includes(s)) sameDigit.push(s);
                    }
                }
            });
            html += `<p>${lot.color} ${lot.name}: ${sameDigit.length ? sameDigit.join(', ') : 'None'}</p>`;
        }
        html += '</div>';
        
        // MOST COMMON 1ST PRIZE - Table format
        html += '<div class="analysis-section">';
        html += '<h4>📈 MOST COMMON 1ST PRIZE</h4>';
        html += '<table class="summary-table"><tr><th>Lottery</th><th>#1</th><th>#2</th><th>#3</th></tr>';
        for (const [key, lot] of Object.entries(lotteries)) {
            const countMap = {};
            lot.data.draws.forEach(draw => {
                const num = (draw[key] || draw)['1st'];
                if (num) countMap[num] = (countMap[num] || 0) + 1;
            });
            const top3 = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
            html += `<tr><td>${lot.color} ${lot.name}</td>${top3.map(([n, c]) => `<td>${n} (${c}x)</td>`).join('')}<td></td><td></td></tr>`;
        }
        html += '</table></div>';
        
        // MOST COMMON 2ND PRIZE - Table format
        html += '<div class="analysis-section">';
        html += '<h4>📈 MOST COMMON 2ND PRIZE</h4>';
        html += '<table class="summary-table"><tr><th>Lottery</th><th>#1</th><th>#2</th><th>#3</th></tr>';
        for (const [key, lot] of Object.entries(lotteries)) {
            const countMap = {};
            lot.data.draws.forEach(draw => {
                const num = (draw[key] || draw)['2nd'];
                if (num) countMap[num] = (countMap[num] || 0) + 1;
            });
            const top3 = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
            html += `<tr><td>${lot.color} ${lot.name}</td>${top3.map(([n, c]) => `<td>${n} (${c}x)</td>`).join('')}<td></td><td></td></tr>`;
        }
        html += '</table></div>';
        
        // MOST COMMON 3RD PRIZE - Table format
        html += '<div class="analysis-section">';
        html += '<h4>📈 MOST COMMON 3RD PRIZE</h4>';
        html += '<table class="summary-table"><tr><th>Lottery</th><th>#1</th><th>#2</th><th>#3</th></tr>';
        for (const [key, lot] of Object.entries(lotteries)) {
            const countMap = {};
            lot.data.draws.forEach(draw => {
                const num = (draw[key] || draw)['3rd'];
                if (num) countMap[num] = (countMap[num] || 0) + 1;
            });
            const top3 = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
            html += `<tr><td>${lot.color} ${lot.name}</td>${top3.map(([n, c]) => `<td>${n} (${c}x)</td>`).join('')}<td></td><td></td></tr>`;
        }
        html += '</table></div>';
        
        // CONSECUTIVE NUMBERS (1st Prize)
        html += '<div class="analysis-section">';
        html += '<h4>🔢 CONSECUTIVE NUMBERS (1st Prize)</h4>';
        html += '<table class="summary-table"><tr><th>Lottery</th><th>Numbers</th></tr>';
        for (const [key, lot] of Object.entries(lotteries)) {
            const consecutive = [];
            lot.data.draws.forEach(draw => {
                const num = (draw[key] || draw)['1st'];
                if (num && num.toString().length === 4) {
                    const s = num.toString();
                    const d = [parseInt(s[0]), parseInt(s[1]), parseInt(s[2]), parseInt(s[3])];
                    const isConsec = (d[1] === d[0] + 1 && d[2] === d[1] + 1 && d[3] === d[2] + 1) ||
                                    (d[1] === d[0] - 1 && d[2] === d[1] - 1 && d[3] === d[2] - 1);
                    if (isConsec && !consecutive.includes(s)) consecutive.push(s);
                }
            });
            html += `<tr><td>${lot.color} ${lot.name}</td><td>${consecutive.length ? consecutive.join(', ') : 'None'}</td></tr>`;
        }
        html += '</table></div>';
        
        display.innerHTML = html;
    });
}

// Format date nicely
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-MY', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// PWA Install prompt
let deferredPrompt;

function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button or banner
        // For simplicity, just log
        console.log('PWA install available');
    });
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration failed'));
    });
}