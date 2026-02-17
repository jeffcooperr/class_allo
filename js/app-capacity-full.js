/**
 * University Course Schedule Visualization - Room-Based Capacity (Full View)
 * 
 * This is a standalone version of the capacity visualization from story.html
 */

// Global state
let courseData = [];
let selectedDay = 'W'; // Default to Wednesday
let selectedTime = 720; // Default to 12:00 PM
let map = null;
let classroomMarkers = [];
let buildingPolygons = [];
let currentTileLayer = null; // Current tile layer instance
let isDarkTheme = false; // Track current theme
const BASE_ICON_SIZE = 10;
let minTime = 0; // Minimum class start time (will be calculated from data)
let maxTime = 1440; // Maximum class end time (will be calculated from data)

// Building coordinates are loaded from js/building-coordinates.js
// (loaded via script tag in HTML before this file)

/**
 * Initialize the application
 */
async function init() {
    try {
        // Load course data
        const response = await fetch('data/2025_fall_cleaned.json');
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.statusText}`);
        }
        courseData = await response.json();
        console.log(`Loaded ${courseData.length} course meeting records`);

        // Calculate min and max times from course data
        calculateTimeRange();

        // Initialize map
        initMap();

        // Setup controls
        setupDaySelector();
        setupTimeSlider();
        setupThemeToggle();

        // Render initial visualization
        renderVisualization();

    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

/**
 * Initialize the Leaflet map
 */
function initMap() {
    // Define the four corner points (same as map02.html and story.html)
    const nw = [44.4788666, -73.1991804];
    const ne = [44.4774707, -73.1990634];
    const se = [44.4775079, -73.1971789];
    const sw = [44.4789095, -73.1972329];
    
    // Calculate center point from the corner points
    const allLats = [nw[0], ne[0], se[0], sw[0]];
    const allLngs = [nw[1], ne[1], se[1], sw[1]];
    
    const centerLat = (Math.min(...allLats) + Math.max(...allLats)) / 2;
    const centerLng = (Math.min(...allLngs) + Math.max(...allLngs)) / 2;
    const initialZoom = 19;

    // Initialize the map
    map = L.map('map-container', {
        minZoom: 14  // Prevent zooming out beyond level 14
    });

    // Set the initial view to center with zoom level 19
    map.setView([centerLat, centerLng], initialZoom);

    // Add OpenStreetMap tiles (default theme)
    currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add zoom event listener to update marker sizes and room number visibility
    map.on('zoomend', () => {
        renderVisualization();
    });

    console.log('Map initialized');
}

/**
 * Calculate the time range from course data
 */
function calculateTimeRange() {
    if (courseData.length === 0) {
        minTime = 0;
        maxTime = 1440;
        return;
    }

    const startTimes = courseData.map(c => c.start_minutes).filter(t => t != null);
    const endTimes = courseData.map(c => c.end_minutes).filter(t => t != null);

    if (startTimes.length > 0 && endTimes.length > 0) {
        minTime = Math.min(...startTimes);
        maxTime = Math.max(...endTimes);
        // Round down minTime and round up maxTime to nearest 15 minutes
        minTime = Math.floor(minTime / 15) * 15;
        maxTime = Math.ceil(maxTime / 15) * 15;
        // Ensure selectedTime is within range
        if (selectedTime < minTime) selectedTime = minTime;
        if (selectedTime > maxTime) selectedTime = maxTime;
    } else {
        minTime = 0;
        maxTime = 1440;
    }
}

/**
 * Set up the day selector buttons
 */
function setupDaySelector() {
    const days = [
        { code: 'M', label: 'Mon' },
        { code: 'T', label: 'Tue' },
        { code: 'W', label: 'Wed' },
        { code: 'R', label: 'Thu' },
        { code: 'F', label: 'Fri' }
    ];

    const container = document.getElementById('day-selector');
    if (!container) return;
    
    container.innerHTML = '<label class="control-label">Day:</label><div class="day-buttons"></div>';
    const buttonsContainer = container.querySelector('.day-buttons');

    days.forEach(day => {
        const button = document.createElement('button');
        button.textContent = day.label;
        button.className = 'day-button';
        button.dataset.day = day.code;

        if (day.code === selectedDay) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
            selectedDay = day.code;
            // Update button states
            buttonsContainer.querySelectorAll('.day-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');

            // Re-render visualization
            renderVisualization();
        });

        buttonsContainer.appendChild(button);
    });
}

/**
 * Set up the time slider
 */
function setupTimeSlider() {
    const container = document.getElementById('time-control');
    if (!container) return;
    
    container.innerHTML = `
        <label class="control-label">Time:</label>
        <div class="time-slider-container">
            <input type="range" id="time-slider" min="${minTime}" max="${maxTime}" value="${selectedTime}" step="15">
            <div class="time-display">
                <span id="time-display">${formatTime(selectedTime)}</span>
            </div>
        </div>
    `;

    const slider = document.getElementById('time-slider');
    const display = document.getElementById('time-display');

    if (slider && display) {
        slider.addEventListener('input', (e) => {
            selectedTime = parseInt(e.target.value);
            display.textContent = formatTime(selectedTime);
            renderVisualization();
        });
    }
}

/**
 * Format minutes since midnight to readable time string
 */
function formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const displayMins = mins.toString().padStart(2, '0');
    return `${displayHours}:${displayMins} ${period}`;
}

/**
 * Set up the theme toggle switch
 */
function setupThemeToggle() {
    const container = document.getElementById('theme-toggle');
    if (!container) return;

    container.innerHTML = `
        <label class="control-label">Theme:</label>
        <div class="theme-switch-container">
            <span class="theme-switch-label">Light</span>
            <label class="theme-switch">
                <input type="checkbox" id="theme-switch-input">
                <span class="theme-slider"></span>
            </label>
            <span class="theme-switch-label">Dark</span>
        </div>
    `;

    const switchInput = document.getElementById('theme-switch-input');
    if (switchInput) {
        switchInput.addEventListener('change', () => {
            toggleMapTheme();
        });
    }
}

/**
 * Toggle between OpenStreetMap and Jawg.Dark themes
 */
function toggleMapTheme() {
    if (!map) return;

    // Remove current tile layer
    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }

    // Switch theme
    isDarkTheme = !isDarkTheme;

    if (isDarkTheme) {
        // Switch to Jawg.Dark theme (from story.html)
        currentTileLayer = L.tileLayer(`https://tile.jawg.io/jawg-dark/{z}/{x}/{y}.png?access-token=${JAWG_API_KEY}`, {
            attribution: '© <a href="https://jawg.io">Jawg</a>',
            maxZoom: 19
        }).addTo(map);
    } else {
        // Switch to OpenStreetMap theme (default)
        currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(map);
    }

    // Update switch state
    const switchInput = document.getElementById('theme-switch-input');
    if (switchInput) {
        switchInput.checked = isDarkTheme;
    }

    console.log(`Switched to ${isDarkTheme ? 'Dark' : 'Light'} theme`);
}

/**
 * Filter course data based on selected day and time
 */
function filterCourses() {
    return courseData.filter(course => {
        // Match selected day
        if (course.day !== selectedDay) {
            return false;
        }

        // Check if selected time falls within course time range
        return selectedTime >= course.start_minutes && selectedTime <= course.end_minutes;
    });
}

/**
 * Get all unique classrooms grouped by building
 */
function getAllClassroomsByBuilding() {
    const classrooms = {};
    courseData.forEach(course => {
        const building = course.building;
        const room = course.room;
        if (building && room) {
            if (!classrooms[building]) {
                classrooms[building] = new Set();
            }
            classrooms[building].add(room);
        }
    });

    const result = {};
    Object.keys(classrooms).forEach(building => {
        result[building] = Array.from(classrooms[building]).sort((a, b) => {
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
    });
    return result;
}

/**
 * Get set of classrooms that are currently in use
 */
function getInUseClassrooms(activeCourses) {
    const inUse = {};
    activeCourses.forEach(course => {
        const building = course.building;
        const room = course.room;
        if (building && room) {
            if (!inUse[building]) {
                inUse[building] = new Set();
            }
            inUse[building].add(room);
        }
    });
    return inUse;
}

/**
 * Get courses for a specific building and room
 */
function getCoursesForRoom(activeCourses, building, room) {
    return activeCourses.filter(course =>
        course.building === building && course.room === room
    );
}

/**
 * Calculate bounding box from building corners
 */
function getBuildingBounds(corners) {
    const lats = corners.map(c => c[0]);
    const lngs = corners.map(c => c[1]);
    return {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs)
    };
}

/**
 * Get building rotation angle
 */
function getBuildingRotation(buildingData) {
    return buildingData.config?.rotation ?? 0;
}

/**
 * Calculate icon size based on current zoom level
 */
function getIconSize() {
    if (!map) return BASE_ICON_SIZE;
    const currentZoom = map.getZoom();
    const baseZoom = 17;
    const scaleFactor = Math.pow(2, currentZoom - baseZoom);
    return BASE_ICON_SIZE * scaleFactor;
}

/**
 * Calculate position for a classroom box within building bounds
 */
function calculateClassroomPosition(bounds, corners, index, totalRooms, buildingConfig) {
    const cols = buildingConfig?.gridCols ?? 3;
    const padding = buildingConfig?.padding ?? 0.3;
    const rows = Math.ceil(totalRooms / cols);

    const row = Math.floor(index / cols);
    const col = index % cols;

    const nw = corners[0];
    const ne = corners[1];
    const se = corners[2];
    const sw = corners[3];

    const width = Math.sqrt(
        Math.pow(ne[0] - nw[0], 2) + Math.pow(ne[1] - nw[1], 2)
    );
    const height = Math.sqrt(
        Math.pow(sw[0] - nw[0], 2) + Math.pow(sw[1] - nw[1], 2)
    );

    const usableWidth = width * (1 - padding);
    const usableHeight = height * (1 - padding);

    const localX = (col / Math.max(1, cols - 1)) * usableWidth;
    const localY = (row / Math.max(1, rows - 1)) * usableHeight;

    const paddedX = localX + (width * padding / 2);
    const paddedY = localY + (height * padding / 2);

    const widthVec = [
        (ne[0] - nw[0]) / width,
        (ne[1] - nw[1]) / width
    ];
    const heightVec = [
        (sw[0] - nw[0]) / height,
        (sw[1] - nw[1]) / height
    ];

    const lat = nw[0] + paddedX * widthVec[0] + paddedY * heightVec[0];
    const lng = nw[1] + paddedX * widthVec[1] + paddedY * heightVec[1];

    return { lat, lng };
}

/**
 * Render the capacity-based visualization on the map
 */
function renderVisualization() {
    if (!map) {
        console.error('Map not initialized');
        return;
    }

    // Clear existing markers and polygons
    classroomMarkers.forEach(marker => map.removeLayer(marker));
    classroomMarkers = [];
    buildingPolygons.forEach(polygon => map.removeLayer(polygon));
    buildingPolygons = [];

    // Filter courses based on current selections
    const filteredCourses = filterCourses();

    // Get all classrooms by building
    const allClassrooms = getAllClassroomsByBuilding();

    // Get which classrooms are currently in use
    const inUseClassrooms = getInUseClassrooms(filteredCourses);

    // Render buildings
    Object.keys(buildingCoordinates).forEach(buildingName => {
        const buildingData = buildingCoordinates[buildingName];
        if (!buildingData.corners || !allClassrooms[buildingName]) {
            return;
        }

        // Draw building outline
        const polygon = L.polygon(buildingData.corners, {
            color: 'transparent',
            fillColor: 'transparent',
            fillOpacity: 0.3,
            weight: 2
        }).addTo(map);
        buildingPolygons.push(polygon);

        // Get building bounds for positioning classrooms
        const bounds = getBuildingBounds(buildingData.corners);
        const buildingRotation = getBuildingRotation(buildingData);
        const buildingConfig = buildingData.config || {};
        const rooms = allClassrooms[buildingName];
        const inUse = inUseClassrooms[buildingName] || new Set();

        // Position classrooms inside the building
        rooms.forEach((room, index) => {
            const isInUse = inUse.has(room);
            const coursesInRoom = getCoursesForRoom(filteredCourses, buildingName, room);

            // Build tooltip content
            let tooltipContent = '';
            if (coursesInRoom.length > 0) {
                tooltipContent = coursesInRoom.map(course => {
                    const startTime = formatTime(course.start_minutes);
                    const endTime = formatTime(course.end_minutes);
                    const courseCode = (course.course || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                    const courseTitle = (course.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                    const capacityNote = course.capacity_from_csv === false ? '<br><em style="font-size: 0.9em; color: #666;">(Estimated capacity)</em>' : '';
                    return `${courseCode} - ${courseTitle}<br>${startTime} - ${endTime}${capacityNote}`;
                }).join('<br><br>');
            } else {
                tooltipContent = 'Available';
            }

            // Get capacity for this room (from any course that uses this room)
            let roomCapacity = null;
            let isHypotheticalCapacity = false;
            const roomCourse = courseData.find(course => 
                course.building === buildingName && 
                course.room === room && 
                course.capacity !== null && 
                course.capacity !== undefined
            );
            if (roomCourse) {
                roomCapacity = roomCourse.capacity;
                isHypotheticalCapacity = !roomCourse.capacity_from_csv;
            }

            // Build enrollment display using capacity
            let enrollmentDisplay = '';
            let isOverCapacity = false;
            let isAtOrOverCapacity = false;
            if (coursesInRoom.length > 0) {
                const firstCourse = coursesInRoom[0];
                if (firstCourse.current_enrollment !== null && firstCourse.current_enrollment !== undefined &&
                    firstCourse.capacity !== null && firstCourse.capacity !== undefined) {
                    enrollmentDisplay = `<div class="classroom-enrollment">${firstCourse.current_enrollment}/${firstCourse.capacity}</div>`;
                    // Check if class is over capacity
                    isOverCapacity = firstCourse.current_enrollment > firstCourse.capacity;
                    // Check if at or over capacity for border
                    isAtOrOverCapacity = firstCourse.current_enrollment >= firstCourse.capacity;
                    // Update hypothetical capacity flag from the course
                    if (firstCourse.capacity_from_csv === false) {
                        isHypotheticalCapacity = true;
                    }
                }
            } else if (roomCapacity !== null) {
                // Show capacity for available rooms
                enrollmentDisplay = `<div class="classroom-enrollment">0/${roomCapacity}</div>`;
            }

            // Update tooltip if capacity is hypothetical and room is available
            if (coursesInRoom.length === 0 && isHypotheticalCapacity) {
                tooltipContent += '<br><em style="font-size: 0.9em; color: #666;">(Estimated capacity)</em>';
            }

            // Calculate position within building bounds using building config
            const position = calculateClassroomPosition(bounds, buildingData.corners, index, rooms.length, buildingConfig);

            // Check if we're at max zoom to show room numbers
            const currentZoom = map.getZoom();
            const maxZoom = 19;
            const showRoomNumber = currentZoom === maxZoom;
            
            // Create HTML for classroom box with rotation
            // Use yellow for over-capacity classes, red for in-use but not over-capacity, green for available
            let statusClass = 'classroom-available';
            if (isInUse) {
                statusClass = isOverCapacity ? 'classroom-over-capacity' : 'classroom-in-use';
            }
            // Add border class if at or over capacity
            const borderClass = isAtOrOverCapacity ? 'classroom-at-capacity-border' : '';
            // Add hypothetical class if capacity is estimated
            const hypotheticalClass = isHypotheticalCapacity ? 'classroom-hypothetical-capacity' : '';
            const classroomHtml = `
                <div class="classroom-cell ${statusClass} ${borderClass} ${hypotheticalClass}"
                     data-building="${buildingName}"
                     data-room="${room}"
                     style="transform: rotate(${buildingRotation}deg); position: relative;"
                     title="${tooltipContent.replace(/"/g, '&quot;')}">
                    <div class="classroom-content">
                        ${showRoomNumber ? `<div class="classroom-number">${room}</div>` : ''}
                        ${showRoomNumber ? enrollmentDisplay : ''}
                    </div>
                </div>
            `;

            // Create custom icon with the classroom box
            const iconSize = getIconSize();
            const halfSize = iconSize / 2;
            const icon = L.divIcon({
                className: 'classroom-marker',
                html: classroomHtml,
                iconSize: [iconSize, iconSize],
                iconAnchor: [halfSize, halfSize]
            });

            // Create marker at calculated position
            const marker = L.marker([position.lat, position.lng], { icon: icon });

            // Add popup with course info
            if (tooltipContent) {
                marker.bindPopup(tooltipContent);
            }

            marker.addTo(map);
            classroomMarkers.push(marker);
        });
    });

    console.log(`Rendered ${classroomMarkers.length} classroom markers`);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

