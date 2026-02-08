"""
Cast Away (2000) - Dialogue Word Frequency Analysis
Screenplay by William Broyles Jr.

This script:
1. Reads the dialogue file
2. Strips character names (e.g., "CHUCK:", "KELLY:")
3. Cleans punctuation and normalizes to lowercase
4. Counts word frequencies
5. Outputs a ranked list of the most-used words
"""

import re
from collections import Counter

def extract_dialogue_words(filepath):
    """Read dialogue file, strip character names, clean text, return word list."""
    with open(filepath, 'r') as f:
        lines = f.readlines()

    dialogue_words = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Remove character name prefix (e.g., "CHUCK: ", "KELLY: ")
        line = re.sub(r'^[A-Z\s]+:\s*', '', line)
        # Remove punctuation (keep apostrophes in contractions)
        line = re.sub(r"[^a-zA-Z' ]", '', line)
        # Lowercase
        line = line.lower().strip()
        # Split into words and filter empty
        words = [w.strip("'") for w in line.split() if w.strip("'")]
        dialogue_words.extend(words)

    return dialogue_words


def main():
    filepath = 'castaway_dialogue.txt'
    words = extract_dialogue_words(filepath)

    total_words = len(words)
    counter = Counter(words)

    print("=" * 60)
    print("  CAST AWAY (2000) - DIALOGUE WORD FREQUENCY ANALYSIS")
    print("  Screenplay by William Broyles Jr.")
    print("=" * 60)
    print(f"\n  Total dialogue words: {total_words}")
    print(f"  Unique words: {len(counter)}")
    print()

    # --- Top 50 Words (all) ---
    print("-" * 60)
    print(f"  {'RANK':<6} {'WORD':<20} {'COUNT':<8} {'FREQUENCY':>10}")
    print("-" * 60)
    for rank, (word, count) in enumerate(counter.most_common(50), 1):
        freq = count / total_words * 100
        bar = "#" * count
        print(f"  {rank:<6} {word:<20} {count:<8} {freq:>9.2f}%  {bar}")

    # --- Top meaningful words (excluding common stop words) ---
    stop_words = {
        'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your',
        'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its',
        'they', 'them', 'their', 'theirs', 'what', 'which', 'who', 'whom',
        'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were',
        'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
        'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because',
        'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about',
        'against', 'between', 'through', 'during', 'before', 'after', 'above',
        'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
        'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
        'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more',
        'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
        'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just',
        'don', 'should', 'now', 'didn', 'won', 'll', 're', 've', 'd', 'm',
        'o', 'ain', 'aren', 'couldn', 'doesn', 'hadn', 'hasn', 'haven',
        'isn', 'ma', 'mightn', 'mustn', 'needn', 'shan', 'shouldn', 'wasn',
        'weren', 'wouldn',
    }

    meaningful_counter = Counter({w: c for w, c in counter.items() if w not in stop_words})

    print()
    print("=" * 60)
    print("  TOP 30 MEANINGFUL WORDS (excluding stop words)")
    print("=" * 60)
    print(f"  {'RANK':<6} {'WORD':<20} {'COUNT':<8} {'FREQUENCY':>10}")
    print("-" * 60)
    for rank, (word, count) in enumerate(meaningful_counter.most_common(30), 1):
        freq = count / total_words * 100
        bar = "#" * count
        print(f"  {rank:<6} {word:<20} {count:<8} {freq:>9.2f}%  {bar}")

    print()
    print("=" * 60)
    print("  KEY INSIGHTS")
    print("=" * 60)
    wilson_count = counter.get('wilson', 0)
    know_count = counter.get('know', 0)
    time_count = counter.get('time', 0)
    back_count = counter.get('back', 0)
    print(f"  - 'wilson' appears {wilson_count} times (iconic volleyball companion)")
    print(f"  - 'know'   appears {know_count} times (certainty vs. uncertainty theme)")
    print(f"  - 'time'   appears {time_count} times (central theme of the film)")
    print(f"  - 'back'   appears {back_count} times (theme of return/promise)")
    print()
    print("  Cast Away is notably dialogue-sparse: Chuck spends ~2/3 of the")
    print("  film alone on the island, making Wilson and self-directed speech")
    print("  the primary dialogue. The word frequency reflects the film's")
    print("  core themes: time, survival, identity, and human connection.")
    print("=" * 60)


if __name__ == '__main__':
    main()
