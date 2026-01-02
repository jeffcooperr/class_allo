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
 * Render the main visualization
 */
function renderVisualization() {
    const container = document.getElementById('visualization');
    
    // Filter courses based on current selections
    const filteredCourses = filterCourses();
    
    if (filteredCourses.length === 0) {
        container.innerHTML = `
            <p class="no-results">
                No classes found for ${getDayName(selectedDay)} at ${formatTime(selectedTime)}
            </p>
        `;
        return;
    }
    
    // Group by building
    const buildings = groupByBuilding(filteredCourses);
    const buildingNames = Object.keys(buildings).sort();
    
    // Build HTML
    let html = `<div class="buildings-grid">`;
    
    buildingNames.forEach(building => {
        const courses = buildings[building];
        html += `
            <div class="building-container">
                <h3 class="building-name">${building}</h3>
                <div class="courses-list">
                    ${courses.map(course => renderCourseCard(course)).join('')}
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Render a single course card
 * @param {Object} course - Course record
 * @returns {string} HTML string for course card
 */
function renderCourseCard(course) {
    const startTime = formatTime(course.start_minutes);
    const endTime = formatTime(course.end_minutes);
    
    return `
        <div class="course-card">
            <div class="course-header">
                <span class="course-code">${course.course}</span>
                <span class="course-type">${course.type}</span>
            </div>
            <div class="course-title">${course.title}</div>
            <div class="course-details">
                <span>Section: ${course.section}</span>
                <span>Room: ${course.room}</span>
            </div>
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

