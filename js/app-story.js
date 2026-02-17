/**
 * University Course Schedule Visualization - Story/Landing Page
 * 
 * This version displays the map as a background that automatically cycles
 * through different times of day. The map is non-interactive and has reduced opacity.
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
    TIME_CYCLE_INTERVAL: 1000, // Change time every 1 second
    TIME_CYCLE_STEP: 30, // Step by 30 minutes each cycle
    MIN_TIME: 480, // 8:00 AM
    MAX_TIME: 1020, // 5:00 PM (17:00)
    DEFAULT_DAY: 'M',
    DEFAULT_TIME: 480, // 8:00 AM
    INTERACTIVE_DEFAULT_DAY: 'W',
    INTERACTIVE_DEFAULT_TIME: 720, // 12:00 PM
    CAPACITY_DEFAULT_DAY: 'W',
    CAPACITY_DEFAULT_TIME: 720, // 12:00 PM
    DEFAULT_GRID_COLS: 3,
    DEFAULT_PADDING: 0.3,
    BACKGROUND_MAP_ZOOM: 18,
    INTERACTIVE_MAP_ZOOM: 19,
    CAPACITY_MAP_ZOOM: 19
};

const MAP_CORNERS = {
    nw: [44.4788666, -73.1991804],
    ne: [44.4774707, -73.1990634],
    se: [44.4775079, -73.1971789],
    sw: [44.4789095, -73.1972329]
};

const CAMPUS_CENTER = {
    lat: 44.47798293916087,
    lng: -73.19652807301023
};

const DAYS = [
    { code: 'M', label: 'Mon' },
    { code: 'T', label: 'Tue' },
    { code: 'W', label: 'Wed' },
    { code: 'R', label: 'Thu' },
    { code: 'F', label: 'Fri' }
];

const DAY_NAMES = {
    'M': 'Monday',
    'T': 'Tuesday',
    'W': 'Wednesday',
    'R': 'Thursday',
    'F': 'Friday'
};

// ============================================================================
// Global State
// ============================================================================

let courseData = [];
let selectedDay = CONSTANTS.DEFAULT_DAY;
let selectedTime = CONSTANTS.DEFAULT_TIME;
let map = null;
let interactiveMap = null;
let capacityMap = null;
let classroomMarkers = [];
let buildingPolygons = [];
let interactiveClassroomMarkers = [];
let interactiveBuildingPolygons = [];
let capacityClassroomMarkers = [];
let capacityBuildingPolygons = [];
let interactiveSelectedDay = CONSTANTS.INTERACTIVE_DEFAULT_DAY;
let interactiveSelectedTime = CONSTANTS.INTERACTIVE_DEFAULT_TIME;
let capacitySelectedDay = CONSTANTS.CAPACITY_DEFAULT_DAY;
let capacitySelectedTime = CONSTANTS.CAPACITY_DEFAULT_TIME;
let minTime = 0;
let maxTime = CONSTANTS.MINUTES_PER_DAY;
let timeCycleInterval = null;
let isInVizSection = false;

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
        initInteractiveMap();
        initCapacityMap();

        setupInteractiveDaySelector();
        setupInteractiveTimeSlider();
        setupCapacityDaySelector();
        setupCapacityTimeSlider();

        renderVisualization();
        renderInteractiveVisualization();
        renderCapacityVisualization();

        startTimeCycle();
        await populateDatasetSection();
        populateInsightsSection();
        setupScrollObservers();
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
 * Initialize the Leaflet map (non-interactive background)
 */
function initMap() {
    map = L.map('map-container', {
        zoomControl: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false
    }).setView([CAMPUS_CENTER.lat, CAMPUS_CENTER.lng], CONSTANTS.BACKGROUND_MAP_ZOOM);

    addDarkTileLayer(map);
    console.log('Map initialized (non-interactive)');
}

/**
 * Add dark theme tile layer to a map
 */
function addDarkTileLayer(mapInstance) {
    L.tileLayer(`https://tile.jawg.io/jawg-dark/{z}/{x}/{y}.png?access-token=${JAWG_API_KEY}`, {
        attribution: '© <a href="https://jawg.io">Jawg</a>',
        maxZoom: 22
    }).addTo(mapInstance);
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
 * Add OpenStreetMap tile layer to a map
 */
function addOSMTileLayer(mapInstance) {
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: CONSTANTS.MAX_ZOOM
    }).addTo(mapInstance);
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
        clampInteractiveSelectedTime();
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
 * Ensure interactive selected time is within valid range
 */
function clampInteractiveSelectedTime() {
    if (interactiveSelectedTime < minTime) interactiveSelectedTime = minTime;
    if (interactiveSelectedTime > maxTime) interactiveSelectedTime = maxTime;
}

/**
 * Initialize the interactive Leaflet map at bottom of section 5
 */
function initInteractiveMap() {
    const center = calculateMapCenter();
    
    interactiveMap = L.map('map-container-interactive', {
        minZoom: CONSTANTS.MIN_ZOOM,
        zoomControl: true
    });

    interactiveMap.setView(center, CONSTANTS.INTERACTIVE_MAP_ZOOM);
    addOSMTileLayer(interactiveMap);
    setupMapZoomListener(interactiveMap, renderInteractiveVisualization);

    console.log('Interactive map initialized');
}

// ============================================================================
// UI Controls Setup
// ============================================================================

/**
 * Set up the day selector buttons for interactive map
 */
function setupInteractiveDaySelector() {
    setupDaySelector('day-selector-interactive', interactiveSelectedDay, (dayCode) => {
        interactiveSelectedDay = dayCode;
        renderInteractiveVisualization();
    });
}

/**
 * Generic day selector setup
 */
function setupDaySelector(containerId, selectedDay, onDayChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<label class="control-label">Day:</label><div class="day-buttons"></div>';
    const buttonsContainer = container.querySelector('.day-buttons');

    DAYS.forEach(day => {
        const button = createDayButton(day, selectedDay, buttonsContainer, onDayChange);
        buttonsContainer.appendChild(button);
    });
}

/**
 * Create a day selector button
 */
function createDayButton(day, selectedDay, buttonsContainer, onDayChange) {
        const button = document.createElement('button');
        button.textContent = day.label;
        button.className = 'day-button';
        button.dataset.day = day.code;

    if (day.code === selectedDay) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
        updateDayButtonStates(buttonsContainer, button);
        onDayChange(day.code);
    });

    return button;
}

/**
 * Update day button active states
 */
function updateDayButtonStates(buttonsContainer, activeButton) {
    buttonsContainer.querySelectorAll('.day-button').forEach(btn => {
        btn.classList.remove('active');
    });
    activeButton.classList.add('active');
}

/**
 * Set up the time slider for interactive map
 */
function setupInteractiveTimeSlider() {
    setupTimeSlider(
        'time-control-interactive',
        'time-slider-interactive',
        'time-display-interactive',
        interactiveSelectedTime,
        (newTime) => {
            interactiveSelectedTime = newTime;
            renderInteractiveVisualization();
        }
    );
}

/**
 * Generic time slider setup
 */
function setupTimeSlider(containerId, sliderId, displayId, initialTime, onTimeChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = createTimeSliderHTML(sliderId, displayId, initialTime);
    attachTimeSliderListeners(sliderId, displayId, onTimeChange);
}

/**
 * Create HTML for time slider
 */
function createTimeSliderHTML(sliderId, displayId, initialTime) {
    return `
        <label class="control-label">Time:</label>
        <div class="time-slider-container">
            <input type="range" id="${sliderId}" min="${minTime}" max="${maxTime}" value="${initialTime}" step="${CONSTANTS.TIME_STEP}">
            <div class="time-display">
                <span id="${displayId}">${formatTime(initialTime)}</span>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners to time slider
 */
function attachTimeSliderListeners(sliderId, displayId, onTimeChange) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);

    if (slider && display) {
        slider.addEventListener('input', (e) => {
            const newTime = parseInt(e.target.value);
            display.textContent = formatTime(newTime);
            onTimeChange(newTime);
        });
    }
}

// ============================================================================
// Time Cycling
// ============================================================================

/**
 * Start automatic time cycling
 */
function startTimeCycle() {
    if (timeCycleInterval) {
        clearInterval(timeCycleInterval);
    }
    
    timeCycleInterval = setInterval(() => {
        if (isInVizSection) {
            return;
        }
        
        selectedTime += CONSTANTS.TIME_CYCLE_STEP;
        
        if (selectedTime > CONSTANTS.MAX_TIME) {
            selectedTime = CONSTANTS.MIN_TIME;
        }
        
        renderVisualization();
    }, CONSTANTS.TIME_CYCLE_INTERVAL);
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
    const hours = Math.floor(minutes / CONSTANTS.MINUTES_PER_HOUR);
    const mins = minutes % CONSTANTS.MINUTES_PER_HOUR;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const displayMins = mins.toString().padStart(2, '0');
    return `${displayHours}:${displayMins} ${period}`;
}

// ============================================================================
// Data Filtering and Processing
// ============================================================================

/**
 * Filter course data based on selected day and time
 */
function filterCourses() {
    return filterCoursesByDayAndTime(selectedDay, selectedTime);
}

/**
 * Filter course data for interactive map based on selected day and time
 */
function filterInteractiveCourses() {
    return filterCoursesByDayAndTime(interactiveSelectedDay, interactiveSelectedTime);
}

/**
 * Generic course filter by day and time
 */
function filterCoursesByDayAndTime(day, time) {
    return courseData.filter(course => {
        return matchesDay(course, day) && matchesTime(course, time);
    });
}

/**
 * Check if course matches day
 */
function matchesDay(course, day) {
    return course.day === day;
}

/**
 * Check if course matches time
 */
function matchesTime(course, time) {
    return time >= course.start_minutes && time <= course.end_minutes;
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
function getIconSize(mapInstance = null) {
    const mapToUse = mapInstance || map;
    if (!mapToUse) return CONSTANTS.BASE_ICON_SIZE;
    const currentZoom = mapToUse.getZoom();
    const scaleFactor = Math.pow(2, currentZoom - CONSTANTS.BASE_ZOOM);
    return CONSTANTS.BASE_ICON_SIZE * scaleFactor;
}

/**
 * Calculate icon size for interactive map based on current zoom level
 */
function getInteractiveIconSize(mapInstance = null) {
    return getIconSize(mapInstance || interactiveMap);
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
// Shared Rendering Utilities
// ============================================================================

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
 * Build tooltip content for courses in a room (simple version without capacity notes)
 */
function buildSimpleTooltipContent(coursesInRoom) {
    if (coursesInRoom.length === 0) {
        return 'Available';
    }

    return coursesInRoom.map(course => {
                    const startTime = formatTime(course.start_minutes);
                    const endTime = formatTime(course.end_minutes);
        const courseCode = escapeHtml(course.course || '');
        const courseTitle = escapeHtml(course.title || '');
                    return `${courseCode} - ${courseTitle}<br>${startTime} - ${endTime}`;
                }).join('<br><br>');
}

/**
 * Build tooltip content with capacity notes
 */
function buildTooltipContentWithCapacity(coursesInRoom) {
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
 * Create Leaflet div icon for classroom marker
 */
function createClassroomIcon(classroomHtml, mapInstance) {
    const iconSize = getIconSize(mapInstance);
            const halfSize = iconSize / 2;
    
    return L.divIcon({
                className: 'classroom-marker',
                html: classroomHtml,
                iconSize: [iconSize, iconSize],
                iconAnchor: [halfSize, halfSize]
            });
}

/**
 * Check if room numbers should be displayed (at max zoom)
 */
function shouldShowRoomNumber(mapInstance) {
    return mapInstance.getZoom() === CONSTANTS.MAX_ZOOM;
}

// ============================================================================
// Visualization Rendering
// ============================================================================

/**
 * Render the main visualization on the map
 */
function renderVisualization() {
    if (!map) {
        console.error('Map not initialized');
        return;
    }

    clearVisualization(map, classroomMarkers, buildingPolygons);
    
    const filteredCourses = filterCourses();
    const allClassrooms = getAllClassroomsByBuilding();
    const inUseClassrooms = getInUseClassrooms(filteredCourses);

    renderBuildings(map, allClassrooms, inUseClassrooms, filteredCourses, {
        markers: classroomMarkers,
        polygons: buildingPolygons,
        showRoomNumbers: false,
        interactive: false
    });
}

/**
 * Clear existing markers and polygons from a map
 */
function clearVisualization(mapInstance, markers, polygons) {
    markers.forEach(marker => mapInstance.removeLayer(marker));
    markers.length = 0;
    polygons.forEach(polygon => mapInstance.removeLayer(polygon));
    polygons.length = 0;
}

/**
 * Render all buildings with their classrooms
 */
function renderBuildings(mapInstance, allClassrooms, inUseClassrooms, filteredCourses, options) {
    Object.keys(buildingCoordinates).forEach(buildingName => {
        const buildingData = buildingCoordinates[buildingName];
        if (!buildingData.corners || !allClassrooms[buildingName]) {
            return;
        }

        renderBuildingOutline(mapInstance, buildingData, options.polygons);
        renderBuildingClassrooms(
            mapInstance,
            buildingName,
            buildingData,
            allClassrooms[buildingName],
            inUseClassrooms[buildingName] || new Set(),
            filteredCourses,
            options
        );
    });
}

/**
 * Render building outline polygon
 */
function renderBuildingOutline(mapInstance, buildingData, polygonsArray) {
        const polygon = L.polygon(buildingData.corners, {
            color: 'transparent',
            fillColor: 'transparent',
            fillOpacity: 0.3,
            weight: 2
    }).addTo(mapInstance);
    polygonsArray.push(polygon);
}

/**
 * Render all classrooms for a building
 */
function renderBuildingClassrooms(mapInstance, buildingName, buildingData, rooms, inUseRooms, filteredCourses, options) {
        const bounds = getBuildingBounds(buildingData.corners);
        const buildingRotation = getBuildingRotation(buildingData);
        const buildingConfig = buildingData.config || {};

        rooms.forEach((room, index) => {
            const coursesInRoom = getCoursesForRoom(filteredCourses, buildingName, room);
        const isInUse = inUseRooms.has(room);
        const position = calculateClassroomPosition(bounds, buildingData.corners, index, rooms.length, buildingConfig);
        
        let marker;
        if (options.useMaxEnrollment || options.useCapacity) {
            marker = createEnrollmentClassroomMarker(
                room,
                buildingName,
                coursesInRoom,
                position,
                buildingRotation,
                mapInstance,
                isInUse,
                options.showRoomNumbers,
                options
            );
            } else {
            marker = createSimpleClassroomMarker(
                room,
                buildingName,
                coursesInRoom,
                position,
                buildingRotation,
                mapInstance,
                isInUse,
                options.showRoomNumbers,
                options.interactive
            );
        }
        
        marker.addTo(mapInstance);
        options.markers.push(marker);
    });
}

/**
 * Create a classroom marker with enrollment display
 */
function createEnrollmentClassroomMarker(room, buildingName, coursesInRoom, position, buildingRotation, mapInstance, isInUse, showRoomNumber, options) {
    let tooltipContent;
    let enrollmentInfo;
    
    if (options.useCapacity) {
        tooltipContent = buildTooltipContentWithCapacity(coursesInRoom);
        enrollmentInfo = buildCapacityEnrollmentInfo(buildingName, room, coursesInRoom);
        // Update tooltip if capacity is hypothetical and room is available
        if (coursesInRoom.length === 0 && enrollmentInfo.isHypotheticalCapacity) {
            tooltipContent += '<br><em style="font-size: 0.9em; color: #666;">(Estimated capacity)</em>';
        }
    } else {
        tooltipContent = buildSimpleTooltipContent(coursesInRoom);
        enrollmentInfo = buildInteractiveEnrollmentInfo(coursesInRoom);
    }
    
    const statusClass = getStatusClasses(isInUse, enrollmentInfo.isOverCapacity);
    const statusClasses = {
        statusClass,
        borderClass: enrollmentInfo.isAtOrOverCapacity ? 'classroom-at-capacity-border' : '',
        hypotheticalClass: enrollmentInfo.isHypotheticalCapacity ? 'classroom-hypothetical-capacity' : ''
    };
    
    const classroomHtml = buildClassroomHtmlWithEnrollment(
        room,
        buildingName,
        tooltipContent,
        position,
        buildingRotation,
        showRoomNumber,
        enrollmentInfo.display,
        statusClasses
    );

    const icon = createClassroomIcon(classroomHtml, mapInstance);
    const marker = L.marker([position.lat, position.lng], { icon: icon });

    if (tooltipContent) {
        marker.bindPopup(tooltipContent);
    }

    return marker;
}

/**
 * Build HTML for classroom cell with enrollment
 */
function buildClassroomHtmlWithEnrollment(room, buildingName, tooltipContent, position, buildingRotation, showRoomNumber, enrollmentDisplay, statusClasses) {
    const { statusClass, borderClass, hypotheticalClass } = statusClasses;
    const escapedTooltip = tooltipContent.replace(/"/g, '&quot;');
    
    return `
        <div class="classroom-cell ${statusClass} ${borderClass} ${hypotheticalClass}"
             data-building="${buildingName}"
             data-room="${room}"
             style="transform: rotate(${buildingRotation}deg); position: relative;"
             title="${escapedTooltip}">
            <div class="classroom-content">
                ${showRoomNumber ? `<div class="classroom-number">${room}</div>` : ''}
                ${showRoomNumber ? enrollmentDisplay : ''}
            </div>
        </div>
    `;
}

/**
 * Create a simple classroom marker (for background map)
 */
function createSimpleClassroomMarker(room, buildingName, coursesInRoom, position, buildingRotation, mapInstance, isInUse, showRoomNumber, interactive) {
    const tooltipContent = buildSimpleTooltipContent(coursesInRoom);
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

    const icon = createClassroomIcon(classroomHtml, mapInstance);
    return L.marker([position.lat, position.lng], { 
        icon: icon,
        interactive: interactive
    });
}

/**
 * Build enrollment display for interactive map (uses max_enrollment)
 */
function buildInteractiveEnrollmentInfo(coursesInRoom) {
    let enrollmentDisplay = '';
    let isOverCapacity = false;

    if (coursesInRoom.length > 0) {
        const firstCourse = coursesInRoom[0];
        if (hasValidEnrollmentAndMaxEnrollment(firstCourse)) {
            enrollmentDisplay = `<div class="classroom-enrollment">${firstCourse.current_enrollment}/${firstCourse.max_enrollment}</div>`;
            isOverCapacity = firstCourse.current_enrollment > firstCourse.max_enrollment;
        }
    }

    return { display: enrollmentDisplay, isOverCapacity };
}

/**
 * Check if course has valid enrollment and max enrollment data
 */
function hasValidEnrollmentAndMaxEnrollment(course) {
    return course.current_enrollment !== null && 
           course.current_enrollment !== undefined &&
           course.max_enrollment !== null && 
           course.max_enrollment !== undefined;
}

/**
 * Get CSS classes for classroom status
 */
function getStatusClasses(isInUse, isOverCapacity) {
    if (!isInUse) {
        return 'classroom-available';
    }
    return isOverCapacity ? 'classroom-over-capacity' : 'classroom-in-use';
}

/**
 * Render the interactive visualization on the interactive map
 */
function renderInteractiveVisualization() {
    if (!interactiveMap) {
        console.error('Interactive map not initialized');
        return;
    }

    clearVisualization(interactiveMap, interactiveClassroomMarkers, interactiveBuildingPolygons);
    
    const filteredCourses = filterInteractiveCourses();
    const allClassrooms = getAllClassroomsByBuilding();
    const inUseClassrooms = getInUseClassrooms(filteredCourses);

    renderBuildings(interactiveMap, allClassrooms, inUseClassrooms, filteredCourses, {
        markers: interactiveClassroomMarkers,
        polygons: interactiveBuildingPolygons,
        showRoomNumbers: shouldShowRoomNumber(interactiveMap),
        interactive: true,
        useMaxEnrollment: true
    });

    console.log(`Rendered ${interactiveClassroomMarkers.length} classroom markers on interactive map`);
}

/**
 * Initialize the capacity-based Leaflet map
 */
function initCapacityMap() {
    const center = calculateMapCenter();
    
    capacityMap = L.map('map-container-capacity', {
        minZoom: CONSTANTS.MIN_ZOOM,
        zoomControl: true
    });

    capacityMap.setView(center, CONSTANTS.CAPACITY_MAP_ZOOM);
    addOSMTileLayer(capacityMap);
    setupMapZoomListener(capacityMap, renderCapacityVisualization);

    console.log('Capacity map initialized');
}

/**
 * Setup zoom event listener for a map
 */
function setupMapZoomListener(mapInstance, renderCallback) {
    mapInstance.on('zoomend', renderCallback);
}

/**
 * Set up the day selector buttons for capacity map
 */
function setupCapacityDaySelector() {
    setupDaySelector('day-selector-capacity', capacitySelectedDay, (dayCode) => {
        capacitySelectedDay = dayCode;
            renderCapacityVisualization();
    });
}

/**
 * Set up the time slider for capacity map
 */
function setupCapacityTimeSlider() {
    setupTimeSlider(
        'time-control-capacity',
        'time-slider-capacity',
        'time-display-capacity',
        capacitySelectedTime,
        (newTime) => {
            capacitySelectedTime = newTime;
            renderCapacityVisualization();
    }
    );
}

/**
 * Filter courses for capacity map based on selected day and time
 */
function filterCapacityCourses() {
    return filterCoursesByDayAndTime(capacitySelectedDay, capacitySelectedTime);
}

/**
 * Build enrollment display information for capacity map (uses capacity field)
 */
function buildCapacityEnrollmentInfo(buildingName, room, coursesInRoom) {
    let enrollmentDisplay = '';
    let isOverCapacity = false;
    let isAtOrOverCapacity = false;
    let isHypotheticalCapacity = false;

    // Get room capacity from any course that uses this room
            let roomCapacity = null;
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

            if (coursesInRoom.length > 0) {
                const firstCourse = coursesInRoom[0];
        if (hasValidEnrollmentAndCapacity(firstCourse)) {
                    enrollmentDisplay = `<div class="classroom-enrollment">${firstCourse.current_enrollment}/${firstCourse.capacity}</div>`;
                    isOverCapacity = firstCourse.current_enrollment > firstCourse.capacity;
                    isAtOrOverCapacity = firstCourse.current_enrollment >= firstCourse.capacity;
                    if (firstCourse.capacity_from_csv === false) {
                        isHypotheticalCapacity = true;
                    }
                }
            } else if (roomCapacity !== null) {
                enrollmentDisplay = `<div class="classroom-enrollment">0/${roomCapacity}</div>`;
            }

    return { display: enrollmentDisplay, isOverCapacity, isAtOrOverCapacity, isHypotheticalCapacity };
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
 * Render the capacity-based visualization on the capacity map
 */
function renderCapacityVisualization() {
    if (!capacityMap) {
        console.error('Capacity map not initialized');
        return;
    }

    clearVisualization(capacityMap, capacityClassroomMarkers, capacityBuildingPolygons);
    
    const filteredCourses = filterCapacityCourses();
    const allClassrooms = getAllClassroomsByBuilding();
    const inUseClassrooms = getInUseClassrooms(filteredCourses);

    renderBuildings(capacityMap, allClassrooms, inUseClassrooms, filteredCourses, {
        markers: capacityClassroomMarkers,
        polygons: capacityBuildingPolygons,
        showRoomNumbers: shouldShowRoomNumber(capacityMap),
        interactive: true,
        useCapacity: true
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
                <strong>Time:</strong> ${DAY_NAMES[opp.problemClass.day] || opp.problemClass.day}, ${opp.problemClass.time}
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

