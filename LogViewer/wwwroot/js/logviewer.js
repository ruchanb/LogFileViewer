// LogViewer JavaScript functionality

// Store all log rows for filtering
let allLogRows = [];
let currentSortField = "timestamp";
let currentSortDirection = "descending"; // This will be set from the server model

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
    // Capture all log rows
    const table = document.getElementById('logs-table');
    if (table) {
        allLogRows = Array.from(table.querySelector('tbody').rows);
        
        // Load saved filters from localStorage
        loadSavedFilters();
        
        // Set up event listeners for instant filtering
        document.querySelectorAll('.filter-input').forEach(input => {
            input.addEventListener('change', function() {
                applyFilters();
                saveFilters();
            });
        });
        
        // Set up text search with debounce
        const searchInput = document.getElementById('search-text');
        if (searchInput) {
            let timeout = null;
            searchInput.addEventListener('input', function() {
                clearTimeout(timeout);
                timeout = setTimeout(function() {
                    applyFilters();
                    saveFilters();
                }, 300);
            });
        }
        
        // Show active sort indicator
        updateSortIndicators();
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
    
    // Get filter values
    const levels = Array.from(document.querySelectorAll('input[name="Levels"]:checked'))
        .map(checkbox => checkbox.value);
    const excludedLevels = Array.from(document.querySelectorAll('input[name="ExcludedLevels"]:checked'))
        .map(checkbox => checkbox.value);
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
    
    // Filter rows
    let filteredRows = allLogRows.filter(row => {
        // Level filter
        if (levels.length > 0 && !levels.includes(row.getAttribute('data-level'))) {
            return false;
        }
        
        // Exclusion level filter
        if (excludedLevels.length > 0 && excludedLevels.includes(row.getAttribute('data-level'))) {
            return false;
        }
        
        // Date/time filter
        if (startDateTime || endDateTime) {
            const rowDate = row.getAttribute('data-date');
            const rowTime = row.getAttribute('data-time');
            const rowDateTime = new Date(`${rowDate}T${rowTime}`);
            
            if (startDateTime && rowDateTime < startDateTime) {
                return false;
            }
            
            if (endDateTime && rowDateTime > endDateTime) {
                return false;
            }
        }
        
        // Text search
        if (searchText) {
            const rowText = row.textContent.toLowerCase();
            
            // Check negative terms first (exclude)
            if (searchTerms.negative.some(term => rowText.includes(term))) {
                return false;
            }
            
            // Check quoted phrases (all must match)
            if (searchTerms.quoted.length > 0 && 
                !searchTerms.quoted.every(term => rowText.includes(term))) {
                return false;
            }
            
            // Check positive terms (at least one must match if any exist)
            if (searchTerms.positive.length > 0 && 
                !searchTerms.positive.some(term => rowText.includes(term))) {
                return false;
            }
        }
        
        // Exclusion text filter
        if (exclusionText) {
            const rowText = row.textContent.toLowerCase();
            
            // If any positive exclusion term matches, exclude this row
            if (exclusionTerms.positive.some(term => rowText.includes(term))) {
                return false;
            }
            
            // If any quoted exclusion phrase matches, exclude this row
            if (exclusionTerms.quoted.some(term => rowText.includes(term))) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort filtered rows
    filteredRows = sortRows(filteredRows);
    
    // Update the table
    updateTable(filteredRows);
    
    // Update counts
    document.getElementById('displayed-count').textContent = filteredRows.length;
    document.getElementById('total-count').textContent = allLogRows.length;
    
    return false;
}

function parseSearchTerms(query) {
    const result = {
        quoted: [],
        positive: [],
        negative: []
    };
    
    if (!query) return result;
    
    // Extract quoted phrases
    const quoteRegex = /"([^"]+)"/g;
    let match;
    let processedQuery = query;
    
    while ((match = quoteRegex.exec(query)) !== null) {
        result.quoted.push(match[1].toLowerCase());
        // Remove the quoted text from the query
        processedQuery = processedQuery.replace(match[0], ' ');
    }
    
    // Process remaining terms
    const terms = processedQuery.split(/\s+/).filter(t => t);
    
    terms.forEach(term => {
        if (term.startsWith('-') && term.length > 1) {
            result.negative.push(term.substring(1).toLowerCase());
        } else {
            result.positive.push(term.toLowerCase());
        }
    });
    
    return result;
}

function sortRows(rows) {
    return rows.sort((a, b) => {
        let aValue, bValue;
        
        if (currentSortField === 'timestamp') {
            // Use position for timestamp sorting
            aValue = parseInt(a.getAttribute('data-position'));
            bValue = parseInt(b.getAttribute('data-position'));
        } else {
            // Use the actual field value for other sorts
            aValue = a.getAttribute(`data-${currentSortField}`);
            bValue = b.getAttribute(`data-${currentSortField}`);
        }
        
        // Compare values
        let result = 0;
        if (aValue < bValue) {
            result = -1;
        } else if (aValue > bValue) {
            result = 1;
        }
        
        // Apply sort direction
        return currentSortDirection === 'ascending' ? result : -result;
    });
}

function updateTable(rows) {
    const tableBody = document.querySelector('#logs-table tbody');
    
    // Clear current rows
    tableBody.innerHTML = '';
    
    // Add filtered rows
    rows.forEach(row => {
        tableBody.appendChild(row.cloneNode(true));
    });
    
    // Show 'no records' message if needed
    if (rows.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 3;
        emptyCell.textContent = 'No matching logs found';
        emptyCell.className = 'text-center p-3';
        emptyRow.appendChild(emptyCell);
        tableBody.appendChild(emptyRow);
    }
}

// Function to set the initial sort direction from server model
function setInitialSortDirection(direction) {
    currentSortDirection = direction.toLowerCase();
} 