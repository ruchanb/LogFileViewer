using LogViewer.Models;
using Microsoft.Extensions.Options;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace LogViewer.Services
{
    public class LogReaderService
    {
        private readonly IConfiguration _configuration;
        private readonly List<LogFolderConfig> _logFolders;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly ILogger<LogReaderService> _logger;

        public LogReaderService(
            IConfiguration configuration, 
            IWebHostEnvironment webHostEnvironment,
            ILogger<LogReaderService> logger)
        {
            _configuration = configuration;
            _webHostEnvironment = webHostEnvironment;
            _logger = logger;
            _logFolders = _configuration.GetSection("LogFolders").Get<List<LogFolderConfig>>() ?? new List<LogFolderConfig>();
            
            // Log path information for debugging
            LogPathInformation();
        }
        
        private void LogPathInformation()
        {
            _logger.LogInformation("Application Content Root Path: {RootPath}", _webHostEnvironment.ContentRootPath);
            _logger.LogInformation("Current Directory: {CurrentDir}", Environment.CurrentDirectory);
            _logger.LogInformation("Current Drive Root: {DriveRoot}", Path.GetPathRoot(Environment.CurrentDirectory));
            
            foreach (var folder in _logFolders)
            {
                string resolvedPath = GetAbsolutePath(folder.Path);
                _logger.LogInformation("Log Folder '{Name}' - Original Path: {OrigPath}, Resolved Path: {ResolvedPath}",
                    folder.Name, folder.Path, resolvedPath);
                
                if (Directory.Exists(resolvedPath))
                {
                    _logger.LogInformation("Directory exists: {Path}", resolvedPath);
                    
                    try
                    {
                        var files = Directory.GetFiles(resolvedPath, "*.txt");
                        _logger.LogInformation("Found {Count} log files in {Path}", files.Length, resolvedPath);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error accessing directory {Path}", resolvedPath);
                    }
                }
                else
                {
                    _logger.LogWarning("Directory does not exist: {Path}", resolvedPath);
                }
            }
        }

        public List<LogFolderConfig> GetLogFolders()
        {
            return _logFolders;
        }

        // LogFileInfo moved to Models/LogFileInfo.cs

        public List<LogFileInfo> GetLogFilesFromFolder(string folderPath)
        {
            var basePath = GetAbsolutePath(folderPath);
            var fileInfos = new List<LogFileInfo>();
            
            _logger.LogInformation("Getting log files from path: {Path}", basePath);
            
            try
            {
                if (!Directory.Exists(basePath))
                {
                    _logger.LogWarning("Directory does not exist: {Path}", basePath);
                    return fileInfos;
                }

                // Get all txt and log files
                var filePatterns = new[] { "*.txt", "*.log", "*.LOG" };
                var allFiles = new List<string>();
                
                foreach (var pattern in filePatterns)
                {
                    try
                    {
                        var files = Directory.GetFiles(basePath, pattern);
                        _logger.LogInformation("Found {Count} files matching pattern {Pattern} in {Path}", 
                            files.Length, pattern, basePath);
                        allFiles.AddRange(files);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error getting files with pattern {Pattern} from {Path}", pattern, basePath);
                    }
                }
                
                foreach (var file in allFiles)
                {
                    try
                    {
                        var fileInfo = new FileInfo(file);
                        fileInfos.Add(new LogFileInfo
                        {
                            FileName = Path.GetFileName(file),
                            CreationDate = fileInfo.CreationTime,
                            ModificationDate = fileInfo.LastWriteTime,
                            FileSizeBytes = fileInfo.Length
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error getting file info for {File}", file);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error accessing directory {Path}", basePath);
            }
            
            // Sort by modification date (newest first)
            return fileInfos.OrderByDescending(f => f.ModificationDate).ToList();
        }

        private string GetAbsolutePath(string path)
        {
            // If the path is already fully rooted (like C:\logs\folder), return it as is
            if (Path.IsPathRooted(path))
            {
                return path;
            }

            // If path starts with a slash, treat it as server root path
            if (path.StartsWith("/") || path.StartsWith("\\"))
            {
                // Get the root of the current drive
                string rootDrive = Path.GetPathRoot(Environment.CurrentDirectory)!;
                return Path.Combine(rootDrive, path.TrimStart('/', '\\'));
            }

            // Otherwise, use the path as is, assuming it's an absolute path on the server
            return path;
        }

        public async Task<List<LogEntry>> ReadLogFileAsync(string folderPath, string fileName, LogFilterOptions? filterOptions = null)
        {
            var fullPath = Path.Combine(GetAbsolutePath(folderPath), fileName);
            var entries = new List<LogEntry>();
            
            _logger.LogInformation("Reading log file: {Path}", fullPath);
            
            try
            {
                if (!File.Exists(fullPath))
                {
                    _logger.LogWarning("File does not exist: {Path}", fullPath);
                    return entries;
                }

                using (var reader = new StreamReader(fullPath))
                {
                    string line;
                    int lineCount = 0;
                    int parsedCount = 0;
                    
                    while ((line = (await reader.ReadLineAsync())!) != null)
                    {
                        lineCount++;
                        try
                        {
                            var entry = LogEntry.ParseLogLine(line, fileName);
                            if (entry != null)
                            {
                                entries.Add(entry);
                                parsedCount++;
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error parsing line {LineNum} in file {File}", lineCount, fullPath);
                        }
                    }
                    
                    _logger.LogInformation("Parsed {ParsedCount} log entries from {TotalCount} lines in {File}", 
                        parsedCount, lineCount, fullPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading log file {Path}", fullPath);
            }

            return ApplyFilters(entries, filterOptions);
        }

        public List<LogEntry> ApplyFilters(List<LogEntry> entries, LogFilterOptions? filterOptions)
        {
            if (filterOptions == null)
            {
                return entries;
            }

            var filteredEntries = entries;
            
            // Filter by log level
            if (filterOptions.Levels != null && filterOptions.Levels.Any())
            {
                filteredEntries = filteredEntries
                    .Where(e => filterOptions.Levels.Contains(e.Level))
                    .ToList();
            }
            
            // Exclude specific log levels
            if (filterOptions.ExcludedLevels != null && filterOptions.ExcludedLevels.Any())
            {
                _logger.LogInformation("Applying excluded levels filter: {ExcludedLevels}", string.Join(", ", filterOptions.ExcludedLevels));
                
                var beforeCount = filteredEntries.Count;
                
                filteredEntries = filteredEntries
                    .Where(e => !filterOptions.ExcludedLevels.Contains(e.Level))
                    .ToList();
                
                _logger.LogInformation("Excluded levels filter: {BeforeCount} -> {AfterCount} entries", beforeCount, filteredEntries.Count);
            }

            // Filter by combined date-time range
            var startDateTime = filterOptions.GetStartDateTime();
            if (startDateTime.HasValue)
            {
                filteredEntries = filteredEntries
                    .Where(e => e.Timestamp >= startDateTime.Value)
                    .ToList();
            }

            var endDateTime = filterOptions.GetEndDateTime();
            if (endDateTime.HasValue)
            {
                filteredEntries = filteredEntries
                    .Where(e => e.Timestamp <= endDateTime.Value)
                    .ToList();
            }

            // Filter by search text (Elasticsearch-like)
            if (!string.IsNullOrWhiteSpace(filterOptions.SearchText))
            {
                // Parse search query to handle Elasticsearch-like syntax
                var searchParts = ParseSearchQuery(filterOptions.SearchText);
                
                filteredEntries = filteredEntries
                    .Where(e => MatchesSearchQuery(e, searchParts))
                    .ToList();
            }
            
            // Apply exclusion text filter
            if (!string.IsNullOrWhiteSpace(filterOptions.ExclusionText))
            {
                _logger.LogInformation("Applying exclusion text filter: {ExclusionText}", filterOptions.ExclusionText);
                
                // Parse exclusion query to handle Elasticsearch-like syntax
                var exclusionParts = ParseSearchQuery(filterOptions.ExclusionText);
                
                var beforeCount = filteredEntries.Count;
                
                // Remove entries that match the exclusion criteria
                filteredEntries = filteredEntries
                    .Where(e => !MatchesExclusionQuery(e, exclusionParts))
                    .ToList();
                
                _logger.LogInformation("Exclusion filter: {BeforeCount} -> {AfterCount} entries", beforeCount, filteredEntries.Count);
            }

            // Note: Table sorting will be applied at the controller level
            // This is just the initial sort based on the filter options
            filteredEntries = filterOptions.SortDirection == SortDirection.Ascending
                ? filteredEntries.OrderBy(e => e.Timestamp).ToList()
                : filteredEntries.OrderByDescending(e => e.Timestamp).ToList();
            
            return filteredEntries;
        }

        private Dictionary<string, List<string>> ParseSearchQuery(string query)
        {
            var result = new Dictionary<string, List<string>>();
            
            // Find quoted phrases
            var quotedTerms = new List<string>();
            var quotedRegex = new Regex("\"([^\"]+)\"");
            var matches = quotedRegex.Matches(query);
            
            foreach (Match match in matches)
            {
                quotedTerms.Add(match.Groups[1].Value);
                // Remove the quoted term from the query
                query = query.Replace(match.Value, " ");
            }
            
            // Add positive quoted terms
            if (quotedTerms.Any())
            {
                result["quoted"] = quotedTerms;
            }
            
            // Handle remaining terms (positive and negative)
            var terms = query.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            var positiveTerms = terms.Where(t => !t.StartsWith("-")).ToList();
            var negativeTerms = terms.Where(t => t.StartsWith("-"))
                .Select(t => t.Substring(1))
                .Where(t => !string.IsNullOrEmpty(t))
                .ToList();
            
            if (positiveTerms.Any())
            {
                result["positive"] = positiveTerms;
            }
            
            if (negativeTerms.Any())
            {
                result["negative"] = negativeTerms;
            }
            
            return result;
        }

        private bool MatchesSearchQuery(LogEntry entry, Dictionary<string, List<string>> searchParts)
        {
            var fullText = entry.FullText.ToLower();
            
            // Check if any negative terms are present (exclude entry if found)
            if (searchParts.TryGetValue("negative", out var negativeTerms))
            {
                if (negativeTerms.Any(term => fullText.Contains(term.ToLower())))
                {
                    return false;
                }
            }
            
            // Check for quoted phrases (all must be present)
            if (searchParts.TryGetValue("quoted", out var quotedTerms))
            {
                if (!quotedTerms.All(term => fullText.Contains(term.ToLower())))
                {
                    return false;
                }
            }
            
            // Check for positive terms (at least one must be present)
            if (searchParts.TryGetValue("positive", out var positiveTerms))
            {
                if (positiveTerms.Any() && !positiveTerms.Any(term => fullText.Contains(term.ToLower())))
                {
                    return false;
                }
            }
            
            // If we got here and there are search terms, the entry matched the criteria
            return searchParts.Any();
        }

        private bool MatchesExclusionQuery(LogEntry entry, Dictionary<string, List<string>> exclusionParts)
        {
            var fullText = entry.FullText.ToLower();
            
            // For exclusion, we want to exclude entries that contain any of the specified terms
            // Check for quoted phrases (if any are present, exclude the entry)
            if (exclusionParts.TryGetValue("quoted", out var quotedTerms))
            {
                if (quotedTerms.Any(term => fullText.Contains(term.ToLower())))
                {
                    return true; // Exclude this entry
                }
            }
            
            // Check for positive terms (if any are present, exclude the entry)
            if (exclusionParts.TryGetValue("positive", out var positiveTerms))
            {
                if (positiveTerms.Any(term => fullText.Contains(term.ToLower())))
                {
                    return true; // Exclude this entry
                }
            }
            
            // Check for negative terms (if any are present, DON'T exclude the entry)
            if (exclusionParts.TryGetValue("negative", out var negativeTerms))
            {
                if (negativeTerms.Any(term => fullText.Contains(term.ToLower())))
                {
                    return false; // Don't exclude this entry
                }
            }
            
            // If no exclusion criteria matched, don't exclude the entry
            return false;
        }

        public async Task<List<LogEntry>> ReadMultipleLogFilesAsync(string folderPath, IEnumerable<string> fileNames, LogFilterOptions? filterOptions = null)
        {
            var allEntries = new List<LogEntry>();
            
            foreach (var fileName in fileNames)
            {
                var entries = await ReadLogFileAsync(folderPath, fileName, null);
                allEntries.AddRange(entries);
            }
            
            // Apply filters after combining all entries
            return ApplyFilters(allEntries, filterOptions);
        }
    }
} 