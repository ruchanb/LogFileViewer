using System;
using System.Text.RegularExpressions;

namespace LogViewer.Models
{
    public enum LogLevel
    {
        TRACE,
        DEBUG,
        INF,
        WRN,
        ERR,
        FATAL
    }

    public class LogEntry
    {
        public DateTime Timestamp { get; set; }
        public LogLevel Level { get; set; }
        public string Message { get; set; } = string.Empty;
        public string FullText { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;

        public static LogEntry? ParseLogLine(string line, string fileName)
        {
            // Example log line: [2025-05-16 00:44:03 INF] Request starting HTTP/1.1 GET http://68.221.168.39/.env - null null
            var regex = new Regex(@"\[([\d-]+ [\d:]+) (\w+)\] (.+)");
            var match = regex.Match(line);

            if (!match.Success) return null;

            var timestamp = DateTime.Parse(match.Groups[1].Value);
            var levelStr = match.Groups[2].Value;
            var message = match.Groups[3].Value;

            if (!Enum.TryParse<LogLevel>(levelStr, out var level))
            {
                level = LogLevel.INF; // Default to INFO if level is unknown
            }

            return new LogEntry
            {
                Timestamp = timestamp,
                Level = level,
                Message = message,
                FullText = line,
                FileName = fileName
            };
        }
    }
} 