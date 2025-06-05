using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using LogViewer.Models;
using LogViewer.Services;
using Microsoft.AspNetCore.Authorization;
using System.Linq;
using System.Threading.Tasks;

namespace LogViewer.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly LogReaderService _logReaderService;
    private readonly AdminService _adminService;

    public HomeController(
        ILogger<HomeController> logger,
        LogReaderService logReaderService,
        AdminService adminService)
    {
        _logger = logger;
        _logReaderService = logReaderService;
        _adminService = adminService;
    }

    public IActionResult Index()
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            return RedirectToAction(nameof(LogViewer));
        }
        return View();
    }

    [Authorize]
    public IActionResult LogViewer(string folder, string file, LogFilterOptions filterOptions, SortField? sortField = null, SortDirection? tableSortDirection = null)
    {
        var viewModel = new LogViewerViewModel
        {
            LogFolders = _adminService.GetLogFolders(),
            FilterOptions = filterOptions ?? new LogFilterOptions()
        };

        // Handle table sorting
        if (sortField.HasValue)
        {
            viewModel.FilterOptions.SortField = sortField.Value;
            if (tableSortDirection.HasValue)
            {
                viewModel.FilterOptions.TableSortDirection = tableSortDirection.Value;
            }
            else if (viewModel.FilterOptions.SortField == SortField.Timestamp && viewModel.FilterOptions.TableSortDirection == viewModel.FilterOptions.SortDirection)
            {
                // Toggle sort direction when clicking the same column
                viewModel.FilterOptions.TableSortDirection = viewModel.FilterOptions.TableSortDirection == SortDirection.Ascending
                    ? SortDirection.Descending

                    : SortDirection.Ascending;
            }
        }

        // Set default folder if none is selected
        if (string.IsNullOrEmpty(folder) && viewModel.LogFolders.Any())
        {
            folder = viewModel.LogFolders.First().Path;
        }

        if (!string.IsNullOrEmpty(folder))
        {
            viewModel.FilterOptions.LogFolder = folder;
            viewModel.AvailableLogFiles = _logReaderService.GetLogFilesFromFolder(folder);

            if (!string.IsNullOrEmpty(file))
            {
                viewModel.SelectedLogFile = file;
                // Don't load logs here - let JavaScript handle all log loading
                viewModel.Logs = new List<LogEntry>();
                viewModel.TotalCount = 0;
                viewModel.DisplayedCount = 0;
            }
            else if (viewModel.AvailableLogFiles.Any())
            {
                // If no specific file selected, select the most recent one but don't load logs
                viewModel.SelectedLogFile = viewModel.AvailableLogFiles.First().FileName;
                viewModel.Logs = new List<LogEntry>();
                viewModel.TotalCount = 0;
                viewModel.DisplayedCount = 0;
            }
        }

        return View(viewModel);
    }

    private List<LogEntry> ApplyTableSorting(List<LogEntry> logs, SortField sortField, SortDirection sortDirection)
    {
        if (logs == null)
        {
            _logger.LogWarning("ApplyTableSorting called with null logs");
            return new List<LogEntry>();
        }

        return sortField switch
        {
            SortField.Timestamp => sortDirection == SortDirection.Ascending 
                ? logs.OrderBy(l => l.Timestamp).ToList() 
                : logs.OrderByDescending(l => l.Timestamp).ToList(),
            SortField.Level => sortDirection == SortDirection.Ascending 
                ? logs.OrderBy(l => l.Level).ToList() 
                : logs.OrderByDescending(l => l.Level).ToList(),
            SortField.Message => sortDirection == SortDirection.Ascending 
                ? logs.OrderBy(l => l.Message).ToList() 
                : logs.OrderByDescending(l => l.Message).ToList(),
            _ => logs
        };
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> FilterLogs([FromBody] FilterLogsRequest request)
    {
        try
        {
            _logger.LogInformation("FilterLogs called");
            
            if (request == null)
            {
                _logger.LogWarning("Request is null");
                return Json(new { success = false, message = "Invalid request" });
            }

            _logger.LogInformation("Request received - Folder: {Folder}, File: {File}, FilterOptions: {FilterOptions}", 
                request.Folder, request.File, request.FilterOptions != null ? "Not null" : "Null");

            if (string.IsNullOrEmpty(request.Folder) || string.IsNullOrEmpty(request.File))
            {
                _logger.LogWarning("Folder or file is empty - Folder: {Folder}, File: {File}", request.Folder, request.File);
                return Json(new { success = false, message = "Folder and file are required" });
            }

            // Ensure FilterOptions is not null
            var filterOptions = request.FilterOptions != null ? ConvertToLogFilterOptions(request.FilterOptions) : new LogFilterOptions();
            
            _logger.LogInformation("FilterOptions - SearchText: {SearchText}, SortField: {SortField}, TableSortDirection: {TableSortDirection}", 
                filterOptions.SearchText, filterOptions.SortField, filterOptions.TableSortDirection);

            // Read and filter logs
            var logs = await _logReaderService.ReadLogFileAsync(request.Folder, request.File, filterOptions);
            
            _logger.LogInformation("Read {LogCount} logs from file", logs.Count);
            
            // Apply table sorting
            logs = ApplyTableSorting(logs, filterOptions.SortField, filterOptions.TableSortDirection);
            
            _logger.LogInformation("Applied table sorting, returning {LogCount} logs", logs.Count);
            
            // Return the filtered logs as JSON
            try
            {
                var response = new { 
                    success = true, 
                    logs = logs.Select((log, index) => new {
                        timestamp = log.Timestamp.ToString("yyyy-MM-dd HH:mm:ss"),
                        level = log.Level.ToString(),
                        message = log.Message,
                        date = log.Timestamp.ToString("yyyy-MM-dd"),
                        time = log.Timestamp.ToString("HH:mm:ss"),
                        position = index
                    }),
                    totalCount = logs.Count,
                    displayedCount = logs.Count
                };
                
                _logger.LogInformation("Created response object successfully");
                return Json(response);
            }
            catch (Exception jsonEx)
            {
                _logger.LogError(jsonEx, "Error creating JSON response");
                return Json(new { success = false, message = "Error creating response" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error filtering logs for folder: {Folder}, file: {File}", request?.Folder, request?.File);
            return Json(new { success = false, message = "An error occurred while filtering logs" });
        }
    }

    [Authorize]
    [HttpPost]
    public IActionResult SearchLogs(LogFilterOptions filterOptions, string folder, string file)
    {
        // Redirect to LogViewer with the filter options
        return RedirectToAction(nameof(LogViewer), new { 
            folder, 
            file, 
            filterOptions.SearchText, 
            filterOptions.StartDate, 
            filterOptions.EndDate, 
            filterOptions.StartTime,
            filterOptions.EndTime,
            filterOptions.SortDirection,
            filterOptions.ExclusionText,
            filterOptions.ExcludedLevels
        });
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }

    private LogFilterOptions ConvertToLogFilterOptions(FilterOptionsDto dto)
    {
        var options = new LogFilterOptions
        {
            SearchText = dto.SearchText,
            ExclusionText = dto.ExclusionText
        };

        // Convert string levels to LogLevel enums
        if (dto.Levels != null && dto.Levels.Any())
        {
            options.Levels = dto.Levels
                .Where(level => Enum.TryParse<LogViewer.Models.LogLevel>(level, out _))
                .Select(level => Enum.Parse<LogViewer.Models.LogLevel>(level))
                .ToList();
        }

        if (dto.ExcludedLevels != null && dto.ExcludedLevels.Any())
        {
            options.ExcludedLevels = dto.ExcludedLevels
                .Where(level => Enum.TryParse<LogViewer.Models.LogLevel>(level, out _))
                .Select(level => Enum.Parse<LogViewer.Models.LogLevel>(level))
                .ToList();
        }

        // Convert string dates to DateTime
        if (!string.IsNullOrEmpty(dto.StartDate) && DateTime.TryParse(dto.StartDate, out var startDate))
        {
            options.StartDate = startDate;
        }

        if (!string.IsNullOrEmpty(dto.EndDate) && DateTime.TryParse(dto.EndDate, out var endDate))
        {
            options.EndDate = endDate;
        }

        // Convert string times to TimeSpan
        if (!string.IsNullOrEmpty(dto.StartTime) && TimeSpan.TryParse(dto.StartTime, out var startTime))
        {
            options.StartTime = startTime;
        }

        if (!string.IsNullOrEmpty(dto.EndTime) && TimeSpan.TryParse(dto.EndTime, out var endTime))
        {
            options.EndTime = endTime;
        }

        // Convert string sort direction to enum
        if (!string.IsNullOrEmpty(dto.SortDirection) && Enum.TryParse<SortDirection>(dto.SortDirection, out var sortDirection))
        {
            options.SortDirection = sortDirection;
        }

        // Convert int enums
        options.SortField = (SortField)dto.SortField;
        options.TableSortDirection = (SortDirection)dto.TableSortDirection;

        return options;
    }
}
