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
    'LAFAYE': {  // U/D, L/R
                // Further left is 
        corners: [
            [44.47828, -73.19863],  // NW
            [44.47831, -73.19829],    // NE
            [44.4776, -73.19818],   // SE
            [44.47757, -73.19853]   // SW
        ],
        // Building-specific configuration
        config: {
            rotation: -6,        // Rotation angle in degrees
            gridCols: 3,         // Number of columns for classroom grid
            padding: 0.3         // Padding percentage (30% from edges)
        },
        // Calculate center point from corners
        get center() {
            const lats = this.corners.map(c => c[0]);
            const lngs = this.corners.map(c => c[1]);
            return {
                lat: (Math.min(...lats) + Math.max(...lats)) / 2,
                lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
            };
        }
    },

    'AIKEN': {
        corners: [
            [44.47597, -73.195399],   // NW
            [44.47597, -73.1951],    // NE
            [44.4758623, -73.1951],  // SE
            [44.4758597, -73.195399],  // SW
        ],
        
        config: {
            rotation: 0,
            gridCols: 3,
            padding: 0.3
        },
    },

    'JEFFRD': {
        corners: [[44.4755743, -73.194024],  // NW
        [44.4754824, -73.1937439],    // NE
        [44.4751534, -73.1939514],   // SE
        [44.4752473, -73.1942352]   // SW
        ],
        config: {
            rotation: 25,
            gridCols: 3,
            padding: 0.3
        },
    },

    'BLLNGS': {
        corners: [
            [44.4802999, -73.1989],  // NW
            [44.4803126, -73.1988639],    // NE
            [44.4801614, -73.1988329],   // SE
            [44.4801475, -73.1989]   // SW
        ],
        config: {
            rotation: 0,
            gridCols: 1,
            padding: 0.3
        }
    },

    'L/L-A': {
        corners: [
            [44.473485, -73.194313],  // NW
            [44.473485, -73.19416],    // NE
            [44.4733591, -73.19416],   // SE
            [44.4733608, -73.194313]   // SW
        ],
        config: {
            rotation: 0,
            gridCols: 2,
            padding: 0.3
        }
    },

    'PLB': {
        corners: [
            [44.4771964, -73.19479],  // NW
            [44.4771972, -73.1946677],    // NE
            [44.4767183, -73.1945845],   // SE
            [44.4767026, -73.1947]   // SW
        ],
        config: {
            rotation: -6,
            gridCols: 1,
            padding: 0.3
        }
    },

    'ML SCI': {
        corners: [
            [44.4770436, -73.1956828],  // NW
            [44.4770603, -73.1954961],    // NE
            [44.4764931, -73.19549992],   // SE
            [44.4764774, -73.1955803]   // SW
        ],
        config: {
            rotation: -6,
            gridCols: 2,
            padding: 0.3
        }
    },

    'WATERM': {
        corners: [
            [44.4785185, -73.201282],  // NW
            [44.4785032, -73.2009602],    // NE
            [44.4780197, -73.2009848],   // SE
            [44.478033, -73.2013048]   // SW
        ],
        config: {
            rotation: 3,
            gridCols: 3,
            padding: 0.3
        }
    },

    'MORRIL': {
        corners: [
            [44.476715, -73.1984686],  // NW
            [44.476715, -73.1983426],    // NE
            [44.4765061, -73.1983012],   // SE
            [44.4764966, -73.1984284]   // SW
        ],
        config: {
            rotation: -6,
            gridCols: 1,
            padding: 0.3
        }
    },

    'L/L-B': {
        corners: [
            [44.47393, -73.1944047],  // NW
            [44.47393, -73.194214],    // NE
            [44.4738672, -73.1941867],   // SE
            [44.4738521, -73.1943831]   // SW
        ],
        config: {
            rotation: 0,
            gridCols: 2,
            padding: 0.3
        }
    }
    // Add more buildings here as needed
    // Example:
    // 'BUILDING2': {
    //     corners: [...],
    //     config: {
    //         rotation: 15,
    //         gridCols: 4,
    //         padding: 0.25
    //     }
    // }
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
 * @param {Object} buildingData - Building data object with config
 * @returns {number} Rotation angle in degrees
 */
function getBuildingRotation(buildingData) {
    return buildingData.config?.rotation ?? 0;
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
 * @param {Object} bounds - Building bounds
 * @param {Array} corners - Building corner coordinates
 * @param {number} index - Classroom index in the list
 * @param {number} totalRooms - Total number of rooms in building
 * @param {Object} buildingConfig - Building configuration (rotation, gridCols, padding)
 * @returns {Object} Position object with lat and lng
 */
function calculateClassroomPosition(bounds, corners, index, totalRooms, buildingConfig) {
    // Get grid configuration from building config, with defaults
    const cols = buildingConfig?.gridCols ?? 3;
    const padding = buildingConfig?.padding ?? 0.3;
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
            fillColor: 'transparent', // #ecf0f1
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

            // Calculate position within building bounds using building config
            const position = calculateClassroomPosition(bounds, buildingData.corners, index, rooms.length, buildingConfig);

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
