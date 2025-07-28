import google.generativeai as genai
from typing import List, Dict, Any
import json
import logging
from config import GEMINI_API_KEY
from models import TaskPriority, Team
from .schemas import AIGeneratedTask

logger = logging.getLogger(__name__)

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None
    logger.warning("GEMINI_API_KEY not found. AI features will not work.")

async def extract_tasks_and_summary_from_transcript(transcript_content: str, transcript_title: str) -> tuple[List[AIGeneratedTask], str]:
    """
    Use Gemini AI to extract actionable tasks and generate summary from meeting transcript
    Returns: (tasks_list, summary)
    """
    if not model:
        raise Exception("Gemini AI not configured. Please set GEMINI_API_KEY.")
    
    available_teams = [team.value for team in Team]
    teams_str = ", ".join(available_teams)
    
    prompt = f"""
You are an AI assistant that analyzes meeting transcripts to extract actionable tasks and create summaries.

MEETING TITLE: {transcript_title}

MEETING TRANSCRIPT:
{transcript_content}

Please perform TWO tasks:

**TASK 1: GENERATE SUMMARY**
Create a concise, well-structured summary of the meeting that includes:
- Key discussion points
- Important decisions made
- Next steps identified
- Action items overview
- Any deadlines or timelines mentioned

**TASK 2: EXTRACT ACTION ITEMS**
Extract actionable tasks from the meeting. For each task:

1. **Title**: Create a clear, actionable title (max 100 characters)
2. **Description**: Provide a detailed description of what needs to be done
3. **Priority**: Assign priority as "high", "medium", or "low" based on urgency and importance
4. **Team Assignment**: Assign to the most appropriate team from: {teams_str}
5. **Tags**: Add relevant tags (optional, comma-separated)

**Team Assignment Guidelines:**
- @Sales: Revenue, deals, client relationships, sales targets
- @Devs: Technical development, coding, infrastructure, bugs
- @Marketing: Campaigns, content, branding, social media
- @Design: UI/UX, graphics, visual design, prototypes  
- @Operations: Process improvement, logistics, day-to-day operations
- @Finance: Budget, financial planning, cost analysis
- @HR: Hiring, employee relations, training, policies
- @General: Cross-functional, administrative, or unclear assignments

**Priority Guidelines:**
- High: Urgent, blocking, deadline-driven, critical business impact
- Medium: Important but not urgent, planned work
- Low: Nice to have, future considerations, minor improvements

Return your response in this EXACT JSON format:
{{
  "summary": "Your detailed meeting summary here...",
  "tasks": [
    {{
      "title": "Task title here",
      "description": "Detailed description of the task",
      "priority": "high|medium|low",
      "assigned_team": "Sales|Devs|Marketing|Design|Operations|Finance|HR|General",
      "tags": "optional, comma, separated, tags"
    }}
  ]
}}

Make sure to:
- Create a comprehensive but concise summary
- Extract only actionable items (not just discussion points)
- Be specific and clear in task descriptions
- Assign appropriate teams based on task content
- Return valid JSON format
- Include at least 3-5 tasks if the transcript contains that much actionable content
"""

    try:
        response = model.generate_content(prompt)
        
        if not response.text:
            raise Exception("Empty response from Gemini AI")
        
        response_text = response.text.strip()
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        
        if json_start == -1 or json_end == 0:
            raise Exception("No JSON object found in AI response")
        
        json_text = response_text[json_start:json_end]
        result_data = json.loads(json_text)
        summary = result_data.get('summary', 'No summary generated')
        tasks_data = result_data.get('tasks', [])
        tasks = []
        
        for task_data in tasks_data:
            try:
                team_value = task_data.get('assigned_team', 'General')
                if team_value not in [team.value for team in Team]:
                    team_value = 'General'
                
                priority_value = task_data.get('priority', 'medium').lower()
                if priority_value not in ['high', 'medium', 'low']:
                    priority_value = 'medium'
                
                task = AIGeneratedTask(
                    title=task_data.get('title', 'Untitled Task')[:255],  # Truncate if too long
                    description=task_data.get('description', ''),
                    priority=TaskPriority(priority_value),
                    assigned_team=Team(team_value),
                    tags=task_data.get('tags', '')
                )
                tasks.append(task)
                
            except Exception as e:
                logger.error(f"Error processing task data: {task_data}, Error: {e}")
                continue
        
        if not tasks:
            tasks.append(AIGeneratedTask(
                title="Review meeting transcript",
                description=f"Review and follow up on items discussed in: {transcript_title}",
                priority=TaskPriority.MEDIUM,
                assigned_team=Team.GENERAL,
                tags="review, follow-up"
            ))
        
        logger.info(f"Successfully extracted {len(tasks)} tasks and summary from transcript")
        return tasks, summary
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        logger.error(f"AI Response: {response.text}")
        raise Exception("Invalid JSON response from AI")
    
    except Exception as e:
        logger.error(f"Error extracting tasks and summary: {e}")
        raise Exception(f"Failed to extract tasks and summary: {str(e)}")



