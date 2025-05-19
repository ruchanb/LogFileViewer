using System.Collections.Generic;
using LogViewer.Services;

namespace LogViewer.Models
{
    public enum SortDirection
    {
        Ascending,
        Descending
    }
    
    public enum SortField
    {
        Timestamp,
        Level,
        Message
    }

    public class LogFilterOptions
    {
        public string? SearchText { get; set; }
        public List<LogLevel>? Levels { get; set; }
        
        // Exclusion filters
        public string? ExclusionText { get; set; }
        public List<LogLevel>? ExcludedLevels { get; set; }
        
        // Date components
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public TimeSpan? StartTime { get; set; }
        public TimeSpan? EndTime { get; set; }
        
        // Combined properties for filtering
        public DateTime? GetStartDateTime()
        {
            if (!StartDate.HasValue) return null;
            
            // If no start time specified, use beginning of day
            var dateTime = StartDate.Value.Date;
            if (StartTime.HasValue)
            {
                dateTime = dateTime.Add(StartTime.Value);
            }
            return dateTime;
        }
        
        public DateTime? GetEndDateTime()
        {
            if (!EndDate.HasValue) return null;
            
            // If no end time specified, use end of day
            var dateTime = EndDate.Value.Date;
            if (EndTime.HasValue)
            {
                dateTime = dateTime.Add(EndTime.Value);
            }
            else
            {
                dateTime = dateTime.AddDays(1).AddTicks(-1); // End of day
            }
            return dateTime;
        }
        
        public string? LogFolder { get; set; }
        public SortDirection SortDirection { get; set; } = SortDirection.Descending; // Default to newest first
        
        // Table sorting
        public SortField SortField { get; set; } = SortField.Timestamp;
        public SortDirection TableSortDirection { get; set; } = SortDirection.Descending;
    }

    public class LogViewerViewModel
    {
        public List<LogEntry> Logs { get; set; } = new List<LogEntry>();
        public List<LogFolderConfig> LogFolders { get; set; } = new List<LogFolderConfig>();
        public LogFilterOptions FilterOptions { get; set; } = new LogFilterOptions();
        public int TotalCount { get; set; }
        public int DisplayedCount { get; set; }
        public List<LogFileInfo> AvailableLogFiles { get; set; } = new List<LogFileInfo>();
        public string? SelectedLogFile { get; set; }
    }
} 