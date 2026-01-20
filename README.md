# TeachCoachConnect

A full-featured coaching and task management platform for teachers, coaches, and their students/athletes.

## Features

### For Coaches (Assigners)

#### Dashboard Overview
- **At-a-glance stats**: Total classes, students, tasks, and completion rates
- **Who's on track / Who's behind**: Visual indicators showing student progress
- **AI Weekly Summary**: Auto-generated insights about student performance

#### Calendar (Day/Week/Month Views)
- View all scheduled tasks across your students
- Switch between month, week, and day views
- Click any date to see tasks due that day
- Mark tasks complete directly from the calendar

#### My Athletes (Class Management)
- Create classes with auto-generated join codes
- QR code support for easy student enrollment
- Pre-assign templates when creating classes (new students auto-receive tasks)
- Remove students or delete entire classes
- View student details and which classes they belong to

#### Template Library
- Create reusable task templates
- AI-assisted plan generation ("make a 5-week beginner plan, 3x/week")
- Save templates with multiple tasks across different days
- Assign templates to individual students or entire classes

#### Recurring Schedules
- Set up routines that repeat daily, weekly, or on custom intervals
- Link templates to recurring schedules
- Auto-generate tasks for the next 30 days
- Pause/resume schedules as needed
- Assign to specific students or entire classes

#### AI Assistant
- **Plan Builder**: Natural language plan creation
  - "Create a 5-week beginner plan, 3x per week"
  - "Make a study schedule for SAT prep"
- **Personalize Plans**: Adjust for individual needs
  - "Make this harder for Sarah"
  - "Adjust for someone with a knee injury"
- **Task Writing Helper**: Refine rough notes
  - "warmup stretches" becomes "Do 5 minutes of dynamic stretches - arm circles, leg swings, high knees"
- **Weekly Summaries**: Auto-generated completion stats and highlights
- **Full Context Awareness**: AI has access to your students, classes, and task data

### For Students (Assignees)

#### Wibble Planner (Daily Checklist)
- Today's tasks with easy check-off
- Progress tracking and streaks
- Upcoming deadlines view
- Coach notes and feedback
- Sticker collection for gamification

#### Schedule View
- All tasks from connected coaches
- Filter by instructor
- Group by due date (Today, Tomorrow, Upcoming)
- Mark tasks complete with visual feedback

#### Calendar View
- Monthly calendar showing task distribution
- Tap dates to see daily tasks

#### Sticker Book
- Earn stickers by completing tasks (20% drop rate)
- Rarity system: Common, Rare, Epic, Legendary
- Track your collection progress

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: Google Gemini API
- **State**: TanStack Query (React Query)
- **PWA**: Progressive Web App support for mobile

## Database Schema

### Core Tables
- `profiles` - User accounts (coaches and students)
- `class_sessions` - Coach's classes with join codes
- `instructor_students` - Coach-student relationships
- `tasks` - Assignments with due dates, priorities, categories
- `templates` - Reusable task templates
- `template_tasks` - Tasks within templates
- `recurring_schedules` - Repeating routine configurations

### Gamification
- `stickers` - Available sticker types and rarities
- `user_stickers` - Stickers earned by students
- `student_logs` - Daily wellness check-ins

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project
- Google Gemini API key (for AI features)

### Environment Variables
Create a `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

For AI features, set in Supabase Edge Function secrets:
```
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Installation
```bash
npm install
npm run dev
```

### Database Setup
The app will auto-create tables on first run via migrations. If you need to manually apply them:
1. Go to Supabase Dashboard > SQL Editor
2. Run the migrations from `supabase/migrations/` in order

## Roles

### Coach Role
- Create and manage classes
- Create tasks and templates
- View student progress
- Use AI assistant for planning

### Student Role
- Join classes via code or QR
- View and complete assigned tasks
- Earn stickers and track streaks
- Log daily wellness check-ins

## API Endpoints (Edge Functions)

### ai-assistant
Actions:
- `generate_plan` - Create task plans from natural language
- `personalize_plan` - Modify plans for specific needs
- `refine_task` - Improve task descriptions
- `weekly_summary` - Generate progress summaries
- `chat` - Conversational AI with full context

## Mobile Support

The app is PWA-enabled and works well on mobile devices:
- Add to home screen for app-like experience
- Offline support for viewing cached data
- Touch-optimized UI components

## License

MIT
