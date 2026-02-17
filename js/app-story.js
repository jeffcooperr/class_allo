/**
 * University Course Schedule Visualization - Story/Landing Page
 * 
 * This version displays the map as a background that automatically cycles
 * through different times of day. The map is non-interactive and has reduced opacity.
 */

// Global state
let courseData = [];
let selectedDay = 'M'; // Fixed to Monday for consistency
let selectedTime = 480; // Start at 8:00 AM
let map = null;
let interactiveMap = null; // Interactive map at bottom of section 5
let capacityMap = null; // Interactive map for capacity section
let classroomMarkers = [];
let buildingPolygons = [];
let interactiveClassroomMarkers = []; // Markers for interactive map
let interactiveBuildingPolygons = []; // Polygons for interactive map
let capacityClassroomMarkers = []; // Markers for capacity map
let capacityBuildingPolygons = []; // Polygons for capacity map
let interactiveSelectedDay = 'W'; // Day for interactive map (Wednesday)
let interactiveSelectedTime = 720; // Time for interactive map (12:00 PM)
let capacitySelectedDay = 'W'; // Day for capacity map
let capacitySelectedTime = 720; // Time for capacity map
const BASE_ICON_SIZE = 10;
let minTime = 0; // Minimum class start time (will be calculated from data)
let maxTime = 1440; // Maximum class end time (will be calculated from data)

// Time cycling configuration
const TIME_CYCLE_INTERVAL = 1000; // Change time every 1 second
const TIME_STEP = 30; // Step by 30 minutes each cycle
const MIN_TIME = 480; // 8:00 AM
const MAX_TIME = 1020; // 5:00 PM (17:00)
let timeCycleInterval = null;
let isInVizSection = false;

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

        // Initialize background map
        initMap();

        // Calculate min and max times from course data
        calculateTimeRange();

        // Initialize interactive map
        initInteractiveMap();

        // Initialize capacity map
        initCapacityMap();

        // Setup interactive map controls
        setupInteractiveDaySelector();
        setupInteractiveTimeSlider();

        // Setup capacity map controls
        setupCapacityDaySelector();
        setupCapacityTimeSlider();

        // Render initial visualization
        renderVisualization();
        
        // Render initial interactive map
        renderInteractiveVisualization();

        // Render initial capacity map
        renderCapacityVisualization();

        // Start time cycling
        startTimeCycle();

        // Populate dataset section
        await populateDatasetSection();

        // Populate insights section
        populateInsightsSection();

        // Setup scroll observers
        setupScrollObservers();

    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

/**
 * Initialize the Leaflet map (non-interactive)
 */
function initMap() {
    const campusCenterLat = 44.47798293916087;
    const campusCenterLng = -73.19652807301023;
    const initialZoom = 18; // Zoomed in one more level

    // Initialize the map
    map = L.map('map-container', {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false
    }).setView([campusCenterLat, campusCenterLng], initialZoom);

    // Add Jawg.Dark tiles
    // Note: Jawg requires an API key. Get one free at https://www.jawg.io/
    // Replace 'YOUR_JAWG_API_KEY' below with your actual API key
    L.tileLayer(`https://tile.jawg.io/jawg-dark/{z}/{x}/{y}.png?access-token=${JAWG_API_KEY}`, {
        attribution: '© <a href="https://jawg.io">Jawg</a>',
        maxZoom: 22
    }).addTo(map);

    console.log('Map initialized (non-interactive)');
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
        if (interactiveSelectedTime < minTime) interactiveSelectedTime = minTime;
        if (interactiveSelectedTime > maxTime) interactiveSelectedTime = maxTime;
    } else {
        minTime = 0;
        maxTime = 1440;
    }
}

/**
 * Initialize the interactive Leaflet map at bottom of section 5
 */
function initInteractiveMap() {
    // Define the four corner points (same as map01.html)
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

    // Initialize the interactive map
    interactiveMap = L.map('map-container-interactive', {
        minZoom: 14  // Prevent zooming out beyond level 14
    });

    // Set the initial view to center with zoom level 19
    interactiveMap.setView([centerLat, centerLng], initialZoom);

    // Add OpenStreetMap tiles (like in map01.html)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(interactiveMap);

    // Add zoom event listener to update marker sizes and room number visibility
    interactiveMap.on('zoomend', () => {
        renderInteractiveVisualization();
    });

    console.log('Interactive map initialized');
}

/**
 * Set up the day selector buttons for interactive map
 */
function setupInteractiveDaySelector() {
    const days = [
        { code: 'M', label: 'Mon' },
        { code: 'T', label: 'Tue' },
        { code: 'W', label: 'Wed' },
        { code: 'R', label: 'Thu' },
        { code: 'F', label: 'Fri' }
    ];

    const container = document.getElementById('day-selector-interactive');
    if (!container) return;
    
    container.innerHTML = '<label class="control-label">Day:</label><div class="day-buttons"></div>';
    const buttonsContainer = container.querySelector('.day-buttons');

    days.forEach(day => {
        const button = document.createElement('button');
        button.textContent = day.label;
        button.className = 'day-button';
        button.dataset.day = day.code;

        if (day.code === interactiveSelectedDay) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
            interactiveSelectedDay = day.code;
            // Update button states
            buttonsContainer.querySelectorAll('.day-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');

            // Re-render interactive visualization
            renderInteractiveVisualization();
        });

        buttonsContainer.appendChild(button);
    });
}

/**
 * Set up the time slider for interactive map
 */
function setupInteractiveTimeSlider() {
    const container = document.getElementById('time-control-interactive');
    if (!container) return;
    
    container.innerHTML = `
        <label class="control-label">Time:</label>
        <div class="time-slider-container">
            <input type="range" id="time-slider-interactive" min="${minTime}" max="${maxTime}" value="${interactiveSelectedTime}" step="15">
            <div class="time-display">
                <span id="time-display-interactive">${formatTime(interactiveSelectedTime)}</span>
            </div>
        </div>
    `;

    const slider = document.getElementById('time-slider-interactive');
    const display = document.getElementById('time-display-interactive');

    if (slider && display) {
        slider.addEventListener('input', (e) => {
            interactiveSelectedTime = parseInt(e.target.value);
            display.textContent = formatTime(interactiveSelectedTime);
            renderInteractiveVisualization();
        });
    }
}

/**
 * Start automatic time cycling
 */
function startTimeCycle() {
    // Clear any existing interval
    if (timeCycleInterval) {
        clearInterval(timeCycleInterval);
    }
    
    timeCycleInterval = setInterval(() => {
        // Don't cycle time if we're in a visualization section
        if (isInVizSection) {
            return;
        }
        
        selectedTime += TIME_STEP;
        
        // Loop back to start time when we reach the end
        if (selectedTime > MAX_TIME) {
            selectedTime = MIN_TIME;
        }
        
        // Re-render visualization with new time
        renderVisualization();
    }, TIME_CYCLE_INTERVAL);
}

/**
 * Pause time cycling
 */
function pauseTimeCycle() {
    if (timeCycleInterval) {
        clearInterval(timeCycleInterval);
        timeCycleInterval = null;
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
 * Filter course data based on selected day and time
 */
function filterCourses() {
    return courseData.filter(course => {
        if (course.day !== selectedDay) {
            return false;
        }
        return selectedTime >= course.start_minutes && selectedTime <= course.end_minutes;
    });
}

/**
 * Filter course data for interactive map based on selected day and time
 */
function filterInteractiveCourses() {
    return courseData.filter(course => {
        if (course.day !== interactiveSelectedDay) {
            return false;
        }
        return interactiveSelectedTime >= course.start_minutes && interactiveSelectedTime <= course.end_minutes;
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
 * Calculate icon size for interactive map based on current zoom level
 */
function getInteractiveIconSize(mapInstance = null) {
    const mapToUse = mapInstance || interactiveMap;
    if (!mapToUse) return BASE_ICON_SIZE;
    const currentZoom = mapToUse.getZoom();
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

            // Build tooltip content (not used in story mode, but kept for consistency)
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

            // Calculate position within building bounds
            const position = calculateClassroomPosition(bounds, buildingData.corners, index, rooms.length, buildingConfig);

            // Don't show room numbers in story mode (always at background zoom)
            const showRoomNumber = false;
            
            // Create HTML for classroom box with rotation
            const statusClass = isInUse ? 'classroom-in-use' : 'classroom-available';
            const classroomHtml = `
                <div class="classroom-cell ${statusClass}"
                     data-building="${buildingName}"
                     data-room="${room}"
                     style="transform: rotate(${buildingRotation}deg);">
                    <div class="classroom-content">
                        ${showRoomNumber ? `<div class="classroom-number">${room}</div>` : ''}
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
            const marker = L.marker([position.lat, position.lng], { 
                icon: icon,
                interactive: false // Disable interaction
            });

            marker.addTo(map);
            classroomMarkers.push(marker);
        });
    });
}

/**
 * Render the interactive visualization on the interactive map
 */
function renderInteractiveVisualization() {
    if (!interactiveMap) {
        console.error('Interactive map not initialized');
        return;
    }

    // Clear existing markers and polygons
    interactiveClassroomMarkers.forEach(marker => interactiveMap.removeLayer(marker));
    interactiveClassroomMarkers = [];
    interactiveBuildingPolygons.forEach(polygon => interactiveMap.removeLayer(polygon));
    interactiveBuildingPolygons = [];

    // Filter courses based on current selections (these are the active courses)
    const filteredCourses = filterInteractiveCourses();

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
        }).addTo(interactiveMap);
        interactiveBuildingPolygons.push(polygon);

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
            let isOverCapacity = false;
            if (coursesInRoom.length > 0) {
                const firstCourse = coursesInRoom[0];
                if (firstCourse.current_enrollment !== null && firstCourse.current_enrollment !== undefined &&
                    firstCourse.max_enrollment !== null && firstCourse.max_enrollment !== undefined) {
                    enrollmentDisplay = `<div class="classroom-enrollment">${firstCourse.current_enrollment}/${firstCourse.max_enrollment}</div>`;
                    // Check if class is over capacity
                    isOverCapacity = firstCourse.current_enrollment > firstCourse.max_enrollment;
                }
            }

            // Calculate position within building bounds using building config
            const position = calculateClassroomPosition(bounds, buildingData.corners, index, rooms.length, buildingConfig);

            // Check if we're at max zoom to show room numbers
            const currentZoom = interactiveMap.getZoom();
            const maxZoom = 19;
            const showRoomNumber = currentZoom === maxZoom;
            
            // Create HTML for classroom box with rotation
            // Use yellow for over-capacity classes, red for in-use but not over-capacity, green for available
            let statusClass = 'classroom-available';
            if (isInUse) {
                statusClass = isOverCapacity ? 'classroom-over-capacity' : 'classroom-in-use';
            }
            const classroomHtml = `
                <div class="classroom-cell ${statusClass}"
                     data-building="${buildingName}"
                     data-room="${room}"
                     style="transform: rotate(${buildingRotation}deg);"
                     title="${tooltipContent.replace(/"/g, '&quot;')}">
                    <div class="classroom-content">
                        ${showRoomNumber ? `<div class="classroom-number">${room}</div>` : ''}
                        ${showRoomNumber ? enrollmentDisplay : ''}
                    </div>
                </div>
            `;

            // Create custom icon with the classroom box
            const iconSize = getInteractiveIconSize();
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

            marker.addTo(interactiveMap);
            interactiveClassroomMarkers.push(marker);
        });
    });

    console.log(`Rendered ${interactiveClassroomMarkers.length} classroom markers on interactive map`);
}

/**
 * Initialize the capacity-based Leaflet map
 */
function initCapacityMap() {
    // Define the four corner points (same as map02.html)
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

    // Initialize the capacity map
    capacityMap = L.map('map-container-capacity', {
        minZoom: 14  // Prevent zooming out beyond level 14
    });

    // Set the initial view to center with zoom level 19
    capacityMap.setView([centerLat, centerLng], initialZoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(capacityMap);

    // Add zoom event listener to update marker sizes and room number visibility
    capacityMap.on('zoomend', () => {
        renderCapacityVisualization();
    });

    console.log('Capacity map initialized');
}

/**
 * Set up the day selector buttons for capacity map
 */
function setupCapacityDaySelector() {
    const days = [
        { code: 'M', label: 'Mon' },
        { code: 'T', label: 'Tue' },
        { code: 'W', label: 'Wed' },
        { code: 'R', label: 'Thu' },
        { code: 'F', label: 'Fri' }
    ];

    const container = document.getElementById('day-selector-capacity');
    if (!container) return;
    
    container.innerHTML = '<label class="control-label">Day:</label><div class="day-buttons"></div>';
    const buttonsContainer = container.querySelector('.day-buttons');

    days.forEach(day => {
        const button = document.createElement('button');
        button.textContent = day.label;
        button.className = 'day-button';
        button.dataset.day = day.code;

        if (day.code === capacitySelectedDay) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
            capacitySelectedDay = day.code;
            // Update button states
            buttonsContainer.querySelectorAll('.day-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');

            // Re-render capacity visualization
            renderCapacityVisualization();
        });

        buttonsContainer.appendChild(button);
    });
}

/**
 * Set up the time slider for capacity map
 */
function setupCapacityTimeSlider() {
    const container = document.getElementById('time-control-capacity');
    if (!container) return;
    
    container.innerHTML = `
        <label class="control-label">Time:</label>
        <div class="time-slider-container">
            <input type="range" id="time-slider-capacity" min="${minTime}" max="${maxTime}" value="${capacitySelectedTime}" step="15">
            <div class="time-display">
                <span id="time-display-capacity">${formatTime(capacitySelectedTime)}</span>
            </div>
        </div>
    `;

    const slider = document.getElementById('time-slider-capacity');
    const display = document.getElementById('time-display-capacity');

    if (slider && display) {
        slider.addEventListener('input', (e) => {
            capacitySelectedTime = parseInt(e.target.value);
            display.textContent = formatTime(capacitySelectedTime);
            renderCapacityVisualization();
        });
    }
}

/**
 * Filter courses for capacity map based on selected day and time
 */
function filterCapacityCourses() {
    return courseData.filter(course => {
        // Match selected day
        if (course.day !== capacitySelectedDay) {
            return false;
        }

        // Check if selected time falls within course time range
        return capacitySelectedTime >= course.start_minutes && capacitySelectedTime <= course.end_minutes;
    });
}

/**
 * Render the capacity-based visualization on the capacity map
 */
function renderCapacityVisualization() {
    if (!capacityMap) {
        console.error('Capacity map not initialized');
        return;
    }

    // Clear existing markers and polygons
    capacityClassroomMarkers.forEach(marker => capacityMap.removeLayer(marker));
    capacityClassroomMarkers = [];
    capacityBuildingPolygons.forEach(polygon => capacityMap.removeLayer(polygon));
    capacityBuildingPolygons = [];

    // Filter courses based on current selections
    const filteredCourses = filterCapacityCourses();

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
        }).addTo(capacityMap);
        capacityBuildingPolygons.push(polygon);

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
            const currentZoom = capacityMap.getZoom();
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
            const iconSize = getInteractiveIconSize(capacityMap);
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

            marker.addTo(capacityMap);
            capacityClassroomMarkers.push(marker);
        });
    });

    console.log(`Rendered ${capacityClassroomMarkers.length} classroom markers on capacity map`);
}

/**
 * Calculate and display dataset statistics
 */
function calculateDatasetStats() {
    const totalMeetings = courseData.length;
    
    // Get unique buildings
    const buildings = new Set();
    courseData.forEach(course => {
        if (course.building) {
            buildings.add(course.building);
        }
    });
    
    // Get unique classrooms (building + room combination)
    const classrooms = new Set();
    courseData.forEach(course => {
        if (course.building && course.room) {
            classrooms.add(`${course.building}-${course.room}`);
        }
    });
    
    // Get unique courses (course code)
    const uniqueCourses = new Set();
    courseData.forEach(course => {
        if (course.course) {
            uniqueCourses.add(course.course);
        }
    });
    
    return {
        totalMeetings,
        totalBuildings: buildings.size,
        totalClassrooms: classrooms.size,
        totalUniqueCourses: uniqueCourses.size
    };
}

/**
 * Parse CSV text into an array of objects
 * Handles quoted fields that may contain commas
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    
    // Parse header
    const headerLine = lines[0];
    const headers = [];
    let currentHeader = '';
    let inQuotes = false;
    
    for (let i = 0; i < headerLine.length; i++) {
        const char = headerLine[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            headers.push(currentHeader.trim().replace(/^"|"$/g, ''));
            currentHeader = '';
        } else {
            currentHeader += char;
        }
    }
    headers.push(currentHeader.trim().replace(/^"|"$/g, '')); // Add last header
    
    // Parse data rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue; // Skip empty lines
        
        const values = [];
        let current = '';
        let inQuotes = false;
        
        // Handle quoted fields that may contain commas
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                // Check for escaped quotes ("")
                if (j + 1 < line.length && line[j + 1] === '"' && inQuotes) {
                    current += '"';
                    j++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim()); // Add last value
        
        // Ensure we have the right number of values (pad with empty strings if needed)
        while (values.length < headers.length) {
            values.push('');
        }
        
        // Create object from headers and values
        const row = {};
        headers.forEach((header, index) => {
            let value = values[index] || '';
            // Remove surrounding quotes if present
            if (value.startsWith('"') && value.endsWith('"') && value.length > 1) {
                value = value.slice(1, -1);
            }
            // Handle escaped quotes within the value
            value = value.replace(/""/g, '"');
            row[header] = value;
        });
        rows.push(row);
    }
    
    return rows;
}

/**
 * Format day string from CSV format (e.g., "M  W  F   " -> "M W F")
 */
function formatDayString(days) {
    if (!days) return 'N/A';
    // Remove extra spaces and return single letter days
    return days.trim().replace(/\s+/g, ' ').split(' ').filter(d => d.length > 0).join(' ') || 'N/A';
}

/**
 * Populate the dataset section with statistics and sample data
 */
async function populateDatasetSection() {
    const stats = calculateDatasetStats();
    
    // Update statistics
    document.getElementById('stat-courses').textContent = stats.totalMeetings.toLocaleString();
    document.getElementById('stat-buildings').textContent = stats.totalBuildings;
    document.getElementById('stat-classrooms').textContent = stats.totalClassrooms.toLocaleString();
    document.getElementById('stat-courses-unique').textContent = stats.totalUniqueCourses.toLocaleString();
    
    // Load CSV file for sample data
    try {
        const csvResponse = await fetch('data/2025 Fall.csv');
        if (!csvResponse.ok) {
            throw new Error(`Failed to load CSV: ${csvResponse.statusText}`);
        }
        const csvText = await csvResponse.text();
        const csvData = parseCSV(csvText);
        
        // Filter out rows with TBA times, empty buildings, or online courses
        const validRows = csvData.filter(row => {
            const startTime = row['Start Time']?.trim();
            const building = row['Bldg']?.trim();
            return startTime && 
                   startTime !== 'TBA' && 
                   building && 
                   building !== 'ONLINE' && 
                   building !== '' &&
                   row['Room']?.trim() !== 'SEE NOTES';
        });
        
        // Populate sample data table (show 5 random samples from CSV)
        const sampleSize = Math.min(5, validRows.length);
        const shuffled = [...validRows].sort(() => 0.5 - Math.random());
        const samples = shuffled.slice(0, sampleSize);
        
        const tbody = document.getElementById('sample-data-body');
        tbody.innerHTML = '';
        
        samples.forEach(row => {
            const tableRow = document.createElement('tr');
            
            // Helper function to safely get and display cell value
            const getValue = (key) => {
                const value = row[key];
                return value !== undefined && value !== null && value.trim() !== '' ? value.trim() : 'N/A';
            };
            
            // Populate all columns in the same order as the CSV header
            tableRow.innerHTML = `
                <td>${getValue('Subj')}</td>
                <td>${getValue('#')}</td>
                <td>${getValue('Title')}</td>
                <td>${getValue('Comp Numb')}</td>
                <td>${getValue('Sec')}</td>
                <td>${getValue('Ptrm')}</td>
                <td>${getValue('Lec Lab')}</td>
                <td>${getValue('Attr')}</td>
                <td>${getValue('Camp Code')}</td>
                <td>${getValue('Coll Code')}</td>
                <td>${getValue('Max Enrollment')}</td>
                <td>${getValue('Current Enrollment')}</td>
                <td>${getValue('True Max')}</td>
                <td>${getValue('Start Time')}</td>
                <td>${getValue('End Time')}</td>
                <td>${getValue('Days')}</td>
                <td>${getValue('Credits')}</td>
                <td>${getValue('Bldg')}</td>
                <td>${getValue('Room')}</td>
                <td>${getValue('GP Ind')}</td>
                <td>${getValue('Instructor')}</td>
                <td>${getValue('NetId')}</td>
                <td>${getValue('Email')}</td>
                <td>${getValue('Fees')}</td>
                <td>${getValue('XListings')}</td>
            `;
            
            tbody.appendChild(tableRow);
        });
    } catch (error) {
        console.error('Error loading CSV for sample data:', error);
        // Fallback: show message in table
        const tbody = document.getElementById('sample-data-body');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: rgba(255, 255, 255, 0.7);">Unable to load sample data</td></tr>';
    }
}

/**
 * Calculate big picture statistics
 */
function calculateBigPictureStats() {
    let overCapacityCount = 0;
    let overCapacityStudents = 0;
    let totalClassHours = 0;
    let totalAvailableHours = 0;
    let underutilizedRooms = new Set();
    let roomUsageByTime = {}; // Track room usage by time slot
    
    // Track rooms that are often empty during peak times
    const peakTimes = [600, 630, 660, 690, 720, 750, 780, 810]; // 10 AM - 1:30 PM
    const roomEmptyCount = {}; // Count how often each room is empty during peak times
    
    courseData.forEach(course => {
        // Check for over-capacity classes (using physical room capacity)
        if (course.current_enrollment !== null && 
            course.capacity !== null && 
            course.current_enrollment > course.capacity) {
            overCapacityCount++;
            overCapacityStudents += (course.current_enrollment - course.capacity);
        }
        
        // Calculate utilization
        if (course.start_minutes !== null && course.end_minutes !== null) {
            const duration = course.end_minutes - course.start_minutes;
            totalClassHours += duration;
        }
        
        // Track room usage during peak times
        const roomKey = `${course.building}-${course.room}`;
        if (!roomUsageByTime[roomKey]) {
            roomUsageByTime[roomKey] = new Set();
            roomEmptyCount[roomKey] = 0;
        }
        
        // Mark this room as used during its time slot
        for (let time = course.start_minutes; time < course.end_minutes; time += 15) {
            roomUsageByTime[roomKey].add(time);
        }
    });
    
    // Check which rooms are empty during peak times
    Object.keys(roomUsageByTime).forEach(roomKey => {
        let emptyDuringPeak = 0;
        peakTimes.forEach(peakTime => {
            if (!roomUsageByTime[roomKey].has(peakTime)) {
                emptyDuringPeak++;
            }
        });
        // If room is empty during 50%+ of peak times, consider it underutilized
        if (emptyDuringPeak >= peakTimes.length * 0.5) {
            underutilizedRooms.add(roomKey);
        }
    });
    
    // Calculate total available hours (simplified: assume 8 AM - 6 PM, Mon-Fri)
    const totalRooms = new Set(courseData.map(c => `${c.building}-${c.room}`)).size;
    const hoursPerDay = (18 * 60) - (8 * 60); // 10 hours
    const daysPerWeek = 5;
    const weeksPerSemester = 15; // Approximate
    totalAvailableHours = totalRooms * hoursPerDay * daysPerWeek * weeksPerSemester;
    
    const utilizationRate = totalAvailableHours > 0 
        ? ((totalClassHours / totalAvailableHours) * 100).toFixed(1)
        : 0;
    
    return {
        overCapacityCount,
        overCapacityStudents,
        utilizationRate,
        underutilizedRoomsCount: underutilizedRooms.size,
        totalClassHours,
        totalAvailableHours
    };
}

/**
 * Find relocation opportunities for over-capacity classes
 */
function findRelocationOpportunities() {
    const opportunities = [];
    
    // Get all over-capacity classes
    const overCapacityClasses = courseData.filter(course => 
        course.current_enrollment !== null && 
        course.capacity !== null && 
        course.current_enrollment > course.capacity
    );
    
    // Build a map of all unique rooms with their capacities
    // Use the same approach as renderCapacityVisualization
    const roomCapacities = new Map();
    courseData.forEach(course => {
        if (course.capacity !== null && course.capacity !== undefined) {
            const roomKey = `${course.building}-${course.room}`;
            // Use the first capacity found for this room (should be consistent across courses)
            if (!roomCapacities.has(roomKey)) {
                roomCapacities.set(roomKey, {
                    building: course.building,
                    room: course.room,
                    capacity: course.capacity
                });
            }
        }
    });
    
    // For each over-capacity class, find available rooms at that time
    overCapacityClasses.forEach(problemClass => {
        const requiredCapacity = problemClass.current_enrollment;
        const classDay = problemClass.day;
        const classStart = problemClass.start_minutes;
        const classEnd = problemClass.end_minutes;
        const currentRoomKey = `${problemClass.building}-${problemClass.room}`;
        
        // Find all rooms that could accommodate this class
        const suggestedRooms = [];
        
        roomCapacities.forEach((roomData, roomKey) => {
            // Skip the current room
            if (roomKey === currentRoomKey) {
                return;
            }
            
            // Check if room has sufficient capacity
            if (roomData.capacity < requiredCapacity) {
                return;
            }
            
            // Check if room is available during this time slot
            const conflictingClasses = courseData.filter(c => 
                c.building === roomData.building &&
                c.room === roomData.room &&
                c.day === classDay &&
                !(c.end_minutes <= classStart || c.start_minutes >= classEnd)
            );
            
            // If no conflicts, this room is available
            if (conflictingClasses.length === 0) {
                suggestedRooms.push({
                    building: roomData.building,
                    room: roomData.room,
                    capacity: roomData.capacity
                });
            }
        });
        
        // If we found suggestions, add this opportunity
        if (suggestedRooms.length > 0) {
            // Sort by capacity (prefer rooms that are just big enough, not too large)
            suggestedRooms.sort((a, b) => a.capacity - b.capacity);
            
            opportunities.push({
                problemClass: {
                    course: problemClass.course,
                    title: problemClass.title,
                    building: problemClass.building,
                    room: problemClass.room,
                    currentCapacity: problemClass.capacity,
                    enrollment: problemClass.current_enrollment,
                    day: problemClass.day,
                    time: `${formatTime(problemClass.start_minutes)} - ${formatTime(problemClass.end_minutes)}`,
                    overflow: problemClass.current_enrollment - problemClass.capacity
                },
                suggestedRooms: suggestedRooms.slice(0, 3) // Top 3 suggestions
            });
        }
    });
    
    // Sort by severity (most over-capacity first)
    opportunities.sort((a, b) => b.problemClass.overflow - a.problemClass.overflow);
    
    return opportunities;
}

/**
 * Populate insights section
 */
function populateInsightsSection() {
    // Calculate big picture stats
    const bigPicture = calculateBigPictureStats();
    
    // Update stat cards
    const overCapacityEl = document.getElementById('stat-over-capacity-classes');
    const overCapacityStudentsEl = document.getElementById('stat-over-capacity-students');
    const utilizationRateEl = document.getElementById('stat-utilization-rate');
    const underutilizedRoomsEl = document.getElementById('stat-underutilized-rooms');
    const relocationOppsEl = document.getElementById('stat-relocation-opportunities');
    
    if (overCapacityEl) {
        overCapacityEl.textContent = bigPicture.overCapacityCount;
    }
    if (overCapacityStudentsEl) {
        overCapacityStudentsEl.textContent = 
            `${bigPicture.overCapacityStudents} students affected`;
    }
    if (utilizationRateEl) {
        utilizationRateEl.textContent = `${bigPicture.utilizationRate}%`;
    }
    if (underutilizedRoomsEl) {
        underutilizedRoomsEl.textContent = bigPicture.underutilizedRoomsCount;
    }
    
    // Find relocation opportunities
    const opportunities = findRelocationOpportunities();
    if (relocationOppsEl) {
        relocationOppsEl.textContent = opportunities.length;
    }
    
    // Display recommendations
    const container = document.getElementById('recommendations-container');
    if (!container) {
        return;
    }
    
    container.innerHTML = '';
    
    if (opportunities.length === 0) {
        container.innerHTML = '<p class="section-text">No relocation opportunities found. All over-capacity classes may already be in the best available rooms, or no suitable alternatives exist at those times.</p>';
        return;
    }
    
    // Show top 10 opportunities
    const dayNames = { 'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 'R': 'Thursday', 'F': 'Friday' };
    
    opportunities.slice(0, 10).forEach((opp, index) => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';
        
        card.innerHTML = `
            <div class="recommendation-header">
                <h4>${opp.problemClass.course} - ${opp.problemClass.title}</h4>
                <span class="recommendation-badge">${opp.problemClass.overflow} over capacity</span>
            </div>
            <div class="recommendation-problem">
                <strong>Current situation:</strong> ${opp.problemClass.enrollment} students in 
                ${opp.problemClass.building} ${opp.problemClass.room} (capacity: ${opp.problemClass.currentCapacity})
                <br>
                <strong>Time:</strong> ${dayNames[opp.problemClass.day] || opp.problemClass.day}, ${opp.problemClass.time}
            </div>
            <div class="recommendation-solutions">
                <strong>Suggested alternatives:</strong>
                <ul>
                    ${opp.suggestedRooms.map(room => 
                        `<li><strong>${room.building} ${room.room}</strong> (capacity: ${room.capacity}) - Available at this time</li>`
                    ).join('')}
                </ul>
            </div>
        `;
        
        container.appendChild(card);
    });
}

/**
 * Setup Intersection Observer to dim map when text sections are in view
 * and handle visualization sections differently
 */
function setupScrollObservers() {
    const mapContainer = document.getElementById('map-container');
    const sectionsToDim = [
        document.getElementById('dataset-section'),
        document.getElementById('problem-section'),
        document.getElementById('cleaning-section'),
        document.getElementById('insights-section')
    ];
    const vizSection = document.getElementById('viz-section');
    
    if (!mapContainer) {
        return;
    }
    
    // Observer for text sections (dim map)
    const textObserver = new IntersectionObserver((entries) => {
        // Check if any dimmed section is in view
        const anySectionInView = entries.some(entry => entry.isIntersecting);
        
        // Only dim if we're not in a visualization section
        if (anySectionInView && !isInVizSection) {
            mapContainer.classList.add('dimmed');
        } else if (!anySectionInView && !isInVizSection) {
            mapContainer.classList.remove('dimmed');
        }
    }, {
        threshold: 0.2
    });
    
    // Observer for visualization sections (full map visibility)
    const vizObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Visualization section is in view - show map fully, pause time cycling
                isInVizSection = true;
                mapContainer.classList.remove('dimmed');
                pauseTimeCycle();
                // Set a specific time for visualization (e.g., 10:00 AM)
                selectedTime = 600; // 10:00 AM
                renderVisualization();
            } else {
                // Visualization section is out of view - resume time cycling
                isInVizSection = false;
                startTimeCycle();
            }
        });
    }, {
        threshold: 0.3
    });
    
    // Observe all sections that should dim the map
    sectionsToDim.forEach(section => {
        if (section) {
            textObserver.observe(section);
        }
    });
    
    // Observe visualization section
    if (vizSection) {
        vizObserver.observe(vizSection);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

