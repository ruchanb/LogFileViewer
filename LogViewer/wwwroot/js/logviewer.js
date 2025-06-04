// LogViewer JavaScript functionality

// Store current filter state
let currentFolder = '';
let currentFile = '';
let currentSortField = "timestamp";
let currentSortDirection = "descending";
let isLoading = false;
let allLogRows = []; // Store all log rows for client-side filtering
let isServerSideFiltering = true; // Default to server-side filtering

function resetFilters() {
    // Clear text inputs
    document.getElementById('search-text').value = '';
    if (document.getElementById('exclusion-text')) {
        document.getElementById('exclusion-text').value = '';
    }
    document.getElementById('start-date').value = '';
    document.getElementById('start-time').value = '';
    document.getElementById('end-date').value = '';
    document.getElementById('end-time').value = '';
    
    // Reset sort direction to default
    document.querySelector('input[name="SortDirection"][value="Descending"]').checked = true;
    
    // Uncheck all level checkboxes
    document.querySelectorAll('input[name="Levels"]').forEach(cb => {
        cb.checked = false;
    });
    
    document.querySelectorAll('input[name="ExcludedLevels"]').forEach(cb => {
        cb.checked = false;
    });
    
    // Reset table sorting
    currentSortField = 'timestamp';
    currentSortDirection = 'descending';
    
    // Clear localStorage
    localStorage.removeItem('logViewerFilters');
    
    // Apply the reset filters
    applyFilters();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Get current folder and file from hidden inputs
    const folderInput = document.getElementById('folder');
    const fileInput = document.getElementById('file');
    
    if (folderInput && fileInput) {
        currentFolder = folderInput.value;
        currentFile = fileInput.value;
    }
    
    // Load saved filters from localStorage
    loadSavedFilters();
    
    // Set up filtering mode toggle
    const serverSideToggle = document.getElementById('server-side-filtering');
    if (serverSideToggle) {
        serverSideToggle.addEventListener('change', function() {
            isServerSideFiltering = this.checked;
            updateFilteringModeUI();
            
            // If switching to client-side and we have data, load all logs first
            if (!isServerSideFiltering && currentFolder && currentFile) {
                loadAllLogsForClientSideFiltering();
            } else if (isServerSideFiltering) {
                // If switching back to server-side, apply current filters
                applyFilters();
            }
            
            saveFilters();
        });
        
        updateFilteringModeUI();
    }
    
    // Set up event listeners for instant filtering
    document.querySelectorAll('.filter-input').forEach(input => {
        // Skip search text input - it will be handled separately
        if (input.id === 'search-text') {
            return;
        }
        
        input.addEventListener('change', function() {
            applyFilters();
            saveFilters();
        });
    });
    
    // Set up search text with Enter key only
    const searchInput = document.getElementById('search-text');
    if (searchInput) {
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                applyFilters();
                saveFilters();
            }
        });
    }
    
    // Show active sort indicator
    updateSortIndicators();
    
    // Always load logs when folder and file are available since server doesn't load them anymore
    if (currentFolder && currentFile) {
        applyFilters();
    }
});

function saveFilters() {
    const filters = {
        searchText: document.getElementById('search-text').value,
        exclusionText: document.getElementById('exclusion-text')?.value || '',
        startDate: document.getElementById('start-date').value,
        startTime: document.getElementById('start-time').value,
        endDate: document.getElementById('end-date').value,
        endTime: document.getElementById('end-time').value,
        sortDirection: document.querySelector('input[name="SortDirection"]:checked')?.value || 'Descending',
        levels: Array.from(document.querySelectorAll('input[name="Levels"]:checked')).map(cb => cb.value),
        excludedLevels: Array.from(document.querySelectorAll('input[name="ExcludedLevels"]:checked')).map(cb => cb.value),
        currentSortField: currentSortField,
        currentSortDirection: currentSortDirection,
        isServerSideFiltering: isServerSideFiltering
    };
    
    localStorage.setItem('logViewerFilters', JSON.stringify(filters));
}

function loadSavedFilters() {
    const savedFilters = localStorage.getItem('logViewerFilters');
    if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        
        // Restore text inputs
        document.getElementById('search-text').value = filters.searchText || '';
        if (document.getElementById('exclusion-text')) {
            document.getElementById('exclusion-text').value = filters.exclusionText || '';
        }
        document.getElementById('start-date').value = filters.startDate || '';
        document.getElementById('start-time').value = filters.startTime || '';
        document.getElementById('end-date').value = filters.endDate || '';
        document.getElementById('end-time').value = filters.endTime || '';
        
        // Restore sort direction
        const sortRadio = document.querySelector(`input[name="SortDirection"][value="${filters.sortDirection}"]`);
        if (sortRadio) sortRadio.checked = true;
        
        // Restore level checkboxes
        document.querySelectorAll('input[name="Levels"]').forEach(cb => {
            cb.checked = filters.levels?.includes(cb.value) || false;
        });
        
        document.querySelectorAll('input[name="ExcludedLevels"]').forEach(cb => {
            cb.checked = filters.excludedLevels?.includes(cb.value) || false;
        });
        
        // Restore table sorting
        currentSortField = filters.currentSortField || 'timestamp';
        currentSortDirection = filters.currentSortDirection || 'descending';
        
        // Restore filtering mode
        if (filters.hasOwnProperty('isServerSideFiltering')) {
            isServerSideFiltering = filters.isServerSideFiltering;
            const serverSideToggle = document.getElementById('server-side-filtering');
            if (serverSideToggle) {
                serverSideToggle.checked = isServerSideFiltering;
                updateFilteringModeUI();
            }
        }
        
        // Don't automatically apply filters here - let the initialization logic handle it
        // to avoid duplicate loading
    }
}

function updateSortIndicators() {
    // Hide all indicators
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.style.display = 'none';
    });
    
    // Show current indicator
    const activeIndicator = document.querySelector(`.sort-indicator[data-field="${currentSortField}"]`);
    if (activeIndicator) {
        activeIndicator.style.display = 'inline';
        activeIndicator.textContent = currentSortDirection === 'ascending' ? '▲' : '▼';
    }
}

function sortTable(field, event) {
    if (event) {
        event.preventDefault();
    }
    
    // Toggle direction if same field
    if (field === currentSortField) {
        currentSortDirection = currentSortDirection === 'ascending' ? 'descending' : 'ascending';
    } else {
        currentSortField = field;
        currentSortDirection = 'descending'; // Default to descending for new field
    }
    
    // Update indicators
    updateSortIndicators();
    
    // Apply the sort
    applyFilters();
    saveFilters();
}

function applyFilters(event) {
    if (event) {
        event.preventDefault();
    }
    
    if (isLoading || !currentFolder || !currentFile) {
        return false;
    }
    
    if (isServerSideFiltering) {
        return applyServerSideFilters();
    } else {
        return applyClientSideFilters();
    }
}

function applyServerSideFilters() {
    isLoading = true;
    showLoadingIndicator();
    
    // Collect filter values
    const filterOptions = {
        searchText: document.getElementById('search-text').value,
        exclusionText: document.getElementById('exclusion-text')?.value || '',
        startDate: document.getElementById('start-date').value,
        startTime: document.getElementById('start-time').value,
        endDate: document.getElementById('end-date').value,
        endTime: document.getElementById('end-time').value,
        sortDirection: document.querySelector('input[name="SortDirection"]:checked')?.value || 'Descending',
        levels: Array.from(document.querySelectorAll('input[name="Levels"]:checked')).map(cb => cb.value),
        excludedLevels: Array.from(document.querySelectorAll('input[name="ExcludedLevels"]:checked')).map(cb => cb.value),
        sortField: mapSortFieldToEnum(currentSortField),
        tableSortDirection: mapSortDirectionToEnum(currentSortDirection)
    };
    
    const requestData = {
        folder: currentFolder,
        file: currentFile,
        filterOptions: filterOptions
    };
    
    // Make AJAX call to server
    fetch('/Home/FilterLogs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]')?.value || ''
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateTable(data.logs);
            updateCounts(data.displayedCount, data.totalCount);
        } else {
            console.error('Server error:', data.message);
            showError('Failed to filter logs: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Network error:', error);
        showError('Network error occurred while filtering logs');
    })
    .finally(() => {
        isLoading = false;
        hideLoadingIndicator();
    });
    
    return false;
}

function mapSortFieldToEnum(field) {
    switch (field) {
        case 'timestamp': return 0; // SortField.Timestamp
        case 'level': return 1; // SortField.Level
        case 'message': return 2; // SortField.Message
        default: return 0;
    }
}

function mapSortDirectionToEnum(direction) {
    return direction === 'ascending' ? 0 : 1; // SortDirection.Ascending : SortDirection.Descending
}

function updateTable(logs) {
    const tableBody = document.querySelector('#logs-table tbody');
    
    // Clear current rows
    tableBody.innerHTML = '';
    
    // Add filtered rows
    logs.forEach((log, index) => {
        const row = document.createElement('tr');
        row.className = getLogRowClass(log.level);
        row.setAttribute('data-level', log.level);
        row.setAttribute('data-message', log.message);
        row.setAttribute('data-date', log.date);
        row.setAttribute('data-time', log.time);
        row.setAttribute('data-position', log.position);
        
        // Create the message cell with collapsible functionality
        const messageCell = createCollapsibleMessageCell(log.message, index);
        
        row.innerHTML = `
            <td class="text-nowrap">${log.timestamp}</td>
            <td class="text-nowrap">${log.level}</td>
        `;
        
        // Append the message cell
        row.appendChild(messageCell);
        tableBody.appendChild(row);
    });
    
    // Show 'no records' message if needed
    if (logs.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 3;
        emptyCell.textContent = 'No matching logs found';
        emptyCell.className = 'text-center p-3';
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
    }
}

function createCollapsibleMessageCell(message, index) {
    const td = document.createElement('td');
    
    // Check if message has multiple lines (more than 2)
    const lines = message.split('\n');
    const hasMultipleLines = lines.length > 2;
    
    if (!hasMultipleLines) {
        // Simple case: just show the message as-is
        td.innerHTML = escapeHtml(message);
        return td;
    }
    
    // Complex case: create collapsible container
    const container = document.createElement('div');
    container.className = 'log-message-container';
    
    const content = document.createElement('div');
    content.className = 'log-message-content collapsed';
    content.id = `log-content-${index}`;
    content.innerHTML = escapeHtml(message);
    
    const expandButton = document.createElement('button');
    expandButton.className = 'log-expand-button';
    expandButton.textContent = 'Show more...';
    expandButton.setAttribute('aria-expanded', 'false');
    expandButton.setAttribute('aria-controls', `log-content-${index}`);
    
    // Add click handler for expand/collapse
    expandButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
            // Collapse
            content.classList.remove('expanded');
            content.classList.add('collapsed');
            expandButton.textContent = 'Show more...';
            expandButton.setAttribute('aria-expanded', 'false');
        } else {
            // Expand
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            expandButton.textContent = 'Show less';
            expandButton.setAttribute('aria-expanded', 'true');
        }
    });
    
    container.appendChild(content);
    container.appendChild(expandButton);
    td.appendChild(container);
    
    return td;
}

function getLogRowClass(level) {
    switch (level) {
        case 'ERR':
        case 'FATAL':
            return 'table-danger';
        case 'WRN':
            return 'table-warning';
        case 'INF':
            return 'text-info';
        case 'DEBUG':
            return 'text-light';
        case 'TRACE':
            return 'text-secondary';
        default:
            return 'text-light';
    }
}

function updateCounts(displayedCount, totalCount) {
    const displayedElement = document.getElementById('displayed-count');
    const totalElement = document.getElementById('total-count');
    
    if (displayedElement) displayedElement.textContent = displayedCount;
    if (totalElement) totalElement.textContent = totalCount;
}

function showLoadingIndicator() {
    const tableBody = document.querySelector('#logs-table tbody');
    tableBody.innerHTML = '<tr><td colspan="3" class="text-center p-3"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
}

function hideLoadingIndicator() {
    // Loading indicator will be replaced by actual content in updateTable
}

function showError(message) {
    const tableBody = document.querySelector('#logs-table tbody');
    tableBody.innerHTML = `<tr><td colspan="3" class="text-center p-3 text-danger">${escapeHtml(message)}</td></tr>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Function to set the initial sort direction from server model
function setInitialSortDirection(direction) {
    currentSortDirection = direction.toLowerCase();
}

// Function to set current folder and file (called from the view)
function setCurrentFolderAndFile(folder, file) {
    currentFolder = folder;
    currentFile = file;
}

function updateFilteringModeUI() {
    const label = document.getElementById('filtering-mode-label');
    const description = document.getElementById('filtering-mode-description');
    
    if (isServerSideFiltering) {
        label.textContent = 'Server-side Filtering';
        description.textContent = 'Filters are applied on the server (recommended for large files)';
    } else {
        label.textContent = 'Client-side Filtering';
        description.textContent = 'Filters are applied in the browser (faster for small files)';
    }
}

function loadAllLogsForClientSideFiltering() {
    if (isLoading || !currentFolder || !currentFile) {
        return;
    }
    
    isLoading = true;
    showLoadingIndicator();
    
    // Request all logs without any filters for client-side filtering
    const requestData = {
        folder: currentFolder,
        file: currentFile,
        filterOptions: {
            // Send minimal filter options to get all logs
            searchText: '',
            exclusionText: '',
            startDate: '',
            startTime: '',
            endDate: '',
            endTime: '',
            sortDirection: 'Descending',
            levels: [],
            excludedLevels: [],
            sortField: 0, // Timestamp
            tableSortDirection: 1 // Descending
        }
    };
    
    fetch('/Home/FilterLogs', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]')?.value || ''
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Store all logs for client-side filtering
            allLogRows = data.logs.map(log => ({
                timestamp: log.timestamp,
                level: log.level,
                message: log.message,
                date: log.date,
                time: log.time,
                position: log.position,
                fullText: `${log.timestamp} ${log.level} ${log.message}`.toLowerCase()
            }));
            
            // Apply current filters on client-side
            applyClientSideFilters();
        } else {
            console.error('Server error:', data.message);
            showError('Failed to load logs: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Network error:', error);
        showError('Network error occurred while loading logs');
    })
    .finally(() => {
        isLoading = false;
        hideLoadingIndicator();
    });
}

function applyClientSideFilters() {
    // If we don't have all logs loaded, load them first
    if (allLogRows.length === 0) {
        loadAllLogsForClientSideFiltering();
        return false;
    }
    
    // Get filter values
    const levels = Array.from(document.querySelectorAll('input[name="Levels"]:checked')).map(cb => cb.value);
    const excludedLevels = Array.from(document.querySelectorAll('input[name="ExcludedLevels"]:checked')).map(cb => cb.value);
    const searchText = document.getElementById('search-text').value.toLowerCase();
    const exclusionText = document.getElementById('exclusion-text')?.value.toLowerCase() || '';
    const startDate = document.getElementById('start-date').value;
    const startTime = document.getElementById('start-time').value;
    const endDate = document.getElementById('end-date').value;
    const endTime = document.getElementById('end-time').value;
    
    // Create date objects for comparison
    let startDateTime = null;
    let endDateTime = null;
    
    if (startDate) {
        startDateTime = new Date(startDate);
        if (startTime) {
            const [hours, minutes] = startTime.split(':');
            startDateTime.setHours(parseInt(hours || 0), parseInt(minutes || 0), 0);
        } else {
            startDateTime.setHours(0, 0, 0);
        }
    }
    
    if (endDate) {
        endDateTime = new Date(endDate);
        if (endTime) {
            const [hours, minutes] = endTime.split(':');
            endDateTime.setHours(parseInt(hours || 0), parseInt(minutes || 0), 59);
        } else {
            endDateTime.setHours(23, 59, 59);
        }
    }
    
    // Parse search terms
    const searchTerms = parseSearchTerms(searchText);
    const exclusionTerms = parseSearchTerms(exclusionText);
    
    // Filter logs
    let filteredLogs = allLogRows.filter(log => {
        // Level filter
        if (levels.length > 0 && !levels.includes(log.level)) {
            return false;
        }
        
        // Exclusion level filter
        if (excludedLevels.length > 0 && excludedLevels.includes(log.level)) {
            return false;
        }
        
        // Date/time filter
        if (startDateTime || endDateTime) {
            const logDateTime = new Date(`${log.date}T${log.time}`);
            
            if (startDateTime && logDateTime < startDateTime) {
                return false;
            }
            
            if (endDateTime && logDateTime > endDateTime) {
                return false;
            }
        }
        
        // Text search
        if (searchText) {
            // Check negative terms first (exclude)
            if (searchTerms.negative.some(term => log.fullText.includes(term))) {
                return false;
            }
            
            // Check quoted phrases (all must match)
            if (searchTerms.quoted.length > 0 && 
                !searchTerms.quoted.every(term => log.fullText.includes(term))) {
                return false;
            }
            
            // Check positive terms (at least one must match if any exist)
            if (searchTerms.positive.length > 0 && 
                !searchTerms.positive.some(term => log.fullText.includes(term))) {
                return false;
            }
        }
        
        // Exclusion text filter
        if (exclusionText) {
            // Check if any exclusion terms match
            if (exclusionTerms.positive.some(term => log.fullText.includes(term))) {
                return false;
            }
            
            if (exclusionTerms.quoted.some(term => log.fullText.includes(term))) {
                return false;
            }
        }
        
        return true;
    });
    
    // Apply sorting
    filteredLogs = applySorting(filteredLogs);
    
    // Update table and counts
    updateTable(filteredLogs);
    updateCounts(filteredLogs.length, allLogRows.length);
    
    return false;
}

function parseSearchTerms(text) {
    if (!text) return { positive: [], negative: [], quoted: [] };
    
    const terms = { positive: [], negative: [], quoted: [] };
    
    // Find quoted phrases
    const quotedRegex = /"([^"]+)"/g;
    let match;
    while ((match = quotedRegex.exec(text)) !== null) {
        terms.quoted.push(match[1].toLowerCase());
        text = text.replace(match[0], ' ');
    }
    
    // Split remaining text into words
    const words = text.split(/\s+/).filter(word => word.length > 0);
    
    for (const word of words) {
        if (word.startsWith('-') && word.length > 1) {
            terms.negative.push(word.substring(1).toLowerCase());
        } else {
            terms.positive.push(word.toLowerCase());
        }
    }
    
    return terms;
}

function applySorting(logs) {
    return logs.sort((a, b) => {
        let comparison = 0;
        
        switch (currentSortField) {
            case 'timestamp':
                comparison = new Date(a.timestamp) - new Date(b.timestamp);
                break;
            case 'level':
                comparison = a.level.localeCompare(b.level);
                break;
            case 'message':
                comparison = a.message.localeCompare(b.message);
                break;
            default:
                comparison = new Date(a.timestamp) - new Date(b.timestamp);
        }
        
        return currentSortDirection === 'ascending' ? comparison : -comparison;
    });
} 