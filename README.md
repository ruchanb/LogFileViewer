# LogViewer

A web-based log file viewer built with ASP.NET Core 8.0 that provides an intuitive interface for browsing, searching, and filtering log files across multiple directories.

98% built on AI with Cursor. Agents used: `claude-4-sonnet, claude-3.5-sonnet,gpt-4.o, gemini-2.5-pro`

## Features

- **Multi-folder Log Management**: Configure multiple log directories through JSON configuration
- **Authentication System**: Cookie-based authentication with configurable admin credentials
- **Advanced Search & Filtering**: 
  - Search across log messages with highlighting
  - Filter by log level (Debug, Info, Warning, Error, etc.)
  - Date range filtering
  - Exclusion filters for refining results
- **Real-time Log Parsing**: Supports various log formats including .txt and .log files
- **Sortable Columns**: Sort logs by timestamp, level, or message
- **File Management**: View file information including creation dates, modification dates, and file sizes
- **Responsive Web Interface**: Modern web UI accessible from any browser
- **Collapsible Log Entries**: Expandable view for detailed log inspection

## Prerequisites

### Windows
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) or later
- Visual Studio 2022 (recommended) or Visual Studio Code
- Windows 10/11 or Windows Server 2019/2022

### Linux
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) or later
- Any text editor or IDE (VS Code, Rider, etc.)
- Ubuntu 20.04+, CentOS 8+, or other supported Linux distributions

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd logviewer
   ```

2. **Restore dependencies**:
   ```bash
   dotnet restore
   ```

## Configuration

### 1. Admin Credentials
Update the admin credentials in `LogViewer/appsettings.json`:

```json
{
  "AdminCredentials": {
    "Username": "your-admin-username",
    "Password": "your-admin-password"
  }
}
```

### 2. Log Folder Configuration
Configure your log directories in `LogViewer/config/logfolders.json`:

```json
[
  {
    "Name": "Application Logs",
    "Path": "/path/to/your/logs"
  },
  {
    "Name": "API Logs", 
    "Path": "C:\\logs\\api"
  }
]
```

**Path Examples**:
- **Windows**: `"C:\\logs\\application"` or `"D:\\MyApp\\logs"`
- **Linux**: `"/var/log/myapp"` or `"/home/user/logs"`
- **Relative paths**: `"logs"` (relative to application directory)

## Building and Running

### Windows

#### Using Visual Studio
1. Open `logviewer.sln` in Visual Studio 2022
2. Set `LogViewer` as the startup project
3. Press `F5` or click "Start Debugging"

#### Using Command Line
```powershell
# Navigate to the LogViewer project directory
cd LogViewer

# Build the project
dotnet build

# Run the application
dotnet run
```

#### Building for Release (Windows)
```powershell
# Build for release
dotnet build --configuration Release

# Publish self-contained executable
dotnet publish --configuration Release --self-contained true --runtime win-x64 --output ./publish/win-x64

# Publish framework-dependent
dotnet publish --configuration Release --output ./publish/portable
```

#### Building for Release (Linux on Windows)
```powershell

# Publish framework-dependent
dotnet publish --configuration Release --output ./publishlinux --runtime linux-x64
```

### Linux

#### Development
```bash
# Navigate to the LogViewer project directory
cd LogViewer

# Build the project
dotnet build

# Run the application
dotnet run
```

#### Building for Release (Linux)
```bash
# Build for release
dotnet build --configuration Release

# Publish self-contained executable for Linux
dotnet publish --configuration Release --self-contained true --runtime linux-x64 --output ./publish/linux-x64

# Publish framework-dependent
dotnet publish --configuration Release --output ./publish/portable
```

#### Running as a Service (Linux)
Create a systemd service file `/etc/systemd/system/logviewer.service`:

```ini
[Unit]
Description=LogViewer Web Application
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/logviewer
ExecStart=/opt/logviewer/LogViewer
Restart=on-failure
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=logviewer
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5000

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable logviewer
sudo systemctl start logviewer
sudo systemctl status logviewer
```

## Usage

1. **Start the application** using one of the methods above
2. **Navigate to** `http://localhost:5000` (or the configured port)
3. **Login** with the admin credentials you configured
4. **Select a log folder** from the dropdown
5. **Choose a log file** to view
6. **Use the filtering options** to search and filter logs:
   - Search text with highlighting
   - Date range filtering
   - Log level filtering
   - Exclusion filters

## Configuration Options

### Application Settings
The `appsettings.json` file supports the following configuration:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "AdminCredentials": {
    "Username": "<SetUser>",
    "Password": "<SetPassword>"
  }
}
```

### Log Format Support
The application automatically parses common log formats and supports:
- Timestamp detection
- Log level extraction (Debug, Info, Warning, Error, Fatal)
- Multi-line log entries
- Various file extensions (.txt, .log, .LOG)

## Troubleshooting

### Common Issues

1. **Port already in use**:
   - Change the port in `Properties/launchSettings.json`
   - Or use: `dotnet run --urls "http://localhost:5001"`

2. **Log files not appearing**:
   - Verify the paths in `config/logfolders.json` are correct
   - Check file permissions on log directories
   - Ensure the application has read access to log files

3. **Authentication issues**:
   - Verify admin credentials in `appsettings.json`
   - Clear browser cookies if needed

### Linux-specific Issues

1. **Permission denied errors**:
   ```bash
   sudo chown -R www-data:www-data /path/to/logfiles
   sudo chmod -R 755 /path/to/logfiles
   ```

2. **Port binding issues**:
   ```bash
   # Check if port is in use
   sudo netstat -tlnp | grep :5000
   
   # Configure different port
   export ASPNETCORE_URLS="http://localhost:5001"
   ```

## Development

### Project Structure
```
LogViewer/
├── Controllers/          # MVC Controllers
├── Models/              # Data models and view models
├── Services/            # Business logic services
├── Views/               # Razor views
├── wwwroot/             # Static files (CSS, JS, images)
├── config/              # Configuration files
└── Properties/          # Launch settings
```

