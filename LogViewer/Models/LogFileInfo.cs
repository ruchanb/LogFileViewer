namespace LogViewer.Models
{
    public class LogFileInfo
    {
        public string FileName { get; set; } = string.Empty;
        public DateTime CreationDate { get; set; }
        public DateTime ModificationDate { get; set; }
        public long FileSizeBytes { get; set; }
    }
} 