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
});

// Tab navigation
function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
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
        let msg = `🎉 *WINNER!* Number *${number}*\n\n`;
        msg += `Found in ${results.length} draw(s) across ${totalDrawsChecked} draws checked\n\n`;
        results.forEach(r => {
            msg += `${r.lottery.toUpperCase()} ${r.prize} on ${formatDate(r.date)}\n`;
        });
        showResult(msg, 'winner');
    } else {
        showResult(`❌ No wins for *${number}*\nChecked ${totalDrawsChecked} draw(s) across ${lotteries.join(', ')}`, 'loser');
    }
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
    
    if (!dateInput) {
        display.innerHTML = '<p class="hint">Select a date to view results</p>';
        return;
    }
    
    display.innerHTML = '<p class="hint">Loading...</p>';
    
    const data = await loadLotteryData(currentLottery);
    const draw = data.draws.find(d => d.date === dateInput);
    
    if (!draw) {
        display.innerHTML = '<p class="hint">No results for this date</p>';
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

function analyzeNumbers(type) {
    const display = document.getElementById('analysis-display');
    
    // Aggregate all numbers from all draws
    const countMap = {};
    
    ['damacai', 'toto', 'magnum'].forEach(lottery => {
        const data = lastResults[lottery];
        data.forEach(draw => {
            const prizes = draw[lottery] || draw;
            ['1st', '2nd', '3rd'].forEach(p => {
                const num = prizes[p];
                if (num) {
                    countMap[num] = (countMap[num] || 0) + 1;
                }
            });
        });
    });
    
    const entries = Object.entries(countMap).sort((a, b) => b[1] - a[1]);
    
    if (type === 'hot') {
        const hot = entries.slice(0, 20);
        display.innerHTML = `
            <h4>🔥 Hot Numbers (Most Frequent)</h4>
            <div class="hot-list">
                ${hot.map(([num, count]) => `
                    <div class="number-badge hot">
                        ${num}
                        <small style="display:block;font-size:0.7rem">${count}x</small>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (type === 'cold') {
        const cold = entries.slice(-20).reverse();
        display.innerHTML = `
            <h4>❄️ Cold Numbers (Least Frequent)</h4>
            <div class="cold-list">
                ${cold.map(([num, count]) => `
                    <div class="number-badge cold">
                        ${num}
                        <small style="display:block;font-size:0.7rem">${count}x</small>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (type === 'frequency') {
        display.innerHTML = `
            <h4>📊 Number Frequency (All Draws)</h4>
            <div style="max-height:300px;overflow-y:auto">
                ${entries.map(([num, count]) => `
                    <div class="prize-item">
                        <span class="prize-number">${num}</span>
                        <span>${count} appearances</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
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