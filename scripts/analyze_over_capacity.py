#!/usr/bin/env python3
"""
Analyze how many classes exceed their true room capacity.

This script:
1. Loads class enrollment data from 2025_fall_cleaned.json
2. For classes with capacity_from_csv=true, compares current_enrollment to true capacity
3. Counts and reports how many classes exceed capacity
"""

import json
from pathlib import Path

def minutes_to_time(minutes):
    """Convert minutes since midnight to readable time format."""
    if minutes is None:
        return "N/A"
    hours = minutes // 60
    mins = minutes % 60
    period = "AM" if hours < 12 else "PM"
    if hours == 0:
        display_hour = 12
    elif hours > 12:
        display_hour = hours - 12
    else:
        display_hour = hours
    return f"{display_hour}:{mins:02d} {period}"

def analyze_over_capacity():
    """Main analysis function."""
    # Get script directory and data directory
    script_dir = Path(__file__).parent
    data_dir = script_dir.parent / 'data'
    
    # Load course data (capacities are already in the JSON with capacity_from_csv flag)
    json_file = data_dir / '2025_fall_cleaned.json'
    with open(json_file, 'r', encoding='utf-8') as f:
        course_data = json.load(f)
    print(f"Loaded {len(course_data)} course meeting records")
    
    # Analyze classes with true capacity from CSV
    over_capacity_classes = []
    total_with_true_capacity = 0
    
    for course in course_data:
        # Only analyze classes where we have true capacity from CSV
        if course.get('capacity_from_csv') == True:
            total_with_true_capacity += 1
            
            building = course.get('building', '').strip()
            room = course.get('room', '').strip()
            current_enrollment = course.get('current_enrollment')
            capacity = course.get('capacity')
            
            # Skip if we don't have enrollment or capacity data
            if current_enrollment is None or capacity is None:
                continue
            
            # Check if over capacity
            if current_enrollment > capacity:
                over_capacity_classes.append({
                    'course': course.get('course'),
                    'title': course.get('title'),
                    'section': course.get('section'),
                    'building': building,
                    'room': room,
                    'current_enrollment': current_enrollment,
                    'capacity': capacity,
                    'day': course.get('day'),
                    'start_minutes': course.get('start_minutes'),
                    'end_minutes': course.get('end_minutes')
                })
    
    # Group by course and section to consolidate multiple meetings
    consolidated = {}
    for cls in over_capacity_classes:
        key = (cls['course'], cls['section'])
        if key not in consolidated:
            consolidated[key] = {
                'course': cls['course'],
                'title': cls.get('title', ''),
                'section': cls['section'],
                'building': cls['building'],
                'room': cls['room'],
                'current_enrollment': cls['current_enrollment'],
                'capacity': cls['capacity'],
                'meetings': []
            }
        consolidated[key]['meetings'].append({
            'day': cls['day'],
            'start_minutes': cls['start_minutes'],
            'end_minutes': cls['end_minutes']
        })
    
    # Print results
    print(f"\n{'='*80}")
    print(f"ANALYSIS RESULTS")
    print(f"{'='*80}")
    print(f"Total course meetings with true capacity from CSV: {total_with_true_capacity}")
    print(f"Class meetings OVER true room capacity: {len(over_capacity_classes)}")
    print(f"Unique course sections over capacity: {len(consolidated)}")
    print(f"Percentage over capacity: {len(over_capacity_classes)/total_with_true_capacity*100:.2f}%")
    
    if consolidated:
        print(f"\n{'='*80}")
        print(f"DETAILS OF CLASSES OVER CAPACITY (consolidated by section):")
        print(f"{'='*80}")
        print(f"{'Course':<15} {'Section':<10} {'Building':<10} {'Room':<10} {'Enrolled':<10} {'Capacity':<10} {'Days':<8} {'Time':<20} {'Meetings':<10}")
        print(f"{'-'*80}")
        
        for key in sorted(consolidated.keys(), key=lambda x: (consolidated[x]['building'], consolidated[x]['room'], consolidated[x]['course'])):
            cls = consolidated[key]
            days = ''.join(sorted(set(m['day'] for m in cls['meetings'] if m['day'])))
            num_meetings = len(cls['meetings'])
            
            # Format time - if all meetings have same time, show once; otherwise show all
            time_parts = []
            for m in sorted(cls['meetings'], key=lambda x: (x['day'] or '', x['start_minutes'] or 0)):
                start_time = minutes_to_time(m['start_minutes'])
                end_time = minutes_to_time(m['end_minutes'])
                time_parts.append((m['day'] or '', start_time, end_time))
            
            # Check if all meetings have the same time
            if len(set((start, end) for _, start, end in time_parts)) == 1:
                # All same time, show once
                _, start_time, end_time = time_parts[0]
                time_str = f"{start_time}-{end_time}"
            else:
                # Different times, show all
                time_str = ", ".join(f"{day} {start}-{end}" for day, start, end in time_parts)
            
            print(f"{cls['course']:<15} {cls['section']:<10} {cls['building']:<10} {cls['room']:<10} "
                  f"{cls['current_enrollment']:<10} {cls['capacity']:<10} {days:<8} {time_str:<20} {num_meetings}")
        
        # Group by building/room to see which rooms have the most over-capacity classes
        print(f"\n{'='*80}")
        print(f"OVER-CAPACITY BY ROOM:")
        print(f"{'='*80}")
        room_counts = {}
        for cls in consolidated.values():
            key = (cls['building'], cls['room'])
            if key not in room_counts:
                room_counts[key] = []
            room_counts[key].append(cls)
        
        for (building, room), classes in sorted(room_counts.items(), key=lambda x: len(x[1]), reverse=True):
            total_meetings = sum(len(c['meetings']) for c in classes)
            sections = [f"{c['course']} {c['section']}" for c in classes]
            print(f"{building} {room}: {len(classes)} course section(s), {total_meetings} meeting(s) over capacity")
            print(f"  Capacity: {classes[0]['capacity']}, Sections: {sections}")
    
    # Analyze classes where current_enrollment > max_enrollment (for classes with capacity_from_csv)
    print(f"\n{'='*80}")
    print(f"ANALYSIS: CURRENT ENROLLMENT vs MAX ENROLLMENT")
    print(f"{'='*80}")
    
    over_max_enrollment_classes = []
    total_with_max_enrollment = 0
    
    for course in course_data:
        # Only analyze classes where we have true capacity from CSV
        if course.get('capacity_from_csv') == True:
            current_enrollment = course.get('current_enrollment')
            max_enrollment = course.get('max_enrollment')
            
            # Skip if we don't have enrollment data
            if current_enrollment is None or max_enrollment is None:
                continue
            
            total_with_max_enrollment += 1
            
            # Check if current enrollment exceeds max enrollment
            if current_enrollment > max_enrollment:
                over_max_enrollment_classes.append({
                    'course': course.get('course'),
                    'title': course.get('title'),
                    'section': course.get('section'),
                    'building': course.get('building', '').strip(),
                    'room': course.get('room', '').strip(),
                    'current_enrollment': current_enrollment,
                    'max_enrollment': max_enrollment,
                    'day': course.get('day'),
                    'start_minutes': course.get('start_minutes'),
                    'end_minutes': course.get('end_minutes')
                })
    
    # Group by course and section to consolidate multiple meetings
    consolidated_max = {}
    for cls in over_max_enrollment_classes:
        key = (cls['course'], cls['section'])
        if key not in consolidated_max:
            consolidated_max[key] = {
                'course': cls['course'],
                'title': cls.get('title', ''),
                'section': cls['section'],
                'building': cls['building'],
                'room': cls['room'],
                'current_enrollment': cls['current_enrollment'],
                'max_enrollment': cls['max_enrollment'],
                'meetings': []
            }
        consolidated_max[key]['meetings'].append({
            'day': cls['day'],
            'start_minutes': cls['start_minutes'],
            'end_minutes': cls['end_minutes']
        })
    
    print(f"Total course meetings with capacity_from_csv and max_enrollment data: {total_with_max_enrollment}")
    print(f"Class meetings where current_enrollment > max_enrollment: {len(over_max_enrollment_classes)}")
    print(f"Unique course sections over max enrollment: {len(consolidated_max)}")
    if total_with_max_enrollment > 0:
        print(f"Percentage over max enrollment: {len(over_max_enrollment_classes)/total_with_max_enrollment*100:.2f}%")
    
    if consolidated_max:
        print(f"\n{'='*80}")
        print(f"DETAILS OF CLASSES OVER MAX ENROLLMENT (consolidated by section):")
        print(f"{'='*80}")
        print(f"{'Course':<15} {'Section':<10} {'Building':<10} {'Room':<10} {'Enrolled':<10} {'Max Enroll':<12} {'Days':<8} {'Time':<20} {'Meetings':<10}")
        print(f"{'-'*80}")
        
        for key in sorted(consolidated_max.keys(), key=lambda x: (consolidated_max[x]['building'], consolidated_max[x]['room'], consolidated_max[x]['course'])):
            cls = consolidated_max[key]
            days = ''.join(sorted(set(m['day'] for m in cls['meetings'] if m['day'])))
            num_meetings = len(cls['meetings'])
            
            # Format time - if all meetings have same time, show once; otherwise show all
            time_parts = []
            for m in sorted(cls['meetings'], key=lambda x: (x['day'] or '', x['start_minutes'] or 0)):
                start_time = minutes_to_time(m['start_minutes'])
                end_time = minutes_to_time(m['end_minutes'])
                time_parts.append((m['day'] or '', start_time, end_time))
            
            # Check if all meetings have the same time
            if len(set((start, end) for _, start, end in time_parts)) == 1:
                # All same time, show once
                _, start_time, end_time = time_parts[0]
                time_str = f"{start_time}-{end_time}"
            else:
                # Different times, show all
                time_str = ", ".join(f"{day} {start}-{end}" for day, start, end in time_parts)
            
            print(f"{cls['course']:<15} {cls['section']:<10} {cls['building']:<10} {cls['room']:<10} "
                  f"{cls['current_enrollment']:<10} {cls['max_enrollment']:<12} {days:<8} {time_str:<20} {num_meetings}")
    
    return len(over_capacity_classes), total_with_true_capacity

if __name__ == '__main__':
    analyze_over_capacity()

