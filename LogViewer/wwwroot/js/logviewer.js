// LogViewer JavaScript functionality

// Store current filter state
let currentFolder = '';
let currentFile = '';
let currentSortField = "timestamp";
let currentSortDirection = "descending";
let isLoading = false;

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
    
    // Apply filters on initial load if we have folder and file
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
        currentSortDirection: currentSortDirection
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
        
        // Apply the loaded filters
        applyFilters();
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
    logs.forEach(log => {
        const row = document.createElement('tr');
        row.className = getLogRowClass(log.level);
        row.setAttribute('data-level', log.level);
        row.setAttribute('data-message', log.message);
        row.setAttribute('data-date', log.date);
        row.setAttribute('data-time', log.time);
        row.setAttribute('data-position', log.position);
        
        row.innerHTML = `
            <td class="text-nowrap">${log.timestamp}</td>
            <td class="text-nowrap">${log.level}</td>
            <td>${escapeHtml(log.message)}</td>
        `;
        
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