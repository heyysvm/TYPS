typs <>
A sleek, modern, and theme-based minimalist typing speed test application heavily inspired by Monkeytype. Built with React 19, Vite, and Supabase, it provides an elegant typing experience with customizable themes, difficulties, detailed live analytics, and a global competitive leaderboard.

🔗 Live Demo: typs.heyysvm.in
🎨 Theme & Aesthetic System
typs is built with custom visual styling at its core. It leverages CSS variables that dynamically update when themes are toggled via the ThemeContext.

Base Themes
🌒 Dark Mode (Default): Deep carbon background (#181819) designed for low-light environment concentration.
☀️ Light Mode: Crisp, clean light layout (#f5f5f7) with custom-tuned contrasting typography.
Accent Palette
Users can choose between multiple accent color presets which customize the caret, correct letters, active buttons, and visual highlights:

Theme	Accent Hex	RGB Value	Preview
Yellow (Default)	#e2b714	226, 183, 20	■
Cyan	#00c2cb	0, 194, 203	■
Orange	#ff7a00	255, 122, 0	■
Green	#a3be8c	163, 190, 140	■
⚡ Core Features
🎯 Fluid Typing Engine: Implements smooth caret navigation, active line-masking, and precise word-wrapping/scrolling mechanics.
🔊 Auditory Feedback: Mechanical click sounds toggleable directly from the interface.
⌛ Flexible Modes:
Words Mode: Target word counts (10, 30, 60, or custom up to 300).
Time Mode: Timed count-down challenges (10, 30, 40, 60, or custom up to 300 seconds).
📶 Tier Levels:
basic: Common typing words.
intermd: Adds basic punctuation and simple numbers.
hard: Heavy punctuation, complex symbols, uppercase chars, and numbers.
🔄 Local-to-Cloud Sync: Anonymous guest test results are stored in localStorage and automatically synchronized with Supabase database history when registering or logging in.
🏆 Global Leaderboards: Live database rankings showing WPM stats of all players (only validates standard tests to prevent custom-duration leaderboard manipulation).
📊 Real-time Stats & Charts: Detailed stats detailing WPM, Raw WPM, accuracy %, elapsed time, and character distributions (Correct/Wrong/Extra/Missed). Displays an interactive visual chart of WPM progress over time using Recharts.
💤 Anti-Distraction Blur Overlay: Detects when focus is lost. Pressing any key automatically returns focus to the typing input without swallowing or typing that wake character.
🛠️ Tech Stack
Frontend: React 19 (Hooks, Contexts, Refs), Vite, Lucide Icons, Recharts.
Database / Auth: Supabase PostgreSQL and GoTrue Auth.
Styling: Vanilla CSS3 with root variables, responsive media queries, and smooth animations.
🗄️ Database Architecture
Below is the entity relationship diagram of the Supabase PostgreSQL database tables structure.

Mermaid diagram
Table Definitions & Security
public.profiles: Contains user credentials and configuration settings.
Managed automatically by a trigger function on sign-up (on_auth_user_created trigger executing public.handle_new_user()).
Enabled with Row Level Security (RLS) allowing read access to all users, but write access restricted only to the authenticated owner.
public.tests: Stores individual typing test stats.
References profiles.id with a cascading delete constraint.
RLS policies ensure everyone can view test results (e.g. for the leaderboard), but users can only write data belonging to their own UUID.
🚀 Local Development Setup
To run typs on your local environment:

Prerequisites
Node.js (v18 or higher recommended)
A Supabase account and database project
1. Clone & Install Dependencies
bash

git clone https://github.com/heyysvm/typs.git
cd typs
npm install
2. Configure Environment Variables
Create a .env file in the root directory:

env

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
3. Initialize Database Schema
Copy and execute the contents of supabase-schema.sql into the SQL Editor of your Supabase dashboard to set up the tables, triggers, and RLS policies.

4. Run the Dev Server
bash

npm run dev
Open your browser and navigate to http://localhost:5173.

📄 License
Designed & developed with ❤️ by heyysvm. Feel free to star, fork, and contribute!
