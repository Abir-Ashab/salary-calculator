import { CONSTANTS } from "./constants.js";

// Application State
class TimeTrackerApp {
    constructor() {
        this.timeEntries = this.loadFromStorage('timeEntries', []);
        this.hourlyRate = this.loadFromStorage('hourlyRate', 300);
        this.currentFilter = 'all';
        this.theme = this.loadFromStorage('theme', 'light');

        this.init();
    }

    // Initialize the application
    init() {
        this.showLoading();
        this.setupEventListeners();
        this.applyTheme();
        this.updateUI();
        this.populateMonthFilter();

        // Hide loading screen after initialization
        setTimeout(() => {
            this.hideLoading();
        }, 2000);
    }

    // Loading Screen Management
    showLoading() {
        document.getElementById('loadingScreen').style.display = 'flex';
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        const appContainer = document.getElementById('appContainer');

        loadingScreen.classList.add('hidden');
        appContainer.classList.add('loaded');

        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }

    // Local Storage Management
    loadFromStorage(key, defaultValue) {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (error) {
            console.warn(`Failed to load ${key} from storage:`, error);
            return defaultValue;
        }
    }

    saveToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`Failed to save ${key} to storage:`, error);
            this.showToast('Storage error. Data may not persist.', 'error');
        }
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Export functionality
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Form submissions
        document.getElementById('timeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTimeEntry();
            }
        });

        // Date input default
        this.setDefaultDate();

        // Auto-save hourly rate on blur
        document.getElementById('hourlyRate').addEventListener('blur', () => {
            this.updateHourlyRate();
        });
    }

    // Theme Management
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.saveToStorage('theme', this.theme);
        this.showToast(`Switched to ${this.theme} theme`, 'success');
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = this.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // Date Management
    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dateInput').value = today;
    }

    /**
     * Time Parsing - Improved with better pattern matching and validation
     * 
     * Supported formats:
     * - Hour and minute: "8h30m" or "8h 30m" (with or without single space)
     * - Hours only: "8h"
     * - Minutes only: "30m"
     * - Colon format: "8:30"
     * - Decimal hours: "8.5" (converts to 8h 30m)
     * 
     * Validation rules:
     * - Hours: 0-24 (24 hours only allowed with 0 minutes)
     * - Minutes: 0-59
     * - Total time must be greater than zero
     * - All values must be numeric
     */
    parseTimeString(timeStr) {
        // Normalize input: trim and convert to lowercase
        const normalized = timeStr.trim().toLowerCase();

        // Validate input is not empty
        if (!normalized) {
            return { hours: 0, minutes: 0, valid: false };
        }

        // Pattern: 8h30m or 8h 30m (optional single space)
        let match = normalized.match(/^(\d+)h\s?(\d+)m$/);
        if (match) {
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            return this.validateTimeValues(hours, minutes);
        }

        // Pattern: 8h
        match = normalized.match(/^(\d+)h$/);
        if (match) {
            const hours = parseInt(match[1]);
            return this.validateTimeValues(hours, 0);
        }

        // Pattern: 30m
        match = normalized.match(/^(\d+)m$/);
        if (match) {
            const minutes = parseInt(match[1]);
            return this.validateTimeValues(0, minutes);
        }

        // Pattern: 8:30
        match = normalized.match(/^(\d+):(\d+)$/);
        if (match) {
            const hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            return this.validateTimeValues(hours, minutes);
        }

        // Pattern: 8.5 (decimal hours)
        match = normalized.match(/^(\d+)\.(\d+)$/);
        if (match) {
            const hours = parseInt(match[1]);
            const decimalPart = parseInt(match[2]);
            const minutes = Math.round((decimalPart / Math.pow(10, match[2].length)) * 60);
            return this.validateTimeValues(hours, minutes);
        }

        return { hours: 0, minutes: 0, valid: false };
    }

    // Validate time values are within reasonable bounds
    validateTimeValues(hours, minutes) {
        // Check reasonable bounds (0-24 hours, 0-59 minutes)
        if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) {
            return { hours: 0, minutes: 0, valid: false };
        }

        // Check if 24 hours is combined with any minutes (invalid)
        if (hours === 24 && minutes > 0) {
            return { hours: 0, minutes: 0, valid: false };
        }

        // Check if total time is not zero
        if (hours === 0 && minutes === 0) {
            return { hours: 0, minutes: 0, valid: false };
        }

        return { hours, minutes, valid: true };
    }

    // Time Formatting
    formatTime(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    // Date Formatting
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    // Add Time Entry
    addTimeEntry() {
        const timeInput = document.getElementById('timeInput');
        const dateInput = document.getElementById('dateInput');
        const timeStr = timeInput.value.trim();
        const dateStr = dateInput.value;

        // Validation
        if (!this.validateEntry(timeStr, dateStr, timeInput, dateInput)) {
            return;
        }

        const parsed = this.parseTimeString(timeStr);

        if (!parsed.valid) {
            this.showValidationError(timeInput, 'Invalid time format. Try: 8h30m, 8h 30m, 8h, 30m, 8:30, 8.5');
            return;
        }

        // Create entry
        const entry = {
            id: Date.now(),
            date: dateStr,
            original: timeStr,
            hours: parsed.hours,
            minutes: parsed.minutes,
            timestamp: new Date().toISOString()
        };

        this.timeEntries.unshift(entry); // Add to beginning for recent-first order
        this.saveToStorage('timeEntries', this.timeEntries);

        // Update UI
        timeInput.value = '';
        this.updateUI();
        this.populateMonthFilter();

        this.showToast(`Added ${this.formatTime(parsed.hours * 60 + parsed.minutes)} for ${this.formatDate(dateStr)}`, 'success');

        // Animate the add button
        this.animateButton(document.querySelector('.btn-add'));
    }

    // Validation
    validateEntry(timeStr, dateStr, timeInput, dateInput) {
        let isValid = true;

        if (!timeStr) {
            this.showValidationError(timeInput, 'Time entry is required');
            isValid = false;
        }

        if (!dateStr) {
            this.showValidationError(dateInput, 'Date is required');
            isValid = false;
        }

        return isValid;
    }

    showValidationError(input, message) {
        input.classList.add('shake');
        input.style.borderColor = 'var(--danger-color)';

        setTimeout(() => {
            input.classList.remove('shake');
            input.style.borderColor = '';
        }, 300);

        this.showToast(message, 'error');
    }

    // Remove Time Entry
    removeTimeEntry(id) {
        const entry = this.timeEntries.find(e => e.id === id);
        if (!entry) return;

        if (confirm(`Delete ${entry.original} from ${this.formatDate(entry.date)}?`)) {
            this.timeEntries = this.timeEntries.filter(e => e.id !== id);
            this.saveToStorage('timeEntries', this.timeEntries);
            this.updateUI();
            this.populateMonthFilter();
            this.showToast('Entry deleted', 'success');
        }
    }

    // Update Hourly Rate
    updateHourlyRate() {
        const newRate = parseFloat(document.getElementById('hourlyRate').value);

        if (isNaN(newRate) || newRate <= 0) {
            this.showToast('Please enter a valid hourly rate', 'error');
            document.getElementById('hourlyRate').value = this.hourlyRate;
            return;
        }

        if (newRate !== this.hourlyRate) {
            this.hourlyRate = newRate;
            this.saveToStorage('hourlyRate', this.hourlyRate);
            this.updateUI();
            this.showToast(`Hourly rate updated to ${newRate}`, 'success');
        }
    }

    // Clear All Entries
    clearAllEntries() {
        if (this.timeEntries.length === 0) {
            this.showToast('No entries to clear', 'warning');
            return;
        }

        const confirmMessage = `Are you sure you want to delete all ${this.timeEntries.length} entries? This cannot be undone.`;

        if (confirm(confirmMessage)) {
            this.timeEntries = [];
            this.saveToStorage('timeEntries', this.timeEntries);
            this.updateUI();
            this.populateMonthFilter();
            this.showToast('All entries cleared', 'success');
        }
    }

    // Quick Add Functions
    quickAdd(type) {
        const dateInput = document.getElementById('dateInput');
        const today = new Date().toISOString().split('T')[0];

        if (type === '15m') {
            dateInput.value = today;
            document.getElementById('timeInput').value = '15m';
        } else if (type === '30m') {
            dateInput.value = today;
            document.getElementById('timeInput').value = '30m';
        } else if (type === '1h') {
            dateInput.value = today;
            document.getElementById('timeInput').value = '1h';
        }

        this.addTimeEntry();
    }

    // Filter Entries
    filterEntries() {
        const filterValue = document.getElementById('filterMonth').value;
        this.currentFilter = filterValue;
        this.renderTimeEntries();
    }

    getFilteredEntries() {
        if (this.currentFilter === 'all') {
            return this.timeEntries;
        }

        return this.timeEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            const entryMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
            return entryMonth === this.currentFilter;
        });
    }

    // Populate Month Filter
    populateMonthFilter() {
        const filterSelect = document.getElementById('filterMonth');
        const months = new Set();

        this.timeEntries.forEach(entry => {
            const date = new Date(entry.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.add(monthKey);
        });

        const sortedMonths = Array.from(months).sort().reverse();

        // Clear existing options (except "All Time")
        while (filterSelect.children.length > 1) {
            filterSelect.removeChild(filterSelect.lastChild);
        }

        sortedMonths.forEach(monthKey => {
            const date = new Date(monthKey + '-01');
            const monthName = date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long'
            });

            const option = document.createElement('option');
            option.value = monthKey;
            option.textContent = monthName;
            filterSelect.appendChild(option);
        });
    }

    // UI Update Functions
    updateUI() {
        this.updateDashboardStats();
        this.renderTimeEntries();
        this.renderMonthlyBreakdown();
        document.getElementById('displayRate').textContent = `${this.hourlyRate}`;
    }

    updateDashboardStats() {
        const today = new Date().toISOString().split('T')[0];
        const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

        // Today's hours
        const todayEntries = this.timeEntries.filter(entry => entry.date === today);
        const todayMinutes = this.calculateTotalMinutes(todayEntries);
        document.getElementById('todayHours').textContent = this.formatTime(todayMinutes);

        // This month's data
        const monthEntries = this.timeEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            const entryMonth = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
            return entryMonth === currentMonth;
        });

        const monthMinutes = this.calculateTotalMinutes(monthEntries);
        const monthEarnings = Math.round((monthMinutes / 60) * this.hourlyRate);

        document.getElementById('thisMonthHours').textContent = this.formatTime(monthMinutes);
        document.getElementById('monthlyEarnings').textContent = `${monthEarnings.toLocaleString()}`;
    }

    calculateTotalMinutes(entries) {
        return entries.reduce((total, entry) => {
            return total + (entry.hours * 60) + entry.minutes;
        }, 0);
    }

    // Render Time Entries
    renderTimeEntries() {
        const container = document.getElementById('timeEntries');
        const filteredEntries = this.getFilteredEntries();

        if (filteredEntries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <h3>No time entries found</h3>
                    <p>${this.currentFilter === "all"
                    ? "Add your first entry above to start tracking!"
                    : "No entries for the selected month."
                }</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredEntries.map(entry => {
            const totalMinutes = entry.hours * 60 + entry.minutes;
            const earnings = Math.round((totalMinutes / 60) * this.hourlyRate);

            return `
                <div class="time-entry">
                    <div class="entry-info">
                        <div class="entry-date">${this.formatDate(
                entry.date
            )}</div>
                        <div class="entry-time">${entry.original
                } → ${this.formatTime(totalMinutes)} → ${earnings}</div>
                    </div>
                    <div class="entry-actions">
                        <button class="delete-btn" onclick="app.removeTimeEntry(${entry.id
                })" title="Delete entry">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        })
            .join("");
    }

    // Render Monthly Breakdown
    renderMonthlyBreakdown() {
        const container = document.getElementById('monthlyData');
        const section = document.getElementById('monthlySection');

        if (this.timeEntries.length === 0) {
            section.style.display = 'none';
            return;
        }

        const monthlyData = this.groupEntriesByMonth();
        const sortedMonths = Object.keys(monthlyData).sort().reverse();

        section.style.display = 'block';
        container.innerHTML = sortedMonths.map(monthKey => {
            const data = monthlyData[monthKey];
            return this.createMonthCard(data);
        }).join('');
    }

    groupEntriesByMonth() {
        const monthlyData = {};

        this.timeEntries.forEach(entry => {
            const date = new Date(entry.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    name: monthName,
                    totalMinutes: 0,
                    entryCount: 0,
                    entries: [],
                    workDays: new Set()
                };
            }

            const totalMinutes = (entry.hours * 60) + entry.minutes;
            monthlyData[monthKey].totalMinutes += totalMinutes;
            monthlyData[monthKey].entryCount += 1;
            monthlyData[monthKey].entries.push(entry);
            monthlyData[monthKey].workDays.add(entry.date);
        });

        return monthlyData;
    }

    createMonthCard(data) {
        const totalSalary = Math.round((data.totalMinutes / 60) * this.hourlyRate);
        const uniqueWorkDays = data.workDays.size;
        const avgHoursPerDay = uniqueWorkDays > 0 ? (data.totalMinutes / uniqueWorkDays / 60) : 0;
        const avgSalaryPerDay = uniqueWorkDays > 0 ? (totalSalary / uniqueWorkDays) : 0;

        return `
            <div class="month-card">
                <div class="month-header">
                    <div class="month-title">${data.name}</div>
                    <div class="month-salary">${totalSalary.toLocaleString()}</div>
                </div>
                <div class="month-stats">
                    <div class="stat-item">
                        <span class="stat-value">${this.formatTime(
            data.totalMinutes
        )}</span>
                        <span>Total Hours</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${uniqueWorkDays}</span>
                        <span>Work Days</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${avgHoursPerDay.toFixed(
            1
        )}h</span>
                        <span>Avg/Day</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${Math.round(
            avgSalaryPerDay
        ).toLocaleString()}</span>
                        <span>Avg Salary/Day</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Export Data
    exportData() {
        if (this.timeEntries.length === 0) {
            this.showToast('No data to export', 'warning');
            return;
        }

        const exportData = {
            entries: this.timeEntries,
            hourlyRate: this.hourlyRate,
            exportDate: new Date().toISOString(),
            totalEntries: this.timeEntries.length,
            summary: this.generateExportSummary()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `timetracker-export-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        this.showToast('Data exported successfully', 'success');
    }

    generateExportSummary() {
        const totalMinutes = this.calculateTotalMinutes(this.timeEntries);
        const totalEarnings = Math.round((totalMinutes / 60) * this.hourlyRate);
        const uniqueDays = new Set(this.timeEntries.map(e => e.date)).size;

        return {
            totalHours: this.formatTime(totalMinutes),
            totalEarnings: totalEarnings,
            workDays: uniqueDays,
            avgHoursPerDay: uniqueDays > 0 ? (totalMinutes / uniqueDays / 60).toFixed(1) : 0
        };
    }

    // Toast Notifications
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        toast.innerHTML = `
            <i class="toast-icon ${icons[type]}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.getElementById('toastContainer').appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    // Utility Functions
    animateButton(button) {
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
    }

    // Monthly View Toggle (placeholder for future enhancement)
    toggleMonthlyView() {
        this.showToast('View toggle coming soon!', 'warning');
    }
}

// Global app instance
let app;

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    app = new TimeTrackerApp();
});

// Global functions for HTML onclick handlers
window.quickAdd = (type) => app.quickAdd(type);
window.nextDate = () => app.nextDate();
window.addTimeEntry = () => app.addTimeEntry();
window.updateHourlyRate = () => app.updateHourlyRate();
window.clearAllEntries = () => app.clearAllEntries();
window.filterEntries = () => app.filterEntries();
window.toggleMonthlyView = () => app.toggleMonthlyView();
