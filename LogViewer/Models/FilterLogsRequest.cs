namespace LogViewer.Models
{
    public class FilterLogsRequest
    {
        public string Folder { get; set; } = string.Empty;
        public string File { get; set; } = string.Empty;
        public FilterOptionsDto? FilterOptions { get; set; }
    }

    public class FilterOptionsDto
    {
        public string? SearchText { get; set; }
        public List<string>? Levels { get; set; }
        public string? ExclusionText { get; set; }
        public List<string>? ExcludedLevels { get; set; }
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
        public string? StartTime { get; set; }
        public string? EndTime { get; set; }
        public string? SortDirection { get; set; }
        public int SortField { get; set; }
        public int TableSortDirection { get; set; }
    }
} 