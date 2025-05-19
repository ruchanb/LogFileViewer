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
    public async Task<IActionResult> LogViewer(string folder, string file, LogFilterOptions filterOptions, SortField? sortField = null, SortDirection? tableSortDirection = null)
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
                var logs = await _logReaderService.ReadLogFileAsync(folder, file, viewModel.FilterOptions);
                
                // Apply table sorting
                logs = ApplyTableSorting(logs, viewModel.FilterOptions.SortField, viewModel.FilterOptions.TableSortDirection);
                
                viewModel.Logs = logs;
                viewModel.TotalCount = logs.Count;
                viewModel.DisplayedCount = logs.Count;
            }
            else if (viewModel.AvailableLogFiles.Any())
            {
                // If no specific file selected, show the most recent one
                viewModel.SelectedLogFile = viewModel.AvailableLogFiles.First().FileName;
                var logs = await _logReaderService.ReadLogFileAsync(folder, viewModel.SelectedLogFile, viewModel.FilterOptions);
                
                // Apply table sorting
                logs = ApplyTableSorting(logs, viewModel.FilterOptions.SortField, viewModel.FilterOptions.TableSortDirection);
                
                viewModel.Logs = logs;
                viewModel.TotalCount = logs.Count;
                viewModel.DisplayedCount = logs.Count;
            }
        }

        return View(viewModel);
    }

    private List<LogEntry> ApplyTableSorting(List<LogEntry> logs, SortField sortField, SortDirection sortDirection)
    {
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
}
