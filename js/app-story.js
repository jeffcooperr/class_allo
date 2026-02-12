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
let classroomMarkers = [];
let buildingPolygons = [];
const BASE_ICON_SIZE = 10;

// Time cycling configuration
const TIME_CYCLE_INTERVAL = 1000; // Change time every 2 seconds
const TIME_STEP = 30; // Step by 30 minutes each cycle
const MIN_TIME = 480; // 8:00 AM
const MAX_TIME = 1020; // 5:00 PM (17:00)

// Import building coordinates from the main map file
// (In a real scenario, you'd want to extract this to a shared module)
const buildingCoordinates = {
    'LAFAYE': {
        corners: [
            [44.47828, -73.19863],
            [44.47831, -73.19829],
            [44.4776, -73.19818],
            [44.47757, -73.19853]
        ],
        config: { rotation: -6, gridCols: 3, padding: 0.3 },
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
            [44.47597, -73.195399],
            [44.47597, -73.1951],
            [44.4758623, -73.1951],
            [44.4758597, -73.195399],
        ],
        config: { rotation: 0, gridCols: 3, padding: 0.3 },
    },
    'JEFFRD': {
        corners: [
            [44.4755743, -73.194024],
            [44.4754824, -73.1937439],
            [44.4751534, -73.1939514],
            [44.4752473, -73.1942352]
        ],
        config: { rotation: 25, gridCols: 3, padding: 0.3 },
    },
    'BLLNGS': {
        corners: [
            [44.4802999, -73.1989],
            [44.4803126, -73.1988639],
            [44.4801614, -73.1988329],
            [44.4801475, -73.1989]
        ],
        config: { rotation: 0, gridCols: 1, padding: 0.3 }
    },
    'L/L-A': {
        corners: [
            [44.473485, -73.194313],
            [44.473485, -73.19416],
            [44.4733591, -73.19416],
            [44.4733608, -73.194313]
        ],
        config: { rotation: 0, gridCols: 2, padding: 0.3 }
    },
    'PLB': {
        corners: [
            [44.4771964, -73.19479],
            [44.4771972, -73.1946677],
            [44.4767183, -73.1945845],
            [44.4767026, -73.1947]
        ],
        config: { rotation: -6, gridCols: 1, padding: 0.3 }
    },
    'ML SCI': {
        corners: [
            [44.4770436, -73.1956828],
            [44.4770603, -73.1954961],
            [44.4764931, -73.19549992],
            [44.4764774, -73.1955803]
        ],
        config: { rotation: -6, gridCols: 2, padding: 0.3 }
    },
    'WATERM': {
        corners: [
            [44.4785185, -73.201282],
            [44.4785032, -73.2009602],
            [44.4780197, -73.2009848],
            [44.478033, -73.2013048]
        ],
        config: { rotation: 3, gridCols: 3, padding: 0.3 }
    },
    'MORRIL': {
        corners: [
            [44.476715, -73.1984686],
            [44.476715, -73.1983426],
            [44.4765061, -73.1983012],
            [44.4764966, -73.1984284]
        ],
        config: { rotation: -6, gridCols: 1, padding: 0.3 }
    },
    'L/L-B': {
        corners: [
            [44.47393, -73.1944047],
            [44.47393, -73.194214],
            [44.4738672, -73.1941867],
            [44.4738521, -73.1943831]
        ],
        config: { rotation: 0, gridCols: 2, padding: 0.3 }
    },
    'GIVN E': {
        corners: [
            [44.4779676, -73.1938167],
            [44.4779861, -73.1935513],
            [44.4778616, -73.1935308],
            [44.4778449, -73.1937681]
        ],
        config: { rotation: -6, gridCols: 2, padding: 0.3 }
    },
    'GIVN C': {
        corners: [
            [44.4777519, -73.1937492],
            [44.4777697, -73.193522],
            [44.477676, -73.1934958],
            [44.4776574, -73.1937276]
        ],
        config: { rotation: -6, gridCols: 1, padding: 0.3 }
    },
    'WILLMS': {
        corners: [
            [44.4788211, -73.1990503],
            [44.4788444, -73.1988615],
            [44.4783140, -73.1987737],
            [44.4782955, -73.1989622],
            [44.4788146, -73.1990503],
        ],
        config: { rotation: -6, gridCols: 2, padding: 0.3 }
    },
    'FLEMIN': {
        corners: [
            [44.4800047, -73.1972216],
            [44.4800170, -73.1970884],
            [44.4799433, -73.1970771],
            [44.4799311, -73.1972073],
        ],
        config: { rotation: -6, gridCols: 2, padding: 0.3 }
    },
    'COHEN': {
        corners: [
            [44.4804172, -73.2031],
            [44.4804255, -73.20259],
            [44.4802, -73.2027484],
            [44.4802, -73.2031],
        ],
        config: { rotation: 0, gridCols: 4, padding: 0.3 }
    },
    'HARRIS': {
        corners: [
            [44.4717667, -73.1938416],
            [44.4716976, -73.1938631],
            [44.4716910, -73.1937056],
            [44.4718107, -73.1937859],
        ],
        config: { rotation: -6, gridCols: 2, padding: 0.3 }
    },
    'PERKIN': {
        corners: [
            [44.4798036, -73.1980158],
            [44.4797223, -73.1979950],
            [44.4797629, -73.1975675],
            [44.4798410, -73.1975823],
        ],
        config: { rotation: -6, gridCols: 1, padding: 0.3 }
    },
    'TERRIL': {
        corners: [
            [44.4761757, -73.1963110],
            [44.4760946, -73.1962954],
            [44.4761310, -73.1958260],
            [44.4762119, -73.1958426],
        ],
        config: { rotation: -6, gridCols: 1, padding: 0.3 }
    },
    'ROWELL': {
        corners: [
            [44.4778705, -73.1948774],
            [44.4775482, -73.1948243],
            [44.4775887, -73.1942762],
            [44.4779189, -73.1943433],
        ],
        config: { rotation: -6, gridCols: 4, padding: 0.3 }
    },
    'KALKIN': {
        corners: [
            [44.4794648, -73.1977390],
            [44.4791553, -73.1976921],
            [44.4791838, -73.1973536],
            [44.4794920, -73.1974091],
        ],
        config: { rotation: -6, gridCols: 3, padding: 0.3 }
    },
    'VOTEY': {
        corners: [
            [44.4795796, -73.1983439],
            [44.4790335, -73.1982504],
            [44.4790619, -73.1979025],
            [44.4796111, -73.1979980],
        ],
        config: { rotation: -6, gridCols: 6, padding: 0.3 }
    },
    'STAFFO': {
        corners: [
            [44.4765140, -73.1944828],
            [44.4762392, -73.1944322],
            [44.4762562, -73.1942481],
            [44.4765299, -73.1943016],
        ],
        config: { rotation: -6, gridCols: 3, padding: 0.3 }
    },
    'OMANEX': {
        corners: [
            [44.4778601, -73.1989535],
            [44.4777428, -73.1989287],
            [44.4777782, -73.1986012],
            [44.4778922, -73.1986234],
        ],
        config: { rotation: -6, gridCols: 2, padding: 0.3 }
    },
    'OLDMIL': {
        corners: [
            [44.4780237, -73.1988],
            [44.4779414, -73.1989850],
            [44.4779535, -73.1988],
            [44.4780329, -73.1988],
        ],
        config: { rotation: -6, gridCols: 3, padding: 0.3 }
    },
    'DISCOV': {
        corners: [
            [44.4787818, -73.1982659],
            [44.4782228, -73.1981752],
            [44.4782508, -73.1977740],
            [44.4788184, -73.1978591],
        ],
        config: { rotation: -6, gridCols: 6, padding: 0.3 }
    },
    'INNOV': {
        corners: [
            [44.4785513, -73.1976819],
            [44.4781970, -73.1976202],
            [44.4782128, -73.1974045],
            [44.4785691, -73.1974669],
        ],
        config: { rotation: -6, gridCols: 4, padding: 0.3 }
    },
    'IFSHIN': {
        corners: [
            [44.4795511, -73.1977515],
            [44.4794863, -73.1977350],
            [44.4795023, -73.1975381],
            [44.4795682, -73.1975543],
        ],
        config: { rotation: -6, gridCols: 1, padding: 0.3 }
    },
    'L/L CM': {
        corners: [
            [44.4737660, -73.1948873],
            [44.4736284, -73.1948555],
            [44.4736432, -73.1947012],
            [44.4737834, -73.1947314],
        ],
        config: { rotation: -6, gridCols: 2, padding: 0.3 }
    },
    'L/L-D': {
        corners: [
            [44.4735371, -73.1952654],
            [44.4734712, -73.1952510],
            [44.4734781, -73.1951552],
            [44.4735462, -73.1951673],
        ],
        config: { rotation: -6, gridCols: 2, padding: 0.3 }
    },
    'MARSH': {
        corners: [
            [44.4728394, -73.1935773],
            [44.4727829, -73.1935612],
            [44.4727886, -73.1934781],
            [44.4728470, -73.1934942],
        ],
        config: { rotation: -6, gridCols: 2, padding: 0.3 }
    },
    'RT THR': {
        corners: [
            [44.4774534, -73.1983893],
            [44.4774684, -73.1981969],
            [44.4773711, -73.1981774],
            [44.4773558, -73.1983691],
        ],
        config: { rotation: -6, gridCols: 2, padding: 0.3 }
    },
    '70S WL': {
        corners: [
            [44.4787183, -73.2028294],
            [44.4787071, -73.2028267],
            [44.4787081, -73.2027507],
            [44.4787193, -73.2027543],
        ],
        config: { rotation: 0, gridCols: 2, padding: 0.3 }
    },
    'ALLEN': {
        corners: [
            [44.4761473, -73.2004926],
            [44.4761024, -73.2004907],
            [44.4761027, -73.2004153],
            [44.4761481, -73.2004152],
        ],
        config: { rotation: 0, gridCols: 2, padding: 0.3 }
    },
    'DELEHA': {
        corners: [
            [44.4828630, -73.1943482],
            [44.4827176, -73.1943388],
            [44.4827204, -73.1941675],
            [44.4828630, -73.1941747],
        ],
        config: { rotation: 0, gridCols: 2, padding: 0.3 }
    },
    'DEWEY': {
        corners: [
            [44.4811154, -73.2004701],
            [44.4809860, -73.2005110],
            [44.4809100, -73.2000543],
            [44.4810407, -73.2000147],
        ],
        config: { rotation: 13, gridCols: 2, padding: 0.3 }
    },
    'HSRF': {
        corners: [
            [44.4770330, -73.1939628],
            [44.4767412, -73.1939174],
            [44.4767536, -73.1937446],
            [44.4770452, -73.1937908],
        ],
        config: { rotation: 0, gridCols: 3, padding: 0.3 }
    },
    'MANN': {
        corners: [
            [44.4825224, -73.1937884],
            [44.4824129, -73.1937062],
            [44.4825802, -73.1933009],
            [44.4826772, -73.1933970],
        ],
        config: { rotation: 0, gridCols: 2, padding: 0.3 }
    },
    '31 SPR': {
        corners: [
            [44.4798016, -73.2007702],
            [44.4797593, -73.2007683],
            [44.4797586, -73.2007232],
            [44.4798012, -73.2007223],
        ],
        config: { rotation: 0, gridCols: 2, padding: 0.3 }
    },
    'MUSIC': {
        corners: [
            [44.4697162, -73.1979479],
            [44.4696408, -73.1979449],
            [44.4696445, -73.1977524],
            [44.4697163, -73.1977603],
        ],
        config: { rotation: 0, gridCols: 1, padding: 0.3 }
    },
    'SOUTHW': {
        corners: [
            [44.4696110, -73.1980688],
            [44.4695153, -73.1980636],
            [44.4695161, -73.1974651],
            [44.4696143, -73.1974657],
        ],
        config: { rotation: 0, gridCols: 1, padding: 0.3 }
    },
    'PATGYM': {
        corners: [
            [44.4703837, -73.1950082],
            [44.4701472, -73.1949591],
            [44.4701859, -73.1944862],
            [44.4704264, -73.1945326],
        ],
        config: { rotation: -6, gridCols: 3, padding: 0.3 }
    },
    'POMERO': {
        corners: [
            [44.4759640, -73.1993598],
            [44.4759281, -73.1993554],
            [44.4759312, -73.1993293],
            [44.4759656, -73.1993300],
        ],
        config: { rotation: 0, gridCols: 2, padding: 0.3 }
    },
    'UHTN': {
        corners: [
            [44.4729523, -73.1958147],
            [44.4728399, -73.1958111],
            [44.4728361, -73.1956019],
            [44.4729471, -73.1956153],
        ],
        config: { rotation: 0, gridCols: 2, padding: 0.3 }
    },
    'UHTS23': {
        corners: [
            [44.4721624, -73.1956773],
            [44.4720556, -73.1956809],
            [44.4720579, -73.1955023],
            [44.4721678, -73.1955064],
        ],
        config: { rotation: 0, gridCols: 1, padding: 0.3 }
    },
    'WHEELR': {
        corners: [
            [44.4768096, -73.2015600],
            [44.4767365, -73.2015586],
            [44.4767386, -73.2014617],
            [44.4768139, -73.2014631],
        ],
        config: { rotation: 0, gridCols: 1, padding: 0.3 }
    },
};

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

        // Initialize map
        initMap();

        // Render initial visualization
        renderVisualization();

        // Start time cycling
        startTimeCycle();

        // Populate dataset section
        populateDatasetSection();

        // Setup scroll observers
        setupScrollObservers();

        // Setup scroll snapping
        setupScrollSnapping();

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
 * Start automatic time cycling
 */
function startTimeCycle() {
    setInterval(() => {
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
 * Populate the dataset section with statistics and sample data
 */
function populateDatasetSection() {
    const stats = calculateDatasetStats();
    
    // Update statistics
    document.getElementById('stat-courses').textContent = stats.totalMeetings.toLocaleString();
    document.getElementById('stat-buildings').textContent = stats.totalBuildings;
    document.getElementById('stat-classrooms').textContent = stats.totalClassrooms.toLocaleString();
    document.getElementById('stat-courses-unique').textContent = stats.totalUniqueCourses.toLocaleString();
    
    // Populate sample data table (show 5 random samples)
    const sampleSize = Math.min(5, courseData.length);
    const shuffled = [...courseData].sort(() => 0.5 - Math.random());
    const samples = shuffled.slice(0, sampleSize);
    
    const tbody = document.getElementById('sample-data-body');
    tbody.innerHTML = '';
    
    samples.forEach(course => {
        const row = document.createElement('tr');
        
        const startTime = formatTime(course.start_minutes);
        const endTime = formatTime(course.end_minutes);
        const timeRange = `${startTime} - ${endTime}`;
        
        const enrollment = course.current_enrollment !== null && course.max_enrollment !== null
            ? `${course.current_enrollment}/${course.max_enrollment}`
            : 'N/A';
        
        row.innerHTML = `
            <td><strong>${course.course || 'N/A'}</strong></td>
            <td>${course.title || 'N/A'}</td>
            <td>${course.building || 'N/A'}</td>
            <td>${course.room || 'N/A'}</td>
            <td>${course.day || 'N/A'}</td>
            <td>${timeRange}</td>
            <td>${enrollment}</td>
        `;
        
        tbody.appendChild(row);
    });
}

/**
 * Setup Intersection Observer to dim map when dataset section is in view
 */
function setupScrollObservers() {
    const mapContainer = document.getElementById('map-container');
    const datasetSection = document.getElementById('dataset-section');
    
    if (!datasetSection || !mapContainer) {
        return;
    }
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Section is in view - dim the map
                mapContainer.classList.add('dimmed');
            } else {
                // Section is out of view - restore map opacity
                mapContainer.classList.remove('dimmed');
            }
        });
    }, {
        threshold: 0.2 // Trigger when 20% of section is visible
    });
    
    observer.observe(datasetSection);
}

/**
 * Setup scroll snapping behavior - one scroll = one section
 */
function setupScrollSnapping() {
    let isScrolling = false;
    let scrollTimeout = null;
    
    // Get all sections
    const sections = document.querySelectorAll('section[class^="section-"]');
    
    if (sections.length === 0) {
        return;
    }
    
    // Handle wheel events for precise section snapping
    let lastScrollTime = 0;
    const scrollCooldown = 500; // Minimum time between scrolls (ms)
    
    window.addEventListener('wheel', (e) => {
        const now = Date.now();
        
        // Prevent scrolling if we're in cooldown period
        if (now - lastScrollTime < scrollCooldown) {
            e.preventDefault();
            return;
        }
        
        // Find current section
        const currentScroll = window.scrollY;
        const viewportHeight = window.innerHeight;
        let currentSectionIndex = -1;
        
        sections.forEach((section, index) => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            // Check if we're in this section (with some tolerance)
            if (currentScroll >= sectionTop - viewportHeight * 0.3 && 
                currentScroll < sectionBottom - viewportHeight * 0.3) {
                currentSectionIndex = index;
            }
        });
        
        // If we couldn't find current section, determine it based on scroll position
        if (currentSectionIndex === -1) {
            sections.forEach((section, index) => {
                if (currentScroll < section.offsetTop + section.offsetHeight / 2) {
                    if (currentSectionIndex === -1) {
                        currentSectionIndex = index;
                    }
                }
            });
            if (currentSectionIndex === -1) {
                currentSectionIndex = sections.length - 1;
            }
        }
        
        // Determine scroll direction
        const scrollDown = e.deltaY > 0;
        
        // Calculate next section
        let nextSectionIndex = currentSectionIndex;
        if (scrollDown && currentSectionIndex < sections.length - 1) {
            nextSectionIndex = currentSectionIndex + 1;
        } else if (!scrollDown && currentSectionIndex > 0) {
            nextSectionIndex = currentSectionIndex - 1;
        }
        
        // If we're moving to a different section, snap to it
        if (nextSectionIndex !== currentSectionIndex) {
            e.preventDefault();
            lastScrollTime = now;
            
            const nextSection = sections[nextSectionIndex];
            nextSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }, { passive: false });
    
    // Also handle touch events for mobile
    let touchStartY = 0;
    let touchEndY = 0;
    
    window.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    window.addEventListener('touchend', (e) => {
        touchEndY = e.changedTouches[0].clientY;
        const touchDiff = touchStartY - touchEndY;
        const minSwipeDistance = 50;
        
        if (Math.abs(touchDiff) > minSwipeDistance) {
            const currentScroll = window.scrollY;
            const viewportHeight = window.innerHeight;
            let currentSectionIndex = -1;
            
            sections.forEach((section, index) => {
                const sectionTop = section.offsetTop;
                if (currentScroll >= sectionTop - viewportHeight * 0.3 && 
                    currentScroll < sectionTop + section.offsetHeight - viewportHeight * 0.3) {
                    currentSectionIndex = index;
                }
            });
            
            if (currentSectionIndex === -1) {
                sections.forEach((section, index) => {
                    if (currentScroll < section.offsetTop + section.offsetHeight / 2) {
                        if (currentSectionIndex === -1) {
                            currentSectionIndex = index;
                        }
                    }
                });
                if (currentSectionIndex === -1) {
                    currentSectionIndex = sections.length - 1;
                }
            }
            
            const scrollDown = touchDiff < 0;
            let nextSectionIndex = currentSectionIndex;
            
            if (scrollDown && currentSectionIndex < sections.length - 1) {
                nextSectionIndex = currentSectionIndex + 1;
            } else if (!scrollDown && currentSectionIndex > 0) {
                nextSectionIndex = currentSectionIndex - 1;
            }
            
            if (nextSectionIndex !== currentSectionIndex) {
                const now = Date.now();
                if (now - lastScrollTime >= scrollCooldown) {
                    lastScrollTime = now;
                    const nextSection = sections[nextSectionIndex];
                    nextSection.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            }
        }
    }, { passive: true });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

