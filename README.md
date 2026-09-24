# GitHub IPTV Analyzer

GitHub IPTV Analyzer is a mobile-first Android WebView application that searches public GitHub repositories and public text files for IPTV/server-related configuration values such as hosts, domains, IPs, ports, usernames, proxies, M3U URLs, server URLs, and configuration snippets.

The app uses only public GitHub API data and public repository URLs. It does not authenticate, brute-force, test passwords, probe servers, or bypass any security controls.

## Key Features

- Public GitHub code search using the official GitHub API
- Pagination and rate-limit handling
- Repository and file extension filtering
- Extraction of:
  - Hosts
  - Domains
  - IP addresses
  - Ports
  - Public usernames
  - Public proxies
  - M3U URLs
  - Server URLs
  - Configuration file content
- Duplicate removal
- Search/filter controls
- Copy to clipboard
- CSV/TXT export
- Sort by source repository/file
- Dark cyberpunk mobile-first UI
- Full public source traceability for every result

## Safety and Compliance

This project is intentionally limited to read-only public GitHub data access.

It does not:
- brute force accounts
- test passwords
- attempt authentication
- scan third-party servers
- test proxies against external resources
- bypass authentication
- exploit vulnerabilities

All extracted data remains traceable to its public GitHub source repository and public file.

## Project Structure

```text
.
├── app/
│   ├── build.gradle
│   ├── src/
│   │   ├── main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── assets/
│   │   │   │   └── analyzer/
│   │   │   │       ├── index.html
│   │   │   │       ├── styles.css
│   │   │   │       └── app.js
│   │   │   ├── java/com/githubiptvanalyzer/app/MainActivity.kt
│   │   │   └── res/
│   │   │       ├── values/
│   │   │       │   ├── strings.xml
│   │   │       │   ├── themes.xml
│   │   │       │   └── styles.xml
│   │   │       └── xml/
│   │   │           └── network_security_config.xml
├── build.gradle
├── gradle.properties
├── settings.gradle
├── gradlew
├── gradlew.bat
└── README.md
```

## Requirements

- Android Studio
- JDK 17+
- Android SDK 34
- Internet access for GitHub API requests

## Build APK

Open the project in Android Studio, or build from the command line:

```bash
./gradlew assembleDebug
```

The APK will be generated here:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Install on Android

1. Copy the APK to your Android device.
2. Open the APK file.
3. If prompted, allow installation from unknown sources.
4. Tap Install.
5. Launch GitHub IPTV Analyzer.

## Run in Android Studio

1. Open the project in Android Studio.
2. Let Gradle sync.
3. Select an emulator or connected device.
4. Click Run.

## UI Overview

The app includes a mobile-first cyberpunk interface with sections:

- SCAN
- HOST
- USERS
- PROXIES
- ABOUT

### SCAN
- GitHub Search Query
- Repository filter
- File extension filter
- Search GitHub
- Stop
- Clear
- Real-time statistics

### HOST
- Host
- Port
- Protocol
- Source Repository
- Source File

### USERS
- Username
- Source Repository
- Source File

### PROXIES
- Proxy
- Port
- Protocol
- Source Repository
- Source File

## Source Traceability

Every displayed item includes a public GitHub source link to the originating repository and file.

This is enforced in the app UI and export data.

## Rate Limits and Pagination

The app includes:
- GitHub API rate-limit checks
- safe handling of 403 and 429 responses
- paging through search result pages
- local stop controls

## License

This project is provided for educational and local analysis purposes under the project's own use constraints. Please respect GitHub's public API terms, repository terms, and applicable laws.

## Notes

This application is a browser-based Android wrapper and does not include any private or authenticated data access. It is designed to search only public GitHub content and to keep all results clearly attributable to public source files.

If you want to customize the app's default query or theme, edit the following files:

- `app/src/main/assets/analyzer/index.html`
- `app/src/main/assets/analyzer/styles.css`
- `app/src/main/assets/analyzer/app.js`

## Quick Start

```bash
git clone https://github.com/yy1453029-cmd/github-iptv-analyzer.git
cd github-iptv-analyzer
./gradlew assembleDebug
```

Then install the generated APK on your Android device.
