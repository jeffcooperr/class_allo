/**
 * University Course Schedule Visualization - Room-Based Capacity (Full View)
 * 
 * This is a standalone version of the capacity visualization from index.html
 */

// ============================================================================
// Constants
// ============================================================================

const CONSTANTS = {
    BASE_ICON_SIZE: 10,
    BASE_ZOOM: 17,
    MAX_ZOOM: 19,
    MIN_ZOOM: 14,
    MINUTES_PER_HOUR: 60,
    MINUTES_PER_DAY: 1440,
    TIME_STEP: 15,
    DEFAULT_DAY: 'W',
    DEFAULT_TIME: 720, // 12:00 PM
    DEFAULT_GRID_COLS: 3,
    DEFAULT_PADDING: 0.3
};

const MAP_CORNERS = {
    nw: [44.4788666, -73.1991804],
    ne: [44.4774707, -73.1990634],
    se: [44.4775079, -73.1971789],
    sw: [44.4789095, -73.1972329]
};

const DAYS = [
    { code: 'M', label: 'Mon' },
    { code: 'T', label: 'Tue' },
    { code: 'W', label: 'Wed' },
    { code: 'R', label: 'Thu' },
    { code: 'F', label: 'Fri' }
];

// ============================================================================
// Global State
// ============================================================================

let courseData = [];
let selectedDay = CONSTANTS.DEFAULT_DAY;
let selectedTime = CONSTANTS.DEFAULT_TIME;
let map = null;
let classroomMarkers = [];
let buildingPolygons = [];
let currentTileLayer = null;
let isDarkTheme = false;
let minTime = 0;
let maxTime = CONSTANTS.MINUTES_PER_DAY;

// Building coordinates are loaded from js/building-coordinates.js
// (loaded via script tag in HTML before this file)

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the application
 */
async function init() {
    try {
        await loadCourseData();
        calculateTimeRange();
        initMap();
        setupDaySelector();
        setupTimeSlider();
        setupThemeToggle();
        renderVisualization();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

/**
 * Load course data from JSON file
 */
async function loadCourseData() {
    const response = await fetch('data/2025_fall_cleaned.json');
    if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
    }
    courseData = await response.json();
    console.log(`Loaded ${courseData.length} course meeting records`);
}

// ============================================================================
// Map Initialization
// ============================================================================

/**
 * Initialize the Leaflet map
 */
function initMap() {
    const center = calculateMapCenter();
    const initialZoom = CONSTANTS.MAX_ZOOM;

    map = L.map('map-container', {
        minZoom: CONSTANTS.MIN_ZOOM
    });

    map.setView(center, initialZoom);
    addDefaultTileLayer();
    setupMapEventListeners();

    console.log('Map initialized');
}

/**
 * Calculate map center from corner coordinates
 */
function calculateMapCenter() {
    const allLats = [MAP_CORNERS.nw[0], MAP_CORNERS.ne[0], MAP_CORNERS.se[0], MAP_CORNERS.sw[0]];
    const allLngs = [MAP_CORNERS.nw[1], MAP_CORNERS.ne[1], MAP_CORNERS.se[1], MAP_CORNERS.sw[1]];
    
    const centerLat = (Math.min(...allLats) + Math.max(...allLats)) / 2;
    const centerLng = (Math.min(...allLngs) + Math.max(...allLngs)) / 2;
    
    return [centerLat, centerLng];
}

/**
 * Add default OpenStreetMap tile layer
 */
function addDefaultTileLayer() {
    currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: CONSTANTS.MAX_ZOOM
    }).addTo(map);
}

/**
 * Setup map event listeners
 */
function setupMapEventListeners() {
    map.on('zoomend', () => {
        renderVisualization();
    });
}

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Calculate the time range from course data
 */
function calculateTimeRange() {
    if (courseData.length === 0) {
        resetTimeRange();
        return;
    }

    const startTimes = courseData.map(c => c.start_minutes).filter(t => t != null);
    const endTimes = courseData.map(c => c.end_minutes).filter(t => t != null);

    if (startTimes.length > 0 && endTimes.length > 0) {
        minTime = Math.min(...startTimes);
        maxTime = Math.max(...endTimes);
        minTime = roundDownToNearestStep(minTime);
        maxTime = roundUpToNearestStep(maxTime);
        clampSelectedTime();
    } else {
        resetTimeRange();
    }
}

/**
 * Reset time range to defaults
 */
function resetTimeRange() {
    minTime = 0;
    maxTime = CONSTANTS.MINUTES_PER_DAY;
}

/**
 * Round down to nearest time step
 */
function roundDownToNearestStep(time) {
    return Math.floor(time / CONSTANTS.TIME_STEP) * CONSTANTS.TIME_STEP;
}

/**
 * Round up to nearest time step
 */
function roundUpToNearestStep(time) {
    return Math.ceil(time / CONSTANTS.TIME_STEP) * CONSTANTS.TIME_STEP;
}

/**
 * Ensure selected time is within valid range
 */
function clampSelectedTime() {
    if (selectedTime < minTime) selectedTime = minTime;
    if (selectedTime > maxTime) selectedTime = maxTime;
}

// ============================================================================
// UI Controls Setup
// ============================================================================

/**
 * Set up the day selector buttons
 */
function setupDaySelector() {
    const container = document.getElementById('day-selector');
    if (!container) return;
    
    container.innerHTML = '<label class="control-label">Day:</label><div class="day-buttons"></div>';
    const buttonsContainer = container.querySelector('.day-buttons');

    DAYS.forEach(day => {
        const button = createDayButton(day);
        buttonsContainer.appendChild(button);
    });
}

/**
 * Create a day selector button
 */
function createDayButton(day) {
    const button = document.createElement('button');
    button.textContent = day.label;
    button.className = 'day-button';
    button.dataset.day = day.code;

    if (day.code === selectedDay) {
        button.classList.add('active');
    }

    button.addEventListener('click', () => {
        handleDaySelection(day.code, button);
    });

    return button;
}

/**
 * Handle day selection
 */
function handleDaySelection(dayCode, clickedButton) {
    selectedDay = dayCode;
    updateDayButtonStates(clickedButton);
    renderVisualization();
}

/**
 * Update day button active states
 */
function updateDayButtonStates(activeButton) {
    const container = document.getElementById('day-selector');
    const buttonsContainer = container?.querySelector('.day-buttons');
    if (!buttonsContainer) return;

    buttonsContainer.querySelectorAll('.day-button').forEach(btn => {
        btn.classList.remove('active');
    });
    activeButton.classList.add('active');
}

/**
 * Set up the time slider
 */
function setupTimeSlider() {
    const container = document.getElementById('time-control');
    if (!container) return;
    
    container.innerHTML = createTimeSliderHTML();
    attachTimeSliderListeners();
}

/**
 * Create HTML for time slider
 */
function createTimeSliderHTML() {
    return `
        <label class="control-label">Time:</label>
        <div class="time-slider-container">
            <input type="range" id="time-slider" min="${minTime}" max="${maxTime}" value="${selectedTime}" step="${CONSTANTS.TIME_STEP}">
            <div class="time-display">
                <span id="time-display">${formatTime(selectedTime)}</span>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to time slider
 */
function attachTimeSliderListeners() {
    const slider = document.getElementById('time-slider');
    const display = document.getElementById('time-display');

    if (slider && display) {
        slider.addEventListener('input', (e) => {
            handleTimeChange(parseInt(e.target.value), display);
        });
    }
}

/**
 * Handle time slider change
 */
function handleTimeChange(newTime, displayElement) {
    selectedTime = newTime;
    displayElement.textContent = formatTime(selectedTime);
    renderVisualization();
}

/**
 * Format minutes since midnight to readable time string
 */
function formatTime(minutes) {
    const hours = Math.floor(minutes / CONSTANTS.MINUTES_PER_HOUR);
    const mins = minutes % CONSTANTS.MINUTES_PER_HOUR;
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

    container.innerHTML = createThemeToggleHTML();
    attachThemeToggleListener();
}

/**
 * Create HTML for theme toggle
 */
function createThemeToggleHTML() {
    return `
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
}

/**
 * Attach event listener to theme toggle
 */
function attachThemeToggleListener() {
    const switchInput = document.getElementById('theme-switch-input');
    if (switchInput) {
        switchInput.addEventListener('change', toggleMapTheme);
    }
}

// ============================================================================
// Theme Management
// ============================================================================

/**
 * Toggle between OpenStreetMap and Jawg.Dark themes
 */
function toggleMapTheme() {
    if (!map) return;

    removeCurrentTileLayer();
    isDarkTheme = !isDarkTheme;
    addTileLayerForTheme();
    updateThemeToggleState();

    console.log(`Switched to ${isDarkTheme ? 'Dark' : 'Light'} theme`);
}

/**
 * Remove current tile layer from map
 */
function removeCurrentTileLayer() {
    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }
}

/**
 * Add appropriate tile layer based on current theme
 */
function addTileLayerForTheme() {
    if (isDarkTheme) {
        currentTileLayer = createDarkTileLayer();
    } else {
        currentTileLayer = createLightTileLayer();
    }
    currentTileLayer.addTo(map);
}

/**
 * Create dark theme tile layer
 */
function createDarkTileLayer() {
    return L.tileLayer(`https://tile.jawg.io/jawg-dark/{z}/{x}/{y}.png?access-token=${JAWG_API_KEY}`, {
        attribution: '© <a href="https://jawg.io">Jawg</a>',
        maxZoom: CONSTANTS.MAX_ZOOM
    });
}

/**
 * Create light theme tile layer
 */
function createLightTileLayer() {
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: CONSTANTS.MAX_ZOOM
    });
}

/**
 * Update theme toggle switch state
 */
function updateThemeToggleState() {
    const switchInput = document.getElementById('theme-switch-input');
    if (switchInput) {
        switchInput.checked = isDarkTheme;
    }
}

// ============================================================================
// Data Filtering and Processing
// ============================================================================

/**
 * Filter course data based on selected day and time
 */
function filterCourses() {
    return courseData.filter(course => {
        return matchesSelectedDay(course) && matchesSelectedTime(course);
    });
}

/**
 * Check if course matches selected day
 */
function matchesSelectedDay(course) {
    return course.day === selectedDay;
}

/**
 * Check if course matches selected time
 */
function matchesSelectedTime(course) {
    return selectedTime >= course.start_minutes && selectedTime <= course.end_minutes;
}

/**
 * Get all unique classrooms grouped by building
 */
function getAllClassroomsByBuilding() {
    const classrooms = collectClassroomsByBuilding();
    return sortClassroomsInBuildings(classrooms);
}

/**
 * Collect all classrooms grouped by building
 */
function collectClassroomsByBuilding() {
    const classrooms = {};
    courseData.forEach(course => {
        const { building, room } = course;
        if (building && room) {
            if (!classrooms[building]) {
                classrooms[building] = new Set();
            }
            classrooms[building].add(room);
        }
    });
    return classrooms;
}

/**
 * Sort classrooms in each building
 */
function sortClassroomsInBuildings(classrooms) {
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
        const { building, room } = course;
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

// ============================================================================
// Building and Position Utilities
// ============================================================================

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
    if (!map) return CONSTANTS.BASE_ICON_SIZE;
    const currentZoom = map.getZoom();
    const scaleFactor = Math.pow(2, currentZoom - CONSTANTS.BASE_ZOOM);
    return CONSTANTS.BASE_ICON_SIZE * scaleFactor;
}

/**
 * Calculate position for a classroom box within building bounds
 */
function calculateClassroomPosition(bounds, corners, index, totalRooms, buildingConfig) {
    const cols = buildingConfig?.gridCols ?? CONSTANTS.DEFAULT_GRID_COLS;
    const padding = buildingConfig?.padding ?? CONSTANTS.DEFAULT_PADDING;
    const rows = Math.ceil(totalRooms / cols);

    const { row, col } = calculateGridPosition(index, cols);
    const { width, height } = calculateBuildingDimensions(corners);
    const { usableWidth, usableHeight } = calculateUsableDimensions(width, height, padding);
    const { localX, localY } = calculateLocalPosition(col, row, cols, rows, usableWidth, usableHeight);
    const { paddedX, paddedY } = applyPadding(localX, localY, width, height, padding);
    
    return calculateWorldPosition(corners, width, height, paddedX, paddedY);
}

/**
 * Calculate grid row and column from index
 */
function calculateGridPosition(index, cols) {
    return {
        row: Math.floor(index / cols),
        col: index % cols
    };
}

/**
 * Calculate building width and height from corners
 */
function calculateBuildingDimensions(corners) {
    const [nw, ne, se, sw] = corners;
    
    const width = Math.sqrt(
        Math.pow(ne[0] - nw[0], 2) + Math.pow(ne[1] - nw[1], 2)
    );
    const height = Math.sqrt(
        Math.pow(sw[0] - nw[0], 2) + Math.pow(sw[1] - nw[1], 2)
    );
    
    return { width, height };
}

/**
 * Calculate usable dimensions after padding
 */
function calculateUsableDimensions(width, height, padding) {
    return {
        usableWidth: width * (1 - padding),
        usableHeight: height * (1 - padding)
    };
}

/**
 * Calculate local position within grid
 */
function calculateLocalPosition(col, row, cols, rows, usableWidth, usableHeight) {
    return {
        localX: (col / Math.max(1, cols - 1)) * usableWidth,
        localY: (row / Math.max(1, rows - 1)) * usableHeight
    };
}

/**
 * Apply padding to local position
 */
function applyPadding(localX, localY, width, height, padding) {
    return {
        paddedX: localX + (width * padding / 2),
        paddedY: localY + (height * padding / 2)
    };
}

/**
 * Calculate world coordinates from local position
 */
function calculateWorldPosition(corners, width, height, paddedX, paddedY) {
    const [nw, ne, se, sw] = corners;
    
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

// ============================================================================
// Visualization Rendering
// ============================================================================

/**
 * Render the capacity-based visualization on the map
 */
function renderVisualization() {
    if (!map) {
        console.error('Map not initialized');
        return;
    }

    clearVisualization();
    
    const filteredCourses = filterCourses();
    const allClassrooms = getAllClassroomsByBuilding();
    const inUseClassrooms = getInUseClassrooms(filteredCourses);

    renderBuildings(allClassrooms, inUseClassrooms, filteredCourses);

    console.log(`Rendered ${classroomMarkers.length} classroom markers`);
}

/**
 * Clear existing markers and polygons from map
 */
function clearVisualization() {
    classroomMarkers.forEach(marker => map.removeLayer(marker));
    classroomMarkers = [];
    buildingPolygons.forEach(polygon => map.removeLayer(polygon));
    buildingPolygons = [];
}

/**
 * Render all buildings with their classrooms
 */
function renderBuildings(allClassrooms, inUseClassrooms, filteredCourses) {
    Object.keys(buildingCoordinates).forEach(buildingName => {
        const buildingData = buildingCoordinates[buildingName];
        if (!buildingData.corners || !allClassrooms[buildingName]) {
            return;
        }

        renderBuildingOutline(buildingData);
        renderBuildingClassrooms(
            buildingName,
            buildingData,
            allClassrooms[buildingName],
            inUseClassrooms[buildingName] || new Set(),
            filteredCourses
        );
    });
}

/**
 * Render building outline polygon
 */
function renderBuildingOutline(buildingData) {
    const polygon = L.polygon(buildingData.corners, {
        color: 'transparent',
        fillColor: 'transparent',
        fillOpacity: 0.3,
        weight: 2
    }).addTo(map);
    buildingPolygons.push(polygon);
}

/**
 * Render all classrooms for a building
 */
function renderBuildingClassrooms(buildingName, buildingData, rooms, inUseRooms, filteredCourses) {
    const bounds = getBuildingBounds(buildingData.corners);
    const buildingRotation = getBuildingRotation(buildingData);
    const buildingConfig = buildingData.config || {};

    rooms.forEach((room, index) => {
        const coursesInRoom = getCoursesForRoom(filteredCourses, buildingName, room);
        const isInUse = inUseRooms.has(room);
        
        const roomInfo = getRoomInfo(buildingName, room, coursesInRoom);
        const position = calculateClassroomPosition(bounds, buildingData.corners, index, rooms.length, buildingConfig);
        const marker = createClassroomMarker(room, buildingName, roomInfo, position, buildingRotation, isInUse);
        
        marker.addTo(map);
        classroomMarkers.push(marker);
    });
}

/**
 * Get room information including capacity and enrollment data
 */
function getRoomInfo(buildingName, room, coursesInRoom) {
    const tooltipContent = buildTooltipContent(coursesInRoom);
    const capacityInfo = getRoomCapacityInfo(buildingName, room, coursesInRoom);
    const enrollmentInfo = buildEnrollmentInfo(coursesInRoom, capacityInfo);
    const finalTooltip = updateTooltipForHypotheticalCapacity(tooltipContent, coursesInRoom, capacityInfo.isHypotheticalCapacity);
    
    return {
        tooltip: finalTooltip,
        enrollmentDisplay: enrollmentInfo.display,
        isOverCapacity: enrollmentInfo.isOverCapacity,
        isAtOrOverCapacity: enrollmentInfo.isAtOrOverCapacity,
        isHypotheticalCapacity: capacityInfo.isHypotheticalCapacity
    };
}

/**
 * Build tooltip content for courses in a room
 */
function buildTooltipContent(coursesInRoom) {
    if (coursesInRoom.length === 0) {
        return 'Available';
    }

    return coursesInRoom.map(course => {
        const startTime = formatTime(course.start_minutes);
        const endTime = formatTime(course.end_minutes);
        const courseCode = escapeHtml(course.course || '');
        const courseTitle = escapeHtml(course.title || '');
        const capacityNote = course.capacity_from_csv === false 
            ? '<br><em style="font-size: 0.9em; color: #666;">(Estimated capacity)</em>' 
            : '';
        return `${courseCode} - ${courseTitle}<br>${startTime} - ${endTime}${capacityNote}`;
    }).join('<br><br>');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Get room capacity information
 */
function getRoomCapacityInfo(buildingName, room, coursesInRoom) {
    let roomCapacity = null;
    let isHypotheticalCapacity = false;

    // Get room capacity from any course that uses this room (from full dataset)
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

    // If there are courses currently in the room, check if their capacity is hypothetical
    if (coursesInRoom.length > 0) {
        const firstCourse = coursesInRoom[0];
        if (firstCourse.capacity_from_csv === false) {
            isHypotheticalCapacity = true;
        }
    }

    return { roomCapacity, isHypotheticalCapacity };
}

/**
 * Build enrollment display information
 */
function buildEnrollmentInfo(coursesInRoom, capacityInfo) {
    let enrollmentDisplay = '';
    let isOverCapacity = false;
    let isAtOrOverCapacity = false;

    if (coursesInRoom.length > 0) {
        const firstCourse = coursesInRoom[0];
        if (hasValidEnrollmentAndCapacity(firstCourse)) {
            enrollmentDisplay = `<div class="classroom-enrollment">${firstCourse.current_enrollment}/${firstCourse.capacity}</div>`;
            isOverCapacity = firstCourse.current_enrollment > firstCourse.capacity;
            isAtOrOverCapacity = firstCourse.current_enrollment >= firstCourse.capacity;
        }
    } else if (capacityInfo.roomCapacity !== null) {
        enrollmentDisplay = `<div class="classroom-enrollment">0/${capacityInfo.roomCapacity}</div>`;
    }

    return { display: enrollmentDisplay, isOverCapacity, isAtOrOverCapacity };
}

/**
 * Check if course has valid enrollment and capacity data
 */
function hasValidEnrollmentAndCapacity(course) {
    return course.current_enrollment !== null && 
           course.current_enrollment !== undefined &&
           course.capacity !== null && 
           course.capacity !== undefined;
}

/**
 * Update tooltip if capacity is hypothetical and room is available
 */
function updateTooltipForHypotheticalCapacity(tooltipContent, coursesInRoom, isHypothetical) {
    if (coursesInRoom.length === 0 && isHypothetical) {
        return tooltipContent + '<br><em style="font-size: 0.9em; color: #666;">(Estimated capacity)</em>';
    }
    return tooltipContent;
}

/**
 * Create a classroom marker with icon and popup
 */
function createClassroomMarker(room, buildingName, roomInfo, position, buildingRotation, isInUse) {
    const showRoomNumber = shouldShowRoomNumber();
    const statusClasses = getStatusClasses(roomInfo, isInUse);
    const classroomHtml = buildClassroomHtml(room, buildingName, roomInfo, buildingRotation, showRoomNumber, statusClasses);
    const icon = createClassroomIcon(classroomHtml);
    
    const marker = L.marker([position.lat, position.lng], { icon: icon });
    
    if (roomInfo.tooltip) {
        marker.bindPopup(roomInfo.tooltip);
    }
    
    return marker;
}

/**
 * Check if room numbers should be displayed (at max zoom)
 */
function shouldShowRoomNumber() {
    return map.getZoom() === CONSTANTS.MAX_ZOOM;
}

/**
 * Get CSS classes for classroom status
 */
function getStatusClasses(roomInfo, isInUse) {
    let statusClass = 'classroom-available';
    if (isInUse) {
        statusClass = roomInfo.isOverCapacity ? 'classroom-over-capacity' : 'classroom-in-use';
    }
    
    const borderClass = roomInfo.isAtOrOverCapacity ? 'classroom-at-capacity-border' : '';
    const hypotheticalClass = roomInfo.isHypotheticalCapacity ? 'classroom-hypothetical-capacity' : '';
    
    return { statusClass, borderClass, hypotheticalClass };
}

/**
 * Build HTML for classroom cell
 */
function buildClassroomHtml(room, buildingName, roomInfo, buildingRotation, showRoomNumber, statusClasses) {
    const { statusClass, borderClass, hypotheticalClass } = statusClasses;
    const escapedTooltip = roomInfo.tooltip.replace(/"/g, '&quot;');
    
    return `
        <div class="classroom-cell ${statusClass} ${borderClass} ${hypotheticalClass}"
             data-building="${buildingName}"
             data-room="${room}"
             style="transform: rotate(${buildingRotation}deg); position: relative;"
             title="${escapedTooltip}">
            <div class="classroom-content">
                ${showRoomNumber ? `<div class="classroom-number">${room}</div>` : ''}
                ${showRoomNumber ? roomInfo.enrollmentDisplay : ''}
            </div>
        </div>
    `;
}

/**
 * Create Leaflet div icon for classroom marker
 */
function createClassroomIcon(classroomHtml) {
    const iconSize = getIconSize();
    const halfSize = iconSize / 2;
    
    return L.divIcon({
        className: 'classroom-marker',
        html: classroomHtml,
        iconSize: [iconSize, iconSize],
        iconAnchor: [halfSize, halfSize]
    });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

