#!/usr/bin/env python3
"""Convert questions.csv to questions-data.js for the webapp.

This embeds questions directly in a JS file, avoiding CORS issues
when opening the HTML file directly without a server.
"""

import csv
import json
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def main():
    base_dir = Path(__file__).parent
    csv_path = base_dir / "questions.csv"
    js_path = base_dir / "webapp" / "questions-data.js"

    if not csv_path.exists():
        logger.error(f"❌ questions.csv not found at {csv_path}")
        return

    questions = []
    skipped = 0
    
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Validate required fields
            question_id = row.get("id", "").strip()
            question_text = row.get("question", "").strip()
            correct_answer = row.get("correct_answer", "").upper().strip()
            
            if not question_id or not question_text:
                skipped += 1
                continue
                
            if correct_answer not in ["A", "B", "C", "D"]:
                logger.warning(f"⚠️ Question {question_id}: Invalid correct answer '{correct_answer}', skipping")
                skipped += 1
                continue
            
            # Get options
            options = {
                "A": row.get("option_a", "").strip(),
                "B": row.get("option_b", "").strip(),
                "C": row.get("option_c", "").strip(),
                "D": row.get("option_d", "").strip(),
            }
            
            # Ensure correct option has content
            if not options[correct_answer]:
                logger.warning(f"⚠️ Question {question_id}: Correct option {correct_answer} is empty, skipping")
                skipped += 1
                continue
            
            questions.append({
                "id": int(question_id) if question_id.isdigit() else hash(question_text) % 100000,
                "question": question_text,
                "options": options,
                "correct": correct_answer,
                "explanation": row.get("explanation", "").strip() or "No explanation provided.",
                "topic": row.get("topic", "").strip() or "General",
            })

    # Ensure webapp directory exists
    js_path.parent.mkdir(exist_ok=True)

    # Write as JavaScript file
    js_content = f"""/**
 * Quiz Questions Data
 * Generated from questions.csv
 * Total: {len(questions)} questions
 * 
 * This file is loaded before app.js and provides the QUIZ_QUESTIONS array.
 * Having questions embedded avoids CORS issues when opening the file locally.
 */

const QUIZ_QUESTIONS = {json.dumps(questions, indent=2, ensure_ascii=False)};
"""

    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_content)

    logger.info(f"✅ Converted {len(questions)} questions to {js_path}")
    if skipped:
        logger.info(f"⚠️ Skipped {skipped} invalid questions")


if __name__ == "__main__":
    main()
