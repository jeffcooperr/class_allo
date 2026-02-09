/**
 * University Course Schedule Visualization - Map View
 *
 * This application visualizes university course schedules on a campus map.
 * Data is loaded from the cleaned JSON file and filtered by day and time selection.
 */

// Global state
let courseData = [];
let selectedDay = 'M';
let selectedTime = 480; // 8:00 AM in minutes (default)
let map = null; // Leaflet map instance
let classroomMarkers = []; // Array to store classroom markers for cleanup
let buildingPolygons = []; // Array to store building outline polygons
const BASE_ICON_SIZE = 10; // Base size for classroom icons

// Building coordinates mapping
const buildingCoordinates = {
    'LAFAYE': {
        corners: [
            [44.47821957097365, -73.19871759894683],  // NW
            [44.478246218542466, -73.1982782247623],    // NE
            [44.47769288711595, -73.19818595618355],   // SE
            [44.47765369913891, -73.19862972410992]   // SW
        ],
        // Calculate center point from corners
        get center() {
            const lats = this.corners.map(c => c[0]);
            const lngs = this.corners.map(c => c[1]);
            return {
                lat: (Math.min(...lats) + Math.max(...lats)) / 2,
                lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
            };
        }
    }
    // Add more buildings here as needed
};

/**
 * Initialize the application
 */
async function init() {
    try {
        // Load course data
        const response = await fetch('2025_fall_cleaned.json');
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.statusText}`);
        }
        courseData = await response.json();
        console.log(`Loaded ${courseData.length} course meeting records`);

        // Initialize map first
        initMap();

        // Initialize UI components
        setupDaySelector();
        setupTimeSlider();

        // Render initial visualization
        renderVisualization();

    } catch (error) {
        console.error('Error initializing app:', error);
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.innerHTML = `<p class="error">Error loading data: ${error.message}</p>`;
        }
    }
}

/**
 * Initialize the Leaflet map
 */
function initMap() {
    // Campus center coordinates
    const campusCenterLat = 44.47798293916087;  // Campus latitude
    const campusCenterLng = -73.19652807301023; // Campus longitude
    const initialZoom = 17; // Zoom level (higher = more zoomed in)

    // Initialize the map
    map = L.map('map-container').setView([campusCenterLat, campusCenterLng], initialZoom);

    // Add OpenStreetMap tiles (free, no API key needed)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add zoom event listener to update marker sizes and room number visibility
    map.on('zoomend', () => {
        // Re-render to update marker sizes and room number visibility
        renderVisualization();
    });

    console.log('Map initialized');
}

/**
 * Set up the day selector buttons
 */
function setupDaySelector() {
    const days = [
        { code: 'M', label: 'Monday' },
        { code: 'T', label: 'Tuesday' },
        { code: 'W', label: 'Wednesday' },
        { code: 'R', label: 'Thursday' },
        { code: 'F', label: 'Friday' }
    ];

    const container = document.getElementById('day-selector');
    container.innerHTML = '<label class="control-label">Select Day:</label><div class="day-buttons"></div>';
    const buttonsContainer = container.querySelector('.day-buttons');

    days.forEach(day => {
        const button = document.createElement('button');
        button.textContent = `${day.label} (${day.code})`;
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
    container.innerHTML = `
        <label class="control-label">Select Time:</label>
        <div class="time-slider-container">
            <input type="range" id="time-slider" min="0" max="1440" value="${selectedTime}" step="15">
            <div class="time-display">
                <span id="time-display">${formatTime(selectedTime)}</span>
            </div>
        </div>
    `;

    const slider = document.getElementById('time-slider');
    const display = document.getElementById('time-display');

    slider.addEventListener('input', (e) => {
        selectedTime = parseInt(e.target.value);
        display.textContent = formatTime(selectedTime);
        renderVisualization();
    });
}

/**
 * Format minutes since midnight to readable time string
 * @param {number} minutes - Minutes since midnight
 * @returns {string} Formatted time (e.g., "8:00 AM")
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
 * Filter course data based on selected day and time
 * @returns {Array} Filtered course records
 */
function filterCourses() {
    return courseData.filter(course => {
        // Match selected day
        if (course.day !== selectedDay) {
            return false;
        }

        // Check if selected time falls within course time range
        // A course is "active" if the selected time is between start and end
        return selectedTime >= course.start_minutes && selectedTime <= course.end_minutes;
    });
}

/**
 * Get all unique classrooms grouped by building from the full course data
 * @returns {Object} Object with building names as keys and arrays of unique room numbers as values
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

    // Convert Sets to sorted arrays
    const result = {};
    Object.keys(classrooms).forEach(building => {
        result[building] = Array.from(classrooms[building]).sort((a, b) => {
            // Sort naturally (e.g., "101" < "102" < "201")
            return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });
    });
    return result;
}

/**
 * Get set of classrooms that are currently in use
 * @param {Array} activeCourses - Array of courses active at selected time
 * @returns {Object} Object with building names as keys and Sets of room numbers as values
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
 * Get courses for a specific building and room at the selected time
 * @param {Array} activeCourses - Array of courses active at selected time
 * @param {string} building - Building name
 * @param {string} room - Room number
 * @returns {Array} Array of courses in that room
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
 * Calculate building rotation angle in degrees
 * Uses the angle from NW to NE corner to determine building orientation
 */
function getBuildingRotation(corners) {
    return -6;
}


/**
 * Calculate icon size based on current zoom level
 * Icons scale proportionally with zoom to maintain relative size on map
 */
function getIconSize() {
    if (!map) return BASE_ICON_SIZE;
    const currentZoom = map.getZoom();
    const baseZoom = 17; // Initial zoom level
    // Scale factor: each zoom level doubles/halves the scale
    const scaleFactor = Math.pow(2, currentZoom - baseZoom);
    return BASE_ICON_SIZE * scaleFactor;
}

/**
 * Update all classroom marker sizes based on current zoom level
 */
function updateMarkerSizes() {
    if (!map || classroomMarkers.length === 0) return;
    
    const iconSize = getIconSize();
    const halfSize = iconSize / 2;
    
    classroomMarkers.forEach(marker => {
        const oldIcon = marker.options.icon;
        if (!oldIcon) return;
        
        // Get the HTML from the existing icon
        const html = oldIcon.options.html;
        
        // Create new icon with updated size
        const newIcon = L.divIcon({
            className: 'classroom-marker',
            html: html,
            iconSize: [iconSize, iconSize],
            iconAnchor: [halfSize, halfSize]
        });
        
        marker.setIcon(newIcon);
    });
}

/**
 * Calculate position for a classroom box within building bounds
 */
function calculateClassroomPosition(bounds, corners, index, totalRooms, rotation) {
    // Calculate grid dimensions (aim for roughly square grid)
    const cols = 4;
    const rows = Math.ceil(totalRooms / cols);

    const row = Math.floor(index / cols);
    const col = index % cols;

    // Get building corners
    const nw = corners[0]; // NW
    const ne = corners[1]; // NE
    const se = corners[2]; // SE
    const sw = corners[3]; // SW

    // Calculate building dimensions in rotated coordinate system
    // Distance from NW to NE (width)
    const width = Math.sqrt(
        Math.pow(ne[0] - nw[0], 2) + Math.pow(ne[1] - nw[1], 2)
    );
    // Distance from NW to SW (height)
    const height = Math.sqrt(
        Math.pow(sw[0] - nw[0], 2) + Math.pow(sw[1] - nw[1], 2)
    );

    // Leave some padding from edges
    const padding = 0.3; // 30% padding
    const usableWidth = width * (1 - padding);
    const usableHeight = height * (1 - padding);

    // Calculate position in building's local coordinate system (0,0 at NW corner)
    // x goes from NW to NE, y goes from NW to SW
    const localX = (col / Math.max(1, cols - 1)) * usableWidth;
    const localY = (row / Math.max(1, rows - 1)) * usableHeight;

    // Add padding offset
    const paddedX = localX + (width * padding / 2);
    const paddedY = localY + (height * padding / 2);

    // Convert from local coordinates to lat/lng
    // Vector from NW to NE (normalized)
    const widthVec = [
        (ne[0] - nw[0]) / width,
        (ne[1] - nw[1]) / width
    ];
    // Vector from NW to SW (normalized)
    const heightVec = [
        (sw[0] - nw[0]) / height,
        (sw[1] - nw[1]) / height
    ];

    // Calculate final position: NW + x * widthVec + y * heightVec
    const lat = nw[0] + paddedX * widthVec[0] + paddedY * heightVec[0];
    const lng = nw[1] + paddedX * widthVec[1] + paddedY * heightVec[1];

    return { lat, lng };
}

/**
 * Render the main visualization on the map
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

    // Filter courses based on current selections (these are the active courses)
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
            color: '#3498db',
            fillColor: '#ecf0f1',
            fillOpacity: 0.3,
            weight: 2
        }).addTo(map);
        buildingPolygons.push(polygon);

        // Get building bounds for positioning classrooms
        const bounds = getBuildingBounds(buildingData.corners);
        const buildingRotation = getBuildingRotation(buildingData.corners);
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
                    return `${courseCode} - ${courseTitle}<br>${startTime} - ${endTime}`;
                }).join('<br><br>');
            } else {
                tooltipContent = 'Available';
            }

            // Build enrollment display
            let enrollmentDisplay = '';
            if (coursesInRoom.length > 0) {
                const firstCourse = coursesInRoom[0];
                if (firstCourse.current_enrollment !== null && firstCourse.current_enrollment !== undefined &&
                    firstCourse.max_enrollment !== null && firstCourse.max_enrollment !== undefined) {
                    enrollmentDisplay = `<div class="classroom-enrollment">${firstCourse.current_enrollment}/${firstCourse.max_enrollment}</div>`;
                }
            }

            // Calculate position within building bounds
            const position = calculateClassroomPosition(bounds, buildingData.corners, index, rooms.length, buildingRotation);

            // Check if we're at max zoom to show room numbers
            const currentZoom = map.getZoom();
            const maxZoom = 19;
            const showRoomNumber = currentZoom === maxZoom;
            
            // Create HTML for classroom box with rotation
            const statusClass = isInUse ? 'classroom-in-use' : 'classroom-available';
            const classroomHtml = `
                <div class="classroom-cell ${statusClass}"
                     data-building="${buildingName}"
                     data-room="${room}"
                     style="transform: rotate(${buildingRotation}deg);"
                     title="${tooltipContent.replace(/"/g, '&quot;')}">
                    <div class="classroom-content">
                        ${showRoomNumber ? `<div class="classroom-number">${room}</div>` : ''}
                        ${enrollmentDisplay}
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
