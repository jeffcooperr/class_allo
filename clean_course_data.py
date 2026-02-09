"""
Course Data Cleaning Script

This script processes raw university course scheduling CSV data and transforms it
into a clean, normalized JSON format suitable for time-based visualization.

The transformation includes:
- Filtering out courses with TBA times or online locations
- Converting time strings to minutes since midnight for easy time comparisons
- Exploding multi-day courses into separate rows (one per day)
- Normalizing day representations to single letters (M/T/W/R/F)
"""

import csv
import json
import re
from typing import List, Dict, Any


def time_to_minutes(time_str: str) -> int:
    """
    Convert a time string (HH:MM format) to minutes since midnight.
    
    Args:
        time_str: Time string in format "HH:MM" (e.g., "14:30")
    
    Returns:
        Integer representing minutes since midnight (e.g., 870 for 14:30)
    
    Example:
        "14:30" -> 870 (14 * 60 + 30)
    """
    if not time_str or time_str.strip() == "":
        return None
    
    # Remove any whitespace
    time_str = time_str.strip()
    
    # Parse HH:MM format
    try:
        hours, minutes = map(int, time_str.split(":"))
        return hours * 60 + minutes
    except (ValueError, AttributeError):
        return None


def parse_days(days_str: str) -> List[str]:
    """
    Parse the Days column to extract individual day letters.
    
    The Days column contains patterns like:
    - "M  W  F   " (Monday, Wednesday, Friday)
    - " T  R    " (Tuesday, Thursday)
    - "  W     " (Wednesday only)
    
    We extract M, T, W, R, F from the string and return as a list.
    
    Args:
        days_str: Raw days string from CSV
    
    Returns:
        List of day letters (e.g., ["M", "W", "F"])
    """
    if not days_str:
        return []
    
    # Map of day patterns to standardized letters
    # R is Thursday (common in US universities)
    day_map = {
        "M": "M",  # Monday
        "T": "T",  # Tuesday
        "W": "W",  # Wednesday
        "R": "R",  # Thursday
        "F": "F",  # Friday
    }
    
    # Extract all day letters from the string
    days = []
    for char in days_str.upper():
        if char in day_map:
            days.append(day_map[char])
    
    # Remove duplicates while preserving order
    seen = set()
    unique_days = []
    for day in days:
        if day not in seen:
            seen.add(day)
            unique_days.append(day)
    
    return unique_days


def normalize_course_type(lec_lab: str) -> str:
    """
    Normalize the course type field to standard abbreviations.
    
    The raw data uses various codes like LEC, LAB, LCLB, HYBD, ONL, TD.
    We keep the most relevant ones for visualization purposes.
    
    Args:
        lec_lab: Raw course type string
    
    Returns:
        Normalized course type string
    """
    if not lec_lab:
        return ""
    
    # Map common variations to standard types
    type_map = {
        "LEC": "LEC",
        "LAB": "LAB",
        "LCLB": "LCLB",  # Lecture/Lab combination
        "HYBD": "HYBD",  # Hybrid
        "ONL": "ONL",    # Online (will be filtered out)
        "TD": "TD",      # Thesis/Dissertation (will be filtered out)
    }
    
    normalized = lec_lab.strip().upper()
    return type_map.get(normalized, normalized)


def build_course_code(subj: str, course_num: str) -> str:
    """
    Build a standardized course code from subject and number.
    
    Args:
        subj: Subject abbreviation (e.g., "ALE")
        course_num: Course number (e.g., "2170")
    
    Returns:
        Combined course code (e.g., "ALE 2170")
    """
    subj = subj.strip() if subj else ""
    course_num = course_num.strip() if course_num else ""
    return f"{subj} {course_num}".strip()


def clean_course_data(input_file: str, output_file: str) -> None:
    """
    Main data cleaning function.
    
    Processes the CSV file and outputs cleaned JSON data with the following steps:
    1. Load CSV and read all rows
    2. Filter out rows with TBA times or ONLINE buildings
    3. Convert times to minutes since midnight
    4. Parse and explode days into separate rows
    5. Output normalized JSON
    
    Args:
        input_file: Path to input CSV file
        output_file: Path to output JSON file
    """
    cleaned_records = []
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Normalize row keys by stripping whitespace (CSV headers may have spaces)
            # This handles cases where headers have leading/trailing spaces
            normalized_row = {k.strip(): v for k, v in row.items()}
            
            # Extract relevant fields
            # CSV reader should handle quoted values, but we strip quotes as a safety measure
            subj = (normalized_row.get('Subj') or '').strip().strip('"')
            course_num = (normalized_row.get('#') or '').strip().strip('"')
            title = (normalized_row.get('Title') or '').strip().strip('"')
            sec = (normalized_row.get('Sec') or '').strip().strip('"')
            lec_lab = (normalized_row.get('Lec Lab') or '').strip().strip('"')
            start_time = (normalized_row.get('Start Time') or '').strip().strip('"')
            end_time = (normalized_row.get('End Time') or '').strip().strip('"')
            days = (normalized_row.get('Days') or '').strip().strip('"')
            bldg = (normalized_row.get('Bldg') or '').strip().strip('"')
            room = (normalized_row.get('Room') or '').strip().strip('"')
            
            # Extract enrollment information
            max_enrollment_str = (normalized_row.get('Max Enrollment') or '').strip().strip('"')
            current_enrollment_str = (normalized_row.get('Current Enrollment') or '').strip().strip('"')
            
            # Convert enrollment strings to integers, defaulting to None if empty or invalid
            try:
                max_enrollment = int(max_enrollment_str) if max_enrollment_str else None
            except (ValueError, TypeError):
                max_enrollment = None
            
            try:
                current_enrollment = int(current_enrollment_str) if current_enrollment_str else None
            except (ValueError, TypeError):
                current_enrollment = None
            
            # Filter out rows with TBA times
            # TBA (To Be Announced) means no specific time, so we can't visualize it
            if start_time.upper() == "TBA" or end_time.upper() == "TBA" or not start_time or not end_time:
                continue
            
            # Filter out ONLINE buildings
            # Online courses don't have physical locations, so they're not relevant
            # for a building-based visualization
            if bldg.upper() == "ONLINE" or not bldg or bldg.strip() == "":
                continue
            
            # Filter out courses with "SEE NOTES" as room
            # These courses don't have a specific room assigned yet
            if room.upper() == "SEE NOTES":
                continue
            
            # Convert times to minutes since midnight
            # This makes time comparisons and filtering much easier in the frontend
            start_minutes = time_to_minutes(start_time)
            end_minutes = time_to_minutes(end_time)
            
            # Skip if time conversion failed
            if start_minutes is None or end_minutes is None:
                continue
            
            # Parse days and explode into separate rows
            # A course meeting on "M W F" becomes three separate records
            day_list = parse_days(days)
            
            # Skip if no valid days found
            if not day_list:
                continue
            
            # Build course code and normalize type
            course_code = build_course_code(subj, course_num)
            course_type = normalize_course_type(lec_lab)
            
            # Create one record per day
            # This "explosion" makes time-based filtering straightforward:
            # we can simply filter by day and time range without complex logic
            for day in day_list:
                record = {
                    "course": course_code,
                    "title": title,
                    "section": sec,
                    "type": course_type,
                    "building": bldg,
                    "room": room,
                    "day": day,
                    "start_minutes": start_minutes,
                    "end_minutes": end_minutes,
                    "max_enrollment": max_enrollment,
                    "current_enrollment": current_enrollment
                }
                cleaned_records.append(record)
    
    # Write cleaned data to JSON
    # Using indent=2 for readability during development/debugging
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cleaned_records, f, indent=2, ensure_ascii=False)
    
    print(f"Processed {len(cleaned_records)} course meeting records")
    print(f"Output written to {output_file}")


if __name__ == "__main__":
    input_file = "2025 Fall.csv"
    output_file = "2025_fall_cleaned.json"
    
    print(f"Cleaning course data from {input_file}...")
    clean_course_data(input_file, output_file)
    print("Done!")

