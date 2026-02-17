#!/usr/bin/env python3
"""
Analytics script for course enrollment data.
Analyzes the 2025_fall_cleaned.json dataset.
"""

import json
from pathlib import Path

# Load the data
data_path = Path(__file__).parent / 'data' / '2025_fall_cleaned.json'

with open(data_path, 'r') as f:
    courses = json.load(f)

print(f"Total courses: {len(courses)}")
print("-" * 50)

# Count courses where current_enrollment > capacity
over_capacity = [c for c in courses if c.get('current_enrollment', 0) > c.get('capacity', 0)]
over_capacity_count = len(over_capacity)

print(f"Courses with current_enrollment > capacity: {over_capacity_count}")

# Show some examples if any exist
if over_capacity_count > 0:
    print("\nExamples of over-capacity courses:")
    for course in over_capacity[:10]:  # Show first 10
        print(f"  {course.get('course')} {course.get('section')}: "
              f"enrolled={course.get('current_enrollment')}, "
              f"capacity={course.get('capacity')}")

print("-" * 50)

# Add your other calculations below
# ...

