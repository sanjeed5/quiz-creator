#!/usr/bin/env python3
"""Extract MCQ questions from study guide images using Gemini 2.0 Flash.

Features:
- Parallel processing with rate limit respect
- Checkpoint/resume on interruption
- Progress tracking
"""

import asyncio
import csv
import json
import logging
import os
from pathlib import Path

from google import genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# Configuration
MAX_CONCURRENT = 3  # Parallel requests (conservative for rate limits)
CHECKPOINT_FILE = "checkpoint.json"
MAX_RETRIES = 3
RETRY_DELAY = 30  # seconds to wait on rate limit


def setup_gemini():
    """Initialize Gemini API client."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY not found in .env file. "
            "Get your API key from https://aistudio.google.com/apikey"
        )
    return genai.Client(api_key=api_key)


def load_checkpoint(checkpoint_path: Path) -> dict:
    """Load checkpoint data if it exists."""
    if checkpoint_path.exists():
        with open(checkpoint_path, "r") as f:
            data = json.load(f)
            logger.info(f"✓ Resuming from checkpoint: {len(data.get('completed', []))} images already processed")
            return data
    return {"completed": [], "questions": []}


def save_checkpoint(checkpoint_path: Path, completed: list, questions: list):
    """Save checkpoint data."""
    with open(checkpoint_path, "w") as f:
        json.dump({"completed": completed, "questions": questions}, f, indent=2)


PROMPT = """You are analyzing a page from a Grade VII exam study guide. Extract ALL multiple-choice questions (MCQs) that can be created from the content on this page.

The page may contain:
- Definitions and concepts
- Lists of facts, synonyms, antonyms, phrasal verbs
- Scientific processes and explanations
- Geography facts
- General knowledge information
- Computer shortcuts and domain names

For EACH concept, fact, or piece of information, create a multiple-choice question that tests understanding.

Return your response as a JSON array of question objects. Each question object should have:
- "question": The question text
- "option_a": First option
- "option_b": Second option  
- "option_c": Third option
- "option_d": Fourth option
- "correct_answer": The letter of the correct answer (A, B, C, or D)
- "explanation": Brief explanation of why this answer is correct
- "topic": Subject/topic category (e.g., "English", "Science", "Geography", "Civics", "Computer")

IMPORTANT:
- Extract ALL possible questions from the content - do not limit yourself
- Cover all facts, definitions, and concepts visible on the page
- Make questions appropriate for Grade VII level
- Return ONLY valid JSON array"""


async def process_image(client, image_path: Path, semaphore: asyncio.Semaphore) -> tuple[str, list[dict]]:
    """Process a single image with rate limiting and retry logic."""
    async with semaphore:
        for attempt in range(MAX_RETRIES):
            try:
                # Run synchronous API calls in thread pool
                loop = asyncio.get_event_loop()
                
                # Upload file
                uploaded_file = await loop.run_in_executor(
                    None, 
                    lambda: client.files.upload(file=str(image_path))
                )
                
                # Generate content
                response = await loop.run_in_executor(
                    None,
                    lambda: client.models.generate_content(
                        model="gemini-2.0-flash-exp",
                        contents=[PROMPT, uploaded_file],
                        config={
                            "temperature": 0.1,
                            "response_mime_type": "application/json",
                        },
                    )
                )
                
                # Parse response
                response_text = response.text.strip()
                questions = json.loads(response_text)
                if not isinstance(questions, list):
                    questions = [questions]
                
                # Add source image
                for q in questions:
                    q["source_image"] = image_path.name
                
                # Delete uploaded file
                await loop.run_in_executor(
                    None,
                    lambda: client.files.delete(name=uploaded_file.name)
                )
                
                logger.info(f"✓ {image_path.name}: {len(questions)} questions")
                return image_path.name, questions
                
            except json.JSONDecodeError as e:
                logger.error(f"✗ JSON parse error for {image_path.name}: {e}")
                return image_path.name, []
            except Exception as e:
                error_str = str(e)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    if attempt < MAX_RETRIES - 1:
                        logger.warning(f"⏳ Rate limited on {image_path.name}, waiting {RETRY_DELAY}s (attempt {attempt + 1}/{MAX_RETRIES})")
                        await asyncio.sleep(RETRY_DELAY)
                        continue
                logger.error(f"✗ Error processing {image_path.name}: {e}")
                return image_path.name, []
        
        return image_path.name, []


async def main_async():
    base_dir = Path(__file__).parent
    images_dir = base_dir / "images_jpg"
    output_csv = base_dir / "questions.csv"
    checkpoint_path = base_dir / CHECKPOINT_FILE

    if not images_dir.exists():
        logger.error(f"Images directory not found: {images_dir}")
        return

    # Setup Gemini
    logger.info("Initializing Gemini 2.0 Flash...")
    client = setup_gemini()
    logger.info("✓ Gemini initialized\n")

    # Load checkpoint
    checkpoint = load_checkpoint(checkpoint_path)
    completed_images = set(checkpoint["completed"])
    all_questions = checkpoint["questions"]

    # Get images to process (skip already completed)
    all_images = sorted(images_dir.glob("*.jpg")) + sorted(images_dir.glob("*.jpeg"))
    remaining_images = [img for img in all_images if img.name not in completed_images]
    
    logger.info(f"Total images: {len(all_images)}")
    logger.info(f"Already processed: {len(completed_images)}")
    logger.info(f"Remaining: {len(remaining_images)}")
    logger.info(f"Parallel workers: {MAX_CONCURRENT}\n")

    if not remaining_images:
        logger.info("All images already processed!")
    else:
        # Create semaphore for rate limiting
        semaphore = asyncio.Semaphore(MAX_CONCURRENT)
        
        # Process images in parallel
        tasks = [process_image(client, img, semaphore) for img in remaining_images]
        
        # Process with progress updates
        completed_count = len(completed_images)
        total_count = len(all_images)
        
        for coro in asyncio.as_completed(tasks):
            try:
                image_name, questions = await coro
                completed_count += 1
                
                # Update checkpoint
                completed_images.add(image_name)
                all_questions.extend(questions)
                save_checkpoint(checkpoint_path, list(completed_images), all_questions)
                
                logger.info(f"Progress: {completed_count}/{total_count} ({completed_count*100//total_count}%)")
                
            except Exception as e:
                logger.error(f"Task failed: {e}")

    # Write to CSV
    logger.info(f"\nWriting {len(all_questions)} questions to CSV...")
    
    if not all_questions:
        logger.warning("No questions extracted!")
        return

    fieldnames = [
        "id",
        "question",
        "option_a",
        "option_b",
        "option_c",
        "option_d",
        "correct_answer",
        "explanation",
        "topic",
        "source_image",
    ]
    
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for idx, q in enumerate(all_questions, 1):
            writer.writerow({
                "id": idx,
                "question": q.get("question", ""),
                "option_a": q.get("option_a", ""),
                "option_b": q.get("option_b", ""),
                "option_c": q.get("option_c", ""),
                "option_d": q.get("option_d", ""),
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", ""),
                "topic": q.get("topic", ""),
                "source_image": q.get("source_image", ""),
            })

    logger.info(f"✓ Successfully created {output_csv}")
    logger.info(f"✓ Total questions extracted: {len(all_questions)}")
    
    # Clean up checkpoint after successful completion
    if checkpoint_path.exists():
        checkpoint_path.unlink()
        logger.info("✓ Checkpoint cleaned up")


def main():
    asyncio.run(main_async())


if __name__ == "__main__":
    main()
