/**
 * University Course Schedule Visualization
 * 
 * This application visualizes university course schedules by building and time.
 * Data is loaded from the cleaned JSON file and filtered by day and time selection.
 */

// Global state
let courseData = [];
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
        courseData = await response.json();
        console.log(`Loaded ${courseData.length} course meeting records`);
        
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
 * Render the main visualization
 */
function renderVisualization() {
    const container = document.getElementById('visualization');
    
    // Filter courses based on current selections (these are the active courses)
    const filteredCourses = filterCourses();
    
    // Get all classrooms by building
    const allClassrooms = getAllClassroomsByBuilding();
    const buildingNames = Object.keys(allClassrooms).sort();
    
    if (buildingNames.length === 0) {
        container.innerHTML = `
            <p class="no-results">
                No buildings found in course data
            </p>
        `;
        return;
    }
    
    // Get which classrooms are currently in use
    const inUseClassrooms = getInUseClassrooms(filteredCourses);
    
    // Build HTML
    let html = `<div class="buildings-grid">`;
    
    buildingNames.forEach(building => {
        const rooms = allClassrooms[building];
        const inUse = inUseClassrooms[building] || new Set();
        
        html += `
            <div class="building-container">
                <h3 class="building-name">${building}</h3>
                <div class="classrooms-grid">
                    ${rooms.map(room => {
                        const isInUse = inUse.has(room);
                        const statusClass = isInUse ? 'classroom-in-use' : 'classroom-available';
                        const coursesInRoom = getCoursesForRoom(filteredCourses, building, room);
                        
                        // Build tooltip content
                        let tooltipContent = '';
                        if (coursesInRoom.length > 0) {
                            tooltipContent = coursesInRoom.map(course => {
                                const startTime = formatTime(course.start_minutes);
                                const endTime = formatTime(course.end_minutes);
                                // Escape HTML but preserve <br> tags
                                const courseCode = (course.course || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                                const courseTitle = (course.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                                return `${courseCode} - ${courseTitle}<br>${startTime} - ${endTime}`;
                            }).join('<br><br>');
                        } else {
                            tooltipContent = 'Available';
                        }
                        
                        // Build enrollment/capacity display
                        let enrollmentDisplay = '';
                        if (coursesInRoom.length > 0) {
                            // Get enrollment info from the first course (or sum if multiple)
                            const firstCourse = coursesInRoom[0];
                            if (firstCourse.current_enrollment !== null && firstCourse.current_enrollment !== undefined &&
                                firstCourse.max_enrollment !== null && firstCourse.max_enrollment !== undefined) {
                                enrollmentDisplay = `<div class="classroom-enrollment">${firstCourse.current_enrollment}/${firstCourse.max_enrollment}</div>`;
                            }
                        }
                        
                        return `<div class="classroom-cell ${statusClass}" 
                                    data-building="${building}" 
                                    data-room="${room}"
                                    data-tooltip="${tooltipContent.replace(/"/g, '&quot;')}">
                                    <div class="classroom-content">
                                        <div class="classroom-number">${room}</div>
                                        ${enrollmentDisplay}
                                    </div>
                                </div>`;
                    }).join('')}
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    
    // Add hover event listeners for tooltips
    setupClassroomTooltips();
}

/**
 * Set up tooltip functionality for classroom cells
 */
function setupClassroomTooltips() {
    // Create a single reusable tooltip element
    let tooltip = document.querySelector('.classroom-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'classroom-tooltip';
        document.body.appendChild(tooltip);
    }
    
    const classroomCells = document.querySelectorAll('.classroom-cell');
    
    classroomCells.forEach(cell => {
        cell.addEventListener('mouseenter', (e) => {
            const rect = cell.getBoundingClientRect();
            tooltip.innerHTML = cell.dataset.tooltip;
            tooltip.style.display = 'block';
            
            // Position tooltip above the cell, centered
            const tooltipLeft = rect.left + rect.width / 2;
            const tooltipTop = rect.top - 10;
            tooltip.style.left = `${tooltipLeft}px`;
            tooltip.style.top = `${tooltipTop}px`;
            
            // Adjust position to keep tooltip on screen
            requestAnimationFrame(() => {
                const tooltipRect = tooltip.getBoundingClientRect();
                let adjustedLeft = tooltipLeft;
                let adjustedTop = tooltipTop;
                
                if (tooltipRect.left < 10) {
                    adjustedLeft = rect.left + 10;
                } else if (tooltipRect.right > window.innerWidth - 10) {
                    adjustedLeft = window.innerWidth - tooltipRect.width - 10;
                }
                
                if (tooltipRect.top < 10) {
                    adjustedTop = rect.bottom + 10;
                    tooltip.classList.add('tooltip-below');
                } else {
                    tooltip.classList.remove('tooltip-below');
                }
                
                tooltip.style.left = `${adjustedLeft}px`;
                tooltip.style.top = `${adjustedTop}px`;
            });
        });
        
        cell.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
}

/**
 * Render a single course card
 * @param {Object} course - Course record
 * @returns {string} HTML string for course card
 */
function renderCourseCard(course) {
    const startTime = formatTime(course.start_minutes);
    const endTime = formatTime(course.end_minutes);
    
    // Format enrollment badge for header
    let enrollmentBadge = '';
    if (course.current_enrollment !== null && course.current_enrollment !== undefined &&
        course.max_enrollment !== null && course.max_enrollment !== undefined) {
        const used = course.current_enrollment;
        const total = course.max_enrollment;
        enrollmentBadge = `<span class="enrollment-badge">${used}/${total}</span>`;
    } else if (course.current_enrollment !== null && course.current_enrollment !== undefined) {
        enrollmentBadge = `<span class="enrollment-badge">${course.current_enrollment} enrolled</span>`;
    } else if (course.max_enrollment !== null && course.max_enrollment !== undefined) {
        enrollmentBadge = `<span class="enrollment-badge">Capacity: ${course.max_enrollment}</span>`;
    }
    
    // Format seat information
    let seatInfo = '';
    if (course.current_enrollment !== null && course.current_enrollment !== undefined &&
        course.max_enrollment !== null && course.max_enrollment !== undefined) {
        const used = course.current_enrollment;
        const total = course.max_enrollment;
        const available = total - used;
        const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
        
        // Determine color class based on availability
        let seatClass = 'seats-normal';
        if (available === 0) {
            seatClass = 'seats-full';
        } else if (percentage >= 90) {
            seatClass = 'seats-warning';
        }
        
        seatInfo = `
            <div class="course-seats ${seatClass}">
                Seats: ${used} / ${total} (${available} available)
            </div>
        `;
    } else if (course.current_enrollment !== null && course.current_enrollment !== undefined) {
        seatInfo = `
            <div class="course-seats">
                Enrolled: ${course.current_enrollment}
            </div>
        `;
    } else if (course.max_enrollment !== null && course.max_enrollment !== undefined) {
        seatInfo = `
            <div class="course-seats">
                Capacity: ${course.max_enrollment}
            </div>
        `;
    }
    
    return `
        <div class="course-card">
            <div class="course-header">
                <span class="course-code">${course.course}</span>
                <div class="course-header-right">
                    ${enrollmentBadge}
                    <span class="course-type">${course.type}</span>
                </div>
            </div>
            <div class="course-title">${course.title}</div>
            <div class="course-details">
                <span>Section: ${course.section}</span>
                <span>Room: ${course.room}</span>
            </div>
            ${seatInfo}
            <div class="course-time">${startTime} - ${endTime}</div>
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

