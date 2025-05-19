using LogViewer.Models;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace LogViewer.Services
{
    public class AdminService
    {
        private readonly IConfiguration _configuration;
        private readonly string _configFilePath;
        private readonly IWebHostEnvironment _webHostEnvironment;

        public AdminService(IConfiguration configuration, IWebHostEnvironment webHostEnvironment)
        {
            _configuration = configuration;
            _webHostEnvironment = webHostEnvironment;
            _configFilePath = Path.Combine(_webHostEnvironment.ContentRootPath, "config", "logfolders.json");
            
            // Create config directory if it doesn't exist
            var configDir = Path.GetDirectoryName(_configFilePath);
            if (!Directory.Exists(configDir))
            {
                Directory.CreateDirectory(configDir!);
            }

            // Create config file if it doesn't exist
            if (!File.Exists(_configFilePath))
            {
                SaveLogFolders(GetLogFoldersFromAppSettings());
            }
        }

        public AdminConfig GetAdminConfig()
        {
            return _configuration.GetSection("AdminCredentials").Get<AdminConfig>() ?? 
                new AdminConfig { Username = "admin", Password = "admin" };
        }

        public bool ValidateLogin(string username, string password)
        {
            var adminConfig = GetAdminConfig();
            return username == adminConfig.Username && password == adminConfig.Password;
        }

        private List<LogFolderConfig> GetLogFoldersFromAppSettings()
        {
            return _configuration.GetSection("LogFolders").Get<List<LogFolderConfig>>() ?? 
                new List<LogFolderConfig>();
        }

        public List<LogFolderConfig> GetLogFolders()
        {
            if (!File.Exists(_configFilePath))
            {
                return GetLogFoldersFromAppSettings();
            }

            try
            {
                var json = File.ReadAllText(_configFilePath);
                var folders = JsonSerializer.Deserialize<List<LogFolderConfig>>(json);
                return folders ?? new List<LogFolderConfig>();
            }
            catch
            {
                // If there's an error reading the config file, fallback to appsettings
                return GetLogFoldersFromAppSettings();
            }
        }

        public void SaveLogFolders(List<LogFolderConfig> folders)
        {
            var json = JsonSerializer.Serialize(folders, new JsonSerializerOptions
            {
                WriteIndented = true
            });
            
            File.WriteAllText(_configFilePath, json);
        }

        public void AddLogFolder(string name, string path)
        {
            var folders = GetLogFolders();
            
            // Check if a folder with the same name already exists
            if (!folders.Any(f => f.Name == name))
            {
                folders.Add(new LogFolderConfig { Name = name, Path = path });
                SaveLogFolders(folders);
            }
        }

        public void RemoveLogFolder(string name)
        {
            var folders = GetLogFolders();
            folders.RemoveAll(f => f.Name == name);
            SaveLogFolders(folders);
        }
    }
} 