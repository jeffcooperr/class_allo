/**
 * Analytics Page - General Statistics
 * 
 * Calculates and displays key statistics about course enrollment and room capacity
 */

// ============================================================================
// Constants
// ============================================================================

const CAMPUS_CENTER = {
    lat: 44.47798293916087,
    lng: -73.19652807301023
};

const BACKGROUND_MAP_ZOOM = 18;

// ============================================================================
// Global State
// ============================================================================

let courseData = [];
let map = null;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the analytics page
 */
async function init() {
    await loadCourseData();
    
    // Initialize background map
    initMap();
    
    // Calculate general stats
    const enrollmentStats = calculateEnrollmentStats();
    const capacityStats = calculateCapacityStats();
    
    // Display stats
    displayEnrollmentStats(enrollmentStats);
    displayCapacityStats(capacityStats);
    
    // Calculate and display timeslots
    const timeslotsByDay = calculateTimeslotsByDay();
    displayTimeslotsTable(timeslotsByDay);
    
    // Calculate and display peak times with room usage
    const peakTimesData = calculatePeakTimesAndRoomUsage(timeslotsByDay);
    displayPeakTimes(peakTimesData);
    
    // Calculate and display top used buildings
    const topBuildings = calculateTopBuildings();
    displayTopBuildings(topBuildings, 8);
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
    }).setView([CAMPUS_CENTER.lat, CAMPUS_CENTER.lng], BACKGROUND_MAP_ZOOM);

    addDarkTileLayer(map);
    console.log('Background map initialized (non-interactive)');
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
 * Load course data from JSON file
 */
async function loadCourseData() {
    const response = await fetch('data/2025_fall_cleaned.json');
    if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
    }
    courseData = await response.json();
    console.log(`Loaded ${courseData.length} course meeting records`);
    
    // Count unique courses (grouped by course + section)
    const uniqueCourses = new Set();
    courseData.forEach(meeting => {
        uniqueCourses.add(`${meeting.course}|${meeting.section}`);
    });
    console.log(`Unique courses: ${uniqueCourses.size}`);
}

// ============================================================================
// Statistics Calculations
// ============================================================================

/**
 * Calculate enrollment statistics (max_enrollment vs current_enrollment)
 * Groups by course + section to count unique courses, not individual meeting times
 * Returns:
 * - atOrOver: courses where current_enrollment >= max_enrollment
 * - exceeding: courses where current_enrollment > max_enrollment
 * - avgOver: average number of students over max_enrollment for exceeding courses
 */
function calculateEnrollmentStats() {
    // Group by course + section to get unique courses
    const courseMap = new Map();
    
    courseData.forEach(meeting => {
        const courseKey = `${meeting.course}|${meeting.section}`;
        
        // Skip if we don't have enrollment data
        const current = meeting.current_enrollment;
        const max = meeting.max_enrollment;
        
        if (current === null || current === undefined || 
            max === null || max === undefined) {
            return;
        }
        
        // Store enrollment data for this course (same across all meetings)
        if (!courseMap.has(courseKey)) {
            courseMap.set(courseKey, {
                current_enrollment: current,
                max_enrollment: max
            });
        }
    });
    
    // Count unique courses
    let atOrOverCount = 0;
    let exceedingCount = 0;
    let totalOver = 0;
    
    courseMap.forEach(course => {
        const current = course.current_enrollment;
        const max = course.max_enrollment;
        
        // Count at or over max enrollment
        if (current >= max) {
            atOrOverCount++;
            
            // Count exceeding max enrollment
            if (current > max) {
                exceedingCount++;
                totalOver += (current - max);
            }
        }
    });
    
    const avgOver = exceedingCount > 0 ? (totalOver / exceedingCount).toFixed(1) : 0;
    
    return {
        atOrOver: atOrOverCount,
        exceeding: exceedingCount,
        avgOver: parseFloat(avgOver),
        totalOver: totalOver
    };
}

/**
 * Calculate capacity statistics (room capacity vs current_enrollment)
 * Groups by course + section to count unique courses, not individual meeting times
 * Only includes courses where capacity_from_csv === true (we know the true capacity)
 * Returns:
 * - atOrOver: courses where current_enrollment >= capacity (with true capacity)
 * - exceeding: courses where current_enrollment > capacity (with true capacity)
 * - avgOver: average number of students over capacity for exceeding courses
 * - totalWithTrueCapacity: total courses with capacity_from_csv === true
 */
function calculateCapacityStats() {
    // Group by course + section to get unique courses
    const courseMap = new Map();
    
    courseData.forEach(meeting => {
        // Only analyze classes where we have true capacity from CSV
        if (meeting.capacity_from_csv !== true) {
            return;
        }
        
        const courseKey = `${meeting.course}|${meeting.section}`;
        
        const current = meeting.current_enrollment;
        const capacity = meeting.capacity;
        
        // Skip if we don't have both values
        if (current === null || current === undefined || 
            capacity === null || capacity === undefined) {
            return;
        }
        
        // Store capacity data for this course (same across all meetings)
        if (!courseMap.has(courseKey)) {
            courseMap.set(courseKey, {
                current_enrollment: current,
                capacity: capacity
            });
        }
    });
    
    // Count unique courses
    let atOrOverCount = 0;
    let exceedingCount = 0;
    let totalOver = 0;
    let totalWithTrueCapacity = courseMap.size;
    
    courseMap.forEach(course => {
        const current = course.current_enrollment;
        const capacity = course.capacity;
        
        // Count at or over room capacity
        if (current >= capacity) {
            atOrOverCount++;
            
            // Count exceeding room capacity
            if (current > capacity) {
                exceedingCount++;
                totalOver += (current - capacity);
            }
        }
    });
    
    const avgOver = exceedingCount > 0 ? (totalOver / exceedingCount).toFixed(1) : 0;
    
    return {
        atOrOver: atOrOverCount,
        exceeding: exceedingCount,
        avgOver: parseFloat(avgOver),
        totalOver: totalOver,
        totalWithTrueCapacity: totalWithTrueCapacity
    };
}

// ============================================================================
// Display Functions
// ============================================================================

/**
 * Display enrollment statistics on the page
 */
function displayEnrollmentStats(stats) {
    // At or over max enrollment
    const atOrOverEl = document.getElementById('stat-enrollment-at-or-over');
    if (atOrOverEl) {
        atOrOverEl.textContent = stats.atOrOver.toLocaleString();
    }
    
    // Exceeding max enrollment
    const exceedingEl = document.getElementById('stat-enrollment-exceeding');
    if (exceedingEl) {
        exceedingEl.textContent = stats.exceeding.toLocaleString();
    }
    
    // Average over max enrollment
    const avgOverEl = document.getElementById('stat-enrollment-avg-over');
    if (avgOverEl) {
        avgOverEl.textContent = stats.avgOver.toFixed(1);
    }
}

/**
 * Display capacity statistics on the page
 */
function displayCapacityStats(stats) {
    // At or over room capacity
    const atOrOverEl = document.getElementById('stat-capacity-at-or-over');
    if (atOrOverEl) {
        atOrOverEl.textContent = stats.atOrOver.toLocaleString();
    }
    
    // Exceeding room capacity
    const exceedingEl = document.getElementById('stat-capacity-exceeding');
    if (exceedingEl) {
        exceedingEl.textContent = stats.exceeding.toLocaleString();
    }
    
    // Average over room capacity
    const avgOverEl = document.getElementById('stat-capacity-avg-over');
    if (avgOverEl) {
        avgOverEl.textContent = stats.avgOver.toFixed(1);
    }
    
    // Total with true capacity (for context)
    const totalTrueCapacityEl = document.getElementById('stat-total-true-capacity');
    if (totalTrueCapacityEl) {
        totalTrueCapacityEl.textContent = stats.totalWithTrueCapacity.toLocaleString();
    }
}

// ============================================================================
// Timeslots Calculation and Display
// ============================================================================

/**
 * Convert minutes from midnight to HH:MM format
 */
function minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate timeslots by day (no rounding, exact times)
 * Returns an object with day keys (M, T, W, R, F) containing arrays of {timeSlot, count} sorted by count
 */
function calculateTimeslotsByDay() {
    const timeSlotsByDay = {
        'M': new Map(),
        'T': new Map(),
        'W': new Map(),
        'R': new Map(),
        'F': new Map()
    };
    
    // Count class meetings by day and exact timeslot
    courseData.forEach(meeting => {
        const day = meeting.day;
        const startMinutes = meeting.start_minutes;
        const endMinutes = meeting.end_minutes;
        
        if (day && (day === 'M' || day === 'T' || day === 'W' || day === 'R' || day === 'F') && 
            startMinutes !== null && startMinutes !== undefined && 
            endMinutes !== null && endMinutes !== undefined) {
            
            const timeSlot = `${minutesToTime(startMinutes)}-${minutesToTime(endMinutes)}`;
            
            if (!timeSlotsByDay[day].has(timeSlot)) {
                timeSlotsByDay[day].set(timeSlot, 0);
            }
            timeSlotsByDay[day].set(timeSlot, timeSlotsByDay[day].get(timeSlot) + 1);
        }
    });
    
    // Convert to sorted arrays
    const result = {};
    const dayOrder = ['M', 'T', 'W', 'R', 'F'];
    
    dayOrder.forEach(day => {
        const slots = Array.from(timeSlotsByDay[day].entries())
            .map(([timeSlot, count]) => ({ timeSlot, count }))
            .sort((a, b) => b.count - a.count); // Sort by count descending
        
        result[day] = slots;
    });
    
    return result;
}

/**
 * Display timeslots in a table format
 */
function displayTimeslotsTable(timeslotsByDay) {
    const tbody = document.getElementById('timeslots-tbody');
    if (!tbody) return;
    
    // Find the maximum number of rows needed (longest day)
    const maxRows = Math.max(
        timeslotsByDay.M.length,
        timeslotsByDay.T.length,
        timeslotsByDay.W.length,
        timeslotsByDay.R.length,
        timeslotsByDay.F.length
    );
    
    // Clear existing content
    tbody.innerHTML = '';
    
    // Create rows
    for (let i = 0; i < maxRows; i++) {
        const row = document.createElement('tr');
        
        // Rank column
        const rankCell = document.createElement('td');
        rankCell.textContent = i + 1;
        rankCell.style.fontWeight = '600';
        rankCell.style.color = 'rgba(255, 255, 255, 0.8)';
        row.appendChild(rankCell);
        
        // Day columns
        const dayOrder = ['M', 'T', 'W', 'R', 'F'];
        dayOrder.forEach(day => {
            const cell = document.createElement('td');
            
            if (i < timeslotsByDay[day].length) {
                const slot = timeslotsByDay[day][i];
                const cellDiv = document.createElement('div');
                cellDiv.className = 'timeslot-cell';
                
                const timeDiv = document.createElement('div');
                timeDiv.className = 'timeslot-time';
                timeDiv.textContent = slot.timeSlot;
                
                const countDiv = document.createElement('div');
                countDiv.className = 'timeslot-count';
                countDiv.textContent = `${slot.count} meetings`;
                
                cellDiv.appendChild(timeDiv);
                cellDiv.appendChild(countDiv);
                cell.appendChild(cellDiv);
            } else {
                cell.className = 'timeslot-empty';
                cell.textContent = '—';
            }
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    }
}

/**
 * Calculate peak times and room usage for each day
 * Finds the single time (not a range) where there are the most class meetings, including overlaps
 * Returns object with day keys containing {peakTime, peakTimeDisplay, peakCount, roomsUsed, totalRooms, totalCurrentEnrollment, totalMaxEnrollment, knownEnrollment, knownCapacity, estimatedEnrollment, estimatedCapacity, verifiedCapacity, utilization}
 */
function calculatePeakTimesAndRoomUsage(timeslotsByDay) {
    // First, get total unique rooms on campus
    const allRooms = new Set();
    courseData.forEach(meeting => {
        if (meeting.building && meeting.room) {
            const roomKey = `${meeting.building}|${meeting.room}`;
            allRooms.add(roomKey);
        }
    });
    const totalRooms = allRooms.size;
    
    const result = {};
    const dayOrder = ['M', 'T', 'W', 'R', 'F'];
    const dayNames = {
        'M': { name: 'Monday', class: 'monday' },
        'T': { name: 'Tuesday', class: 'tuesday' },
        'W': { name: 'Wednesday', class: 'wednesday' },
        'R': { name: 'Thursday', class: 'thursday' },
        'F': { name: 'Friday', class: 'friday' }
    };
    
    // Time range to check: 8 AM to 6 PM (480 to 1080 minutes)
    const minTime = 480;  // 8:00 AM
    const maxTime = 1080; // 6:00 PM
    const timeStep = 15;  // Check every 15 minutes for efficiency
    
    dayOrder.forEach(day => {
        // Find the time with the most class meetings
        let peakTime = null;
        let peakCount = 0;
        const timeCounts = new Map(); // Track count for each time
        
        // Check each time in the day
        for (let time = minTime; time <= maxTime; time += timeStep) {
            let count = 0;
            
            // Count classes active at this time (classStart <= time < classEnd)
            courseData.forEach(meeting => {
                if (meeting.day === day && 
                    meeting.start_minutes !== null && 
                    meeting.start_minutes !== undefined &&
                    meeting.end_minutes !== null && 
                    meeting.end_minutes !== undefined) {
                    
                    const classStart = meeting.start_minutes;
                    const classEnd = meeting.end_minutes;
                    
                    // Class is active if it starts before or at this time and ends after this time
                    if (classStart <= time && classEnd > time) {
                        count++;
                    }
                }
            });
            
            timeCounts.set(time, count);
            
            if (count > peakCount) {
                peakCount = count;
                peakTime = time;
            }
        }
        
        if (peakTime === null || peakCount === 0) {
            result[day] = {
                dayName: dayNames[day].name,
                dayClass: dayNames[day].class,
                peakTime: null,
                peakTimeDisplay: null,
                peakCount: 0,
                roomsUsed: 0,
                totalRooms: totalRooms,
                totalCurrentEnrollment: 0,
                totalMaxEnrollment: 0,
                knownEnrollment: 0,
                knownCapacity: 0,
                estimatedEnrollment: 0,
                estimatedCapacity: 0,
                verifiedCapacity: 0,
                utilization: 0
            };
            return;
        }
        
        // Now calculate statistics for the peak time
        const roomsUsedSet = new Set();
        let totalCurrentEnrollment = 0;
        let totalMaxEnrollment = 0;
        
        // Capacity calculations (separate known vs estimated)
        let knownEnrollment = 0;
        let knownCapacity = 0;
        let estimatedEnrollment = 0;
        let estimatedCapacity = 0;
        let verifiedCapacity = 0; // Only capacity where capacity_from_csv === true
        
        courseData.forEach(meeting => {
            if (meeting.day === day && 
                meeting.start_minutes !== null && 
                meeting.start_minutes !== undefined &&
                meeting.end_minutes !== null && 
                meeting.end_minutes !== undefined) {
                
                const classStart = meeting.start_minutes;
                const classEnd = meeting.end_minutes;
                
                // Check if class is active at peak time (classStart <= peakTime < classEnd)
                if (classStart <= peakTime && classEnd > peakTime) {
                    // Count distinct rooms
                    if (meeting.building && meeting.room) {
                        const roomKey = `${meeting.building}|${meeting.room}`;
                        roomsUsedSet.add(roomKey);
                    }
                    
                    // Sum enrollment data
                    const currentEnroll = meeting.current_enrollment;
                    const capacity = meeting.capacity;
                    const hasKnownCapacity = meeting.capacity_from_csv === true;
                    
                    if (currentEnroll !== null && currentEnroll !== undefined) {
                        totalCurrentEnrollment += currentEnroll;
                        
                        // Separate by known vs estimated capacity
                        if (hasKnownCapacity && capacity !== null && capacity !== undefined) {
                            knownEnrollment += currentEnroll;
                            knownCapacity += capacity;
                            verifiedCapacity += capacity;
                        } else if (capacity !== null && capacity !== undefined) {
                            estimatedEnrollment += currentEnroll;
                            estimatedCapacity += capacity;
                        }
                    }
                    if (meeting.max_enrollment !== null && meeting.max_enrollment !== undefined) {
                        totalMaxEnrollment += meeting.max_enrollment;
                    }
                }
            }
        });
        
        // Calculate utilization %: enrollment / verified_capacity * 100
        const utilization = verifiedCapacity > 0 
            ? ((totalCurrentEnrollment / verifiedCapacity) * 100).toFixed(1)
            : 0;
        
        // Format peak time for display
        const peakTimeDisplay = minutesToTime(peakTime);
        
        result[day] = {
            dayName: dayNames[day].name,
            dayClass: dayNames[day].class,
            peakTime: peakTime,
            peakTimeDisplay: peakTimeDisplay,
            peakCount: peakCount,
            roomsUsed: roomsUsedSet.size,
            totalRooms: totalRooms,
            totalCurrentEnrollment: totalCurrentEnrollment,
            totalMaxEnrollment: totalMaxEnrollment,
            knownEnrollment: knownEnrollment,
            knownCapacity: knownCapacity,
            estimatedEnrollment: estimatedEnrollment,
            estimatedCapacity: estimatedCapacity,
            verifiedCapacity: verifiedCapacity,
            utilization: parseFloat(utilization)
        };
    });
    
    return result;
}

/**
 * Display peak times and room usage
 */
function displayPeakTimes(peakTimesData) {
    const grid = document.getElementById('peak-times-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Hardcoded peak usage data
    const peakData = {
        'M': {
            dayName: 'Monday',
            dayClass: 'monday',
            time: '1:15 PM',
            meetings: 178,
            roomsOccupied: 149,
            enrolled: 4924,
            maxEnrollment: 6340,
            occupiedRoomCapacity: 7167,
            occupiedVerified: { capacity: 5746, rooms: 98 },
            occupiedEstimated: { capacity: 1421, rooms: 51 },
            emptyRooms: 90,
            emptySeats: 2215,
            emptyVerified: { seats: 355, rooms: 13 },
            emptyEstimated: { seats: 1860, rooms: 77 }
        },
        'T': {
            dayName: 'Tuesday',
            dayClass: 'tuesday',
            time: '10:05 AM',
            meetings: 217,
            roomsOccupied: 166,
            enrolled: 6157,
            maxEnrollment: 7977,
            occupiedRoomCapacity: 8369,
            occupiedVerified: { capacity: 5875, rooms: 101 },
            occupiedEstimated: { capacity: 2494, rooms: 65 },
            emptyRooms: 73,
            emptySeats: 1688,
            emptyVerified: { seats: 226, rooms: 10 },
            emptyEstimated: { seats: 1462, rooms: 63 }
        },
        'W': {
            dayName: 'Wednesday',
            dayClass: 'wednesday',
            time: '1:15 PM',
            meetings: 191,
            roomsOccupied: 161,
            enrolled: 5064,
            maxEnrollment: 6365,
            occupiedRoomCapacity: 7500,
            occupiedVerified: { capacity: 5745, rooms: 100 },
            occupiedEstimated: { capacity: 1755, rooms: 61 },
            emptyRooms: 78,
            emptySeats: 1882,
            emptyVerified: { seats: 356, rooms: 11 },
            emptyEstimated: { seats: 1526, rooms: 67 }
        },
        'R': {
            dayName: 'Thursday',
            dayClass: 'thursday',
            time: '1:15 PM',
            meetings: 216,
            roomsOccupied: 175,
            enrolled: 5771,
            maxEnrollment: 7219,
            occupiedRoomCapacity: 8101,
            occupiedVerified: { capacity: 5852, rooms: 105 },
            occupiedEstimated: { capacity: 2249, rooms: 70 },
            emptyRooms: 64,
            emptySeats: 1596,
            emptyVerified: { seats: 249, rooms: 6 },
            emptyEstimated: { seats: 1347, rooms: 58 }
        },
        'F': {
            dayName: 'Friday',
            dayClass: 'friday',
            time: '10:50 AM',
            meetings: 144,
            roomsOccupied: 124,
            enrolled: 4703,
            maxEnrollment: 5739,
            occupiedRoomCapacity: 6816,
            occupiedVerified: { capacity: 5683, rooms: 97 },
            occupiedEstimated: { capacity: 1133, rooms: 27 },
            emptyRooms: 115,
            emptySeats: 2644,
            emptyVerified: { seats: 418, rooms: 14 },
            emptyEstimated: { seats: 2226, rooms: 101 }
        }
    };
    
    const dayOrder = ['M', 'T', 'W', 'R', 'F'];
    
    dayOrder.forEach(day => {
        const data = peakData[day];
        if (!data) return;
        
        const card = document.createElement('div');
        card.className = `peak-time-card ${data.dayClass}`;
        
        // Create tooltip text for occupied room capacity
        const occupiedTooltip = `verified: ${data.occupiedVerified.capacity.toLocaleString()} (${data.occupiedVerified.rooms}) | estimated: ${data.occupiedEstimated.capacity.toLocaleString()} (${data.occupiedEstimated.rooms})`;
        
        // Create tooltip text for empty rooms/seats
        const emptyTooltip = `verified: ${data.emptyVerified.seats.toLocaleString()} (${data.emptyVerified.rooms}) | estimated: ${data.emptyEstimated.seats.toLocaleString()} (${data.emptyEstimated.rooms})`;
        
        card.innerHTML = `
            <div class="peak-time-day">${data.dayName}</div>
            <div class="peak-time-slot">${data.time}</div>
            <div class="peak-time-meetings">${data.meetings} meetings in ${data.roomsOccupied} rooms</div>
            <div class="peak-time-rooms">
                <div class="room-usage-row">
                    <span class="room-usage-label">Enrolled</span>
                    <span class="room-usage-value">${data.enrolled.toLocaleString()}</span>
                </div>
                <div class="room-usage-row">
                    <span class="room-usage-label">Max Enrollment</span>
                    <span class="room-usage-value">${data.maxEnrollment.toLocaleString()}</span>
                </div>
                <div class="room-usage-row capacity-row">
                    <span class="room-usage-label">Room Capacity</span>
                    <span class="room-usage-value">${data.occupiedRoomCapacity.toLocaleString()}</span>
                    <div class="capacity-tooltip">${occupiedTooltip}</div>
                </div>
                <div class="room-usage-row capacity-row">
                    <span class="room-usage-label">Empty</span>
                    <span class="room-usage-value">${data.emptyRooms} rooms, ${data.emptySeats.toLocaleString()} seats</span>
                    <div class="capacity-tooltip">${emptyTooltip}</div>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// ============================================================================
// Top Buildings Calculation and Display
// ============================================================================

/**
 * Calculate building usage statistics
 * Returns array of building objects sorted by number of meetings (descending)
 * Each building object contains:
 * - name: building name
 * - meetings: total number of class meetings
 * - uniqueCourses: number of unique courses (course + section)
 * - totalEnrollment: sum of current enrollment
 * - uniqueRooms: number of unique rooms
 */
function calculateTopBuildings() {
    const buildingMap = new Map();
    
    courseData.forEach(meeting => {
        const building = meeting.building;
        
        // Skip if no building
        if (!building) {
            return;
        }
        
        if (!buildingMap.has(building)) {
            buildingMap.set(building, {
                name: building,
                meetings: 0,
                uniqueCourses: new Set(),
                totalEnrollment: 0,
                uniqueRooms: new Set()
            });
        }
        
        const buildingData = buildingMap.get(building);
        
        // Count meetings
        buildingData.meetings++;
        
        // Track unique courses
        const courseKey = `${meeting.course}|${meeting.section}`;
        buildingData.uniqueCourses.add(courseKey);
        
        // Sum enrollment
        if (meeting.current_enrollment !== null && meeting.current_enrollment !== undefined) {
            buildingData.totalEnrollment += meeting.current_enrollment;
        }
        
        // Track unique rooms
        if (meeting.room) {
            const roomKey = `${building}|${meeting.room}`;
            buildingData.uniqueRooms.add(roomKey);
        }
    });
    
    // Convert to array and calculate final stats
    const buildings = Array.from(buildingMap.values()).map(building => ({
        name: building.name,
        meetings: building.meetings,
        uniqueCourses: building.uniqueCourses.size,
        totalEnrollment: building.totalEnrollment,
        uniqueRooms: building.uniqueRooms.size
    }));
    
    // Sort by number of meetings (descending)
    buildings.sort((a, b) => b.meetings - a.meetings);
    
    return buildings;
}

/**
 * Display top used buildings
 * Shows top 10 buildings by default
 */
function displayTopBuildings(buildings, limit = 10) {
    const grid = document.getElementById('buildings-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Get top N buildings
    const topBuildings = buildings.slice(0, limit);
    
    topBuildings.forEach((building, index) => {
        const card = document.createElement('div');
        const rank = index + 1;
        
        // Add rank class for top 3
        let rankClass = '';
        if (rank === 1) rankClass = 'top-1';
        else if (rank === 2) rankClass = 'top-2';
        else if (rank === 3) rankClass = 'top-3';
        
        card.className = `building-card ${rankClass}`;
        
        card.innerHTML = `
            <div class="building-rank">#${rank}</div>
            <div class="building-name">${building.name}</div>
            <div class="building-stats">
                <div class="building-stat-row">
                    <span class="building-stat-label">Class Meetings</span>
                    <span class="building-stat-value">${building.meetings.toLocaleString()}</span>
                </div>
                <div class="building-stat-row">
                    <span class="building-stat-label">Unique Courses</span>
                    <span class="building-stat-value">${building.uniqueCourses.toLocaleString()}</span>
                </div>
                <div class="building-stat-row">
                    <span class="building-stat-label">Total Enrollment</span>
                    <span class="building-stat-value">${building.totalEnrollment.toLocaleString()}</span>
                </div>
                <div class="building-stat-row">
                    <span class="building-stat-label">Rooms</span>
                    <span class="building-stat-value">${building.uniqueRooms.toLocaleString()}</span>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

