# Quiz Prep App 📚

> **⚠️ Disclaimer:** This was entirely vibe coded for my sister, so run at your own risk! 😅  
> (Yes, mixing Python and JS is not ideal, but it works! This is a vibe-coded project.)

A simple, cute quiz webapp to help prepare for MCQ exams. Built with vanilla HTML/JS/CSS for simplicity and speed.

## Features

- 🎯 **825+ questions** extracted from study guide images
- ⌨️ **Keyboard shortcuts** - A/B/C/D to answer, Enter for next
- ⚡ **Auto-advance** on correct answers
- 🔄 **Review Mistakes** mode - focus on questions you got wrong
- 💾 **Progress saved** - resume where you left off, even after closing
- 📊 **Stats tracking** - see accuracy by topic
- 📥 **Export progress** - download CSV of all answered questions
- 🎨 **Cute pastel UI** - easy on the eyes

## Scientific Learning Techniques

The app uses evidence-based methods for quick learning:

1. **Active Recall** - testing yourself rather than passive reading
2. **Immediate Feedback** - see if you're right/wrong instantly
3. **Error-Focused Review** - prioritize questions you got wrong
4. **Spaced Repetition (modified)** - skip already-correct questions

## Quick Start

### Prerequisites

- Python 3.13+
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- Google Gemini API key ([get one here](https://aistudio.google.com/apikey))

### Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd quiz-creator
   ```

2. **Install dependencies:**
   ```bash
   uv sync
   ```

3. **Set up your API key:**
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

4. **Try the webapp with sample data:**
   ```bash
   cd webapp
   python3 -m http.server 8000
   ```
   Then open http://localhost:8000

## Project Structure

```
quiz-creator/
├── webapp/                    # The quiz app (deploy this folder)
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── questions-data.js      # Generated from CSV (sample data included)
├── questions.csv              # Extracted questions (sample data)
├── convert_images.py          # HEIC → JPG converter
├── convert_to_json.py         # CSV → JS converter
├── extract_questions.py        # Image → questions extractor
├── .env.example               # API key template
└── LICENSE                    # MIT License
```

## Using Your Own Images

1. **Convert HEIC images to JPG** (if needed):
   ```bash
   uv run python convert_images.py
   ```
   Place your HEIC images in `images/` folder. Output goes to `images_jpg/`.

2. **Extract questions** from your images:
   ```bash
   uv run python extract_questions.py
   ```
   This processes images from `images_jpg/` and creates `questions.csv`.
   Uses checkpointing, so it won't re-process existing images.

3. **Convert to webapp format**:
   ```bash
   uv run python convert_to_json.py
   ```
   This reads `questions.csv` and generates `webapp/questions-data.js`.

4. **Test locally**:
   ```bash
   cd webapp
   python3 -m http.server 8000
   ```

## Local Development

Start a local server to test:

```bash
cd webapp
python3 -m http.server 8000
```

Then open http://localhost:8000

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| A / B / C / D | Select answer |
| 1 / 2 / 3 / 4 | Select answer (alternative) |
| Enter / Space | Next question (after wrong answer) |
| Esc | Go back to home |

## Deployment

The `webapp/` folder can be deployed to any static hosting service:

- **Cloudflare Pages**: `wrangler pages deploy webapp --project-name quiz-prep`
- **Netlify**: Drag and drop the `webapp/` folder
- **Vercel**: Point to the `webapp/` directory
- **GitHub Pages**: Deploy the `webapp/` folder

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (no build step!)
- **Styling:** Custom CSS with CSS variables
- **Storage:** localStorage for progress
- **AI:** Google Gemini 2.0 Flash for question extraction
- **Python:** uv for dependency management

## Contributing

Contributions welcome! This is a vibe-coded project, so feel free to:
- Report bugs
- Suggest improvements
- Submit pull requests
- Use it for your own quiz prep!

## License

MIT License - Copyright (c) 2025 Mohammed Sanjeed

See [LICENSE](LICENSE) for details.
