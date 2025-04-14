# AttendanceClient - Electron Application

An attendance management application built with Electron, React, and Material UI. The application provides a user-friendly interface for tracking employee attendance with fullscreen display mode.

## Features

- Fullscreen display mode for optimal attendance monitoring
- Responsive design that adapts to different screen sizes
- Server configuration interface for connecting to the attendance backend
- Real-time attendance tracking with fingerprint scanner support
- Tray icon for easy access and application management

## Setup and Installation

### Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher
- Electron 29.x

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/AttendanceElectron.git
cd AttendanceElectron/AttendanceClient
```

2. Install dependencies:
```bash
npm install
```

3. Set up the configuration:
   - Configure the server IP address through the application interface or by modifying the config file

## Running the Application

### Development Mode

To run the application in development mode:

```bash
npm start
```

This will start the application with DevTools open and hot reloading enabled.

### Production Mode with Fullscreen

To run the application in production mode with fullscreen enabled:

```bash
npm run fullscreen
```

This will build the application in production mode and start it in fullscreen.

## Keyboard Shortcuts

- `F11`: Toggle fullscreen mode
- `Alt+F4`: Quit the application (Windows)
- `Cmd+Q`: Quit the application (Mac)

## Packaging the Application

To create a distributable package:

```bash
npm run make
```

This will generate platform-specific packages in the `out` directory.

## Architecture

The application consists of:

- `index.js`: Main Electron process that manages window creation and lifecycle
- `preload.js`: Bridge between Electron and React processes
- React components for UI
- Material UI for styling
- Electron IPC for communication between processes

## Fullscreen Implementation

The application is designed to run in fullscreen mode by default. It includes:

1. Automatic fullscreen activation on startup
2. Auto-recovery if fullscreen mode is exited
3. User notifications with a simple way to return to fullscreen mode
4. Responsive layout that adapts to the fullscreen view

The fullscreen implementation ensures that the application provides an optimal attendance monitoring experience with maximum screen real estate utilization.

## License

MIT 