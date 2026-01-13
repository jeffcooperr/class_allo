/**
 * University Course Schedule Visualization
 * 
 * This application visualizes university course schedules by building and time.
 * Data is loaded from the cleaned JSON file and filtered by day and time selection.
 */

// Global state
let courseData = [];
let buildingMetadata = {}; // Maps building name to {total_rooms, total_seats}
let roomMetadata = {}; // Maps "building:room" to {capacity}
let selectedDay = 'M';
let selectedTime = 480; // 8:00 AM in minutes (default)

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
        const data = await response.json();
        courseData = data.courses || data; // Support both new and old format
        buildingMetadata = data.buildingMetadata || {};
        roomMetadata = data.roomMetadata || {};
        console.log(`Loaded ${courseData.length} course meeting records`);
        console.log(`Found ${Object.keys(buildingMetadata).length} buildings with room data`);
        
        // Initialize UI components
        setupDaySelector();
        setupTimeSlider();
        
        // Render initial visualization
        renderVisualization();
        
    } catch (error) {
        console.error('Error initializing app:', error);
        document.getElementById('visualization').innerHTML = 
            `<p class="error">Error loading data: ${error.message}</p>`;
    }
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
 * Group courses by building
 * @param {Array} courses - Array of course records
 * @returns {Object} Object with building names as keys and arrays of courses as values
 */
function groupByBuilding(courses) {
    const grouped = {};
    courses.forEach(course => {
        const building = course.building;
        if (!grouped[building]) {
            grouped[building] = [];
        }
        grouped[building].push(course);
    });
    return grouped;
}

/**
 * Calculate the number of distinct rooms in use for a building
 * @param {Array} courses - Array of course records for a building
 * @returns {number} Number of distinct rooms in use
 */
function getRoomsInUse(courses) {
    const rooms = new Set();
    courses.forEach(course => {
        rooms.add(course.room);
    });
    return rooms.size;
}

/**
 * Calculate the total seats in use for a building
 * Sums up current enrollment for all active courses
 * @param {Array} courses - Array of course records for a building
 * @returns {number} Total seats currently in use
 */
function getSeatsInUse(courses) {
    return courses.reduce((total, course) => {
        return total + (course.current_enrollment || 0);
    }, 0);
}

/**
 * Get room capacity from metadata
 * @param {string} building - Building name
 * @param {string} room - Room number
 * @returns {number} Room capacity, or 0 if not found
 */
function getRoomCapacity(building, room) {
    const roomKey = `${building}:${room}`;
    const metadata = roomMetadata[roomKey];
    return metadata ? (metadata.capacity || 0) : 0;
}

/**
 * Get all rooms for a building from metadata
 * @param {string} building - Building name
 * @returns {Array} Array of room numbers
 */
function getAllRoomsForBuilding(building) {
    const rooms = [];
    for (const roomKey in roomMetadata) {
        if (roomKey.startsWith(`${building}:`)) {
            const room = roomKey.split(':')[1];
            rooms.push(room);
        }
    }
    // Sort rooms naturally (e.g., "101", "102", "201" instead of "101", "201", "102")
    return rooms.sort((a, b) => {
        // Try numeric sort first
        const numA = parseInt(a);
        const numB = parseInt(b);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        // Fall back to string sort
        return a.localeCompare(b);
    });
}

/**
 * Get courses for a specific room at the current time
 * @param {Array} courses - Array of all filtered courses
 * @param {string} building - Building name
 * @param {string} room - Room number
 * @returns {Array} Array of courses in that room
 */
function getCoursesForRoom(courses, building, room) {
    return courses.filter(course => 
        course.building === building && course.room === room
    );
}

/**
 * Render the main visualization
 */
function renderVisualization() {
    const container = document.getElementById('visualization');
    
    // Filter courses based on current selections
    const filteredCourses = filterCourses();
    
    // Get all buildings from metadata (not just those with active courses)
    // This ensures we show all buildings even if none have classes at this time
    const allBuildingNames = Object.keys(buildingMetadata).sort();
    
    if (allBuildingNames.length === 0) {
        container.innerHTML = `
            <p class="no-results">
                No building data available
            </p>
        `;
        return;
    }
    
    // Build HTML
    let html = `<div class="buildings-grid">`;
    
    allBuildingNames.forEach(building => {
        const buildingCourses = filteredCourses.filter(c => c.building === building);
        const roomsInUse = getRoomsInUse(buildingCourses);
        const seatsInUse = getSeatsInUse(buildingCourses);
        const buildingInfo = buildingMetadata[building] || {};
        const totalRooms = buildingInfo.total_rooms || 0;
        const totalSeats = buildingInfo.total_seats || 0;
        
        // Get all rooms for this building
        const allRooms = getAllRoomsForBuilding(building);
        
        html += `
            <div class="building-container">
                <div class="building-header">
                    <h3 class="building-name">${building}</h3>
                    <div class="utilization-stats">
                        <div class="room-utilization">
                            <span class="rooms-in-use">${roomsInUse}</span>
                            <span class="rooms-separator">of</span>
                            <span class="rooms-total">${totalRooms}</span>
                            <span class="rooms-label">rooms in use</span>
                        </div>
                        <div class="seat-utilization">
                            <span class="seats-in-use">${seatsInUse}</span>
                            <span class="seats-separator">of</span>
                            <span class="seats-total">${totalSeats}</span>
                            <span class="seats-label">seats in use</span>
                        </div>
                    </div>
                </div>
                <div class="rooms-grid">
                    ${allRooms.map(room => renderRoomBox(building, room, buildingCourses)).join('')}
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Render a room box in the grid
 * @param {string} building - Building name
 * @param {string} room - Room number
 * @param {Array} buildingCourses - All courses in this building at current time
 * @returns {string} HTML string for room box
 */
function renderRoomBox(building, room, buildingCourses) {
    const roomCourses = getCoursesForRoom(buildingCourses, building, room);
    const isInUse = roomCourses.length > 0;
    const roomCapacity = getRoomCapacity(building, room);
    
    // Calculate total enrollment in this room
    const totalEnrollment = roomCourses.reduce((sum, course) => {
        return sum + (course.current_enrollment || 0);
    }, 0);
    
    // Build popup content
    let popupContent = `
        <div class="popup-room-header">Room ${room}</div>
    `;
    
    if (roomCapacity > 0) {
        popupContent += `
            <div class="popup-room-capacity">Capacity: ${roomCapacity} seats</div>
        `;
    }
    
    if (isInUse) {
        popupContent += `<div class="popup-courses-list">`;
        roomCourses.forEach(course => {
            const startTime = formatTime(course.start_minutes);
            const endTime = formatTime(course.end_minutes);
            const currentEnroll = course.current_enrollment || 0;
            const maxEnroll = course.max_enrollment || 0;
            
            popupContent += `
                <div class="popup-course-item">
                    <div class="popup-course-code">${course.course} - ${course.type}</div>
                    <div class="popup-course-title">${course.title}</div>
                    <div class="popup-course-time">${startTime} - ${endTime}</div>
                    ${currentEnroll > 0 || maxEnroll > 0 ? `
                        <div class="popup-course-enrollment">
                            Enrollment: ${currentEnroll}${maxEnroll > 0 ? ` / ${maxEnroll}` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        popupContent += `</div>`;
        
        if (totalEnrollment > 0) {
            popupContent += `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0; font-size: 0.85em; color: #34495e; font-weight: 600;">
                    Total Enrollment: ${totalEnrollment}
                </div>
            `;
        }
    } else {
        popupContent += `
            <div class="popup-no-courses">Available</div>
        `;
    }
    
    return `
        <div class="room-box ${isInUse ? 'in-use' : 'available'}" 
             data-building="${building}"
             data-room="${room}">
            <div class="room-number">${room}</div>
            <div class="room-popup">
                ${popupContent}
            </div>
        </div>
    `;
}

/**
 * Get full day name from day code
 * @param {string} dayCode - Day code (M, T, W, R, F)
 * @returns {string} Full day name
 */
function getDayName(dayCode) {
    const dayMap = {
        'M': 'Monday',
        'T': 'Tuesday',
        'W': 'Wednesday',
        'R': 'Thursday',
        'F': 'Friday'
    };
    return dayMap[dayCode] || dayCode;
}


// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

