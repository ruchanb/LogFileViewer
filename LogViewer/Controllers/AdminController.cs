using LogViewer.Models;
using LogViewer.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogViewer.Controllers
{
    [Authorize]
    public class AdminController : Controller
    {
        private readonly AdminService _adminService;

        public AdminController(AdminService adminService)
        {
            _adminService = adminService;
        }

        public IActionResult Index()
        {
            var logFolders = _adminService.GetLogFolders();
            return View(logFolders);
        }

        [HttpGet]
        public IActionResult AddFolder()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult AddFolder(LogFolderConfig folder)
        {
            if (ModelState.IsValid)
            {
                _adminService.AddLogFolder(folder.Name, folder.Path);
                return RedirectToAction(nameof(Index));
            }
            return View(folder);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult RemoveFolder(string name)
        {
            _adminService.RemoveLogFolder(name);
            return RedirectToAction(nameof(Index));
        }
    }
} 