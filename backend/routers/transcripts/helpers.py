import google.generativeai as genai
from typing import List, Dict, Any
import json
import logging
from config import GEMINI_API_KEY
from models import TaskPriority, Team
from .schemas import AIGeneratedTask

logger = logging.getLogger(__name__)

def are_tasks_similar(task1_title: str, task2_title: str, task1_desc: str, task2_desc: str) -> bool:
    """
    Check if two tasks are similar enough to be considered duplicates
    """
    # Convert to lowercase for comparison
    title1, title2 = task1_title.lower(), task2_title.lower()
    desc1, desc2 = task1_desc.lower(), task2_desc.lower()
    
    # Check for similar titles (common words)
    title1_words = set(title1.split())
    title2_words = set(title2.split())
    common_title_words = title1_words.intersection(title2_words)
    
    # If they share 60% or more of title words, they might be similar
    if len(common_title_words) >= 0.6 * min(len(title1_words), len(title2_words)):
        return True
    
    # Check for similar descriptions (common phrases)
    desc1_words = set(desc1.split())
    desc2_words = set(desc2.split())
    common_desc_words = desc1_words.intersection(desc2_words)
    
    # If they share 50% or more of description words, they might be similar
    if len(common_desc_words) >= 0.5 * min(len(desc1_words), len(desc2_words)):
        return True
    
    return False

def deduplicate_tasks(tasks: List[AIGeneratedTask]) -> List[AIGeneratedTask]:
    """
    Remove duplicate or very similar tasks from the list
    """
    if len(tasks) <= 1:
        return tasks
    
    unique_tasks = []
    
    for task in tasks:
        is_duplicate = False
        for existing_task in unique_tasks:
            if are_tasks_similar(task.title, existing_task.title, task.description, existing_task.description):
                logger.info(f"Removing duplicate task: '{task.title}' (similar to existing: '{existing_task.title}')")
                is_duplicate = True
                break
        
        if not is_duplicate:
            unique_tasks.append(task)
    
    return unique_tasks

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None
    logger.warning("GEMINI_API_KEY not found. AI features will not work.")

async def extract_tasks_and_summary_from_transcript(transcript_content: str, transcript_title: str) -> tuple[List[AIGeneratedTask], str, str]:
    """
    Use Gemini AI to extract actionable tasks, generate summary, and analyze sentiment from meeting transcript
    Returns: (tasks_list, summary, sentiment)
    """
    if not model:
        raise Exception("Gemini AI not configured. Please set GEMINI_API_KEY.")
    
    available_teams = [team.value for team in Team]
    teams_str = ", ".join(available_teams)
    
    #this prompt for AI was obviously made by AI hehe (AI is the better prompt engineer (than me atleast))
    prompt = f"""
You are an AI assistant that analyzes meeting transcripts to extract actionable tasks, create summaries, and analyze sentiment.

MEETING TITLE: {transcript_title}

MEETING TRANSCRIPT:
{transcript_content}

Please perform THREE tasks:

**TASK 1: GENERATE SUMMARY**
Create a concise, well-structured summary of the meeting that includes:
- Key discussion points
- Important decisions made
- Next steps identified
- Action items overview
- Any deadlines or timelines mentioned

**TASK 2: EXTRACT ACTION ITEMS**
Extract actionable tasks from the meeting. Follow this EXACT process:

STEP 1: Identify all unique action items mentioned in the transcript
STEP 2: Group similar or related actions together 
STEP 3: Create ONE consolidated task per group

For each final task:
1. **Title**: Create a clear, actionable title (max 100 characters)
2. **Description**: Provide a detailed description of what needs to be done
3. **Priority**: Assign priority as "HIGH", "MEDIUM", or "LOW" based on urgency and importance
4. **Team Assignment**: Assign to the most appropriate team from: {teams_str}
5. **Tags**: Add relevant tags (optional, comma-separated)

**MANDATORY DEDUPLICATION RULES:**
- NEVER create separate tasks for the same underlying action
- If multiple people mention the same task, create only ONE task
- If a task has multiple subtasks, combine them into ONE comprehensive task
- Examples of what NOT to do:
  * "Set up Office Network" and "Finalize Office Network Setup" (SAME TASK)
  * "Order New Hardware" and "Order New Hardware for Design Team" (SAME TASK)
  * "Update Employee Records with new Additions" and "Update Employee Records and send FAQ" (SAME TASK)
- Before finalizing, ask yourself: "Could any two tasks be combined or are they redundant?"
- Maximum 5-7 tasks total - consolidate aggressively

**TASK 3: SENTIMENT ANALYSIS**
Analyze the overall sentiment and tone of the meeting. Consider:
- Overall mood (positive, neutral, negative)
- Team dynamics and collaboration level
- Stress or urgency indicators
- Confidence in decisions made
- Any concerns or conflicts mentioned

Provide a brief sentiment summary (2-3 sentences) with an overall sentiment classification: "positive", "neutral", or "negative".

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

**Quality Control Checklist:**
- Each task title is unique and specific
- No two tasks accomplish the same goal
- Tasks are actionable and have clear deliverables
- Descriptions are comprehensive but not repetitive
- Similar discussions are consolidated into single tasks

Return your response in this EXACT JSON format:
{{
  "summary": "Your detailed meeting summary here...",
  "sentiment": "Your sentiment analysis summary here with classification: positive/neutral/negative",
  "tasks": [
    {{
      "title": "Task title here",
      "description": "Detailed description of the task",
      "priority": "HIGH|MEDIUM|LOW",
      "assigned_team": "Sales|Devs|Marketing|Design|Operations|Finance|HR|General",
      "tags": "optional, comma, separated, tags"
    }}
  ]
}}

Make sure to:
- Create a comprehensive but concise summary
- Provide thoughtful sentiment analysis
- Extract only actionable items (not just discussion points)
- Be specific and clear in task descriptions
- Assign appropriate teams based on task content
- Return valid JSON format
- Include 3-7 UNIQUE tasks maximum - prioritize consolidation over quantity
- FINAL CHECK: Review each task and eliminate any that are similar or redundant
- Each task must have a clearly distinct purpose and deliverable
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
        sentiment = result_data.get('sentiment', 'No sentiment analysis available')
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
                
                # Convert to uppercase to match TaskPriority enum values
                priority_value = priority_value.upper()
                
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
        
        # Apply deduplication to remove similar tasks
        original_count = len(tasks)
        tasks = deduplicate_tasks(tasks)
        if len(tasks) < original_count:
            logger.info(f"Deduplication removed {original_count - len(tasks)} duplicate tasks")
        
        if not tasks:
            tasks.append(AIGeneratedTask(
                title="Review meeting transcript",
                description=f"Review and follow up on items discussed in: {transcript_title}",
                priority=TaskPriority.MEDIUM,
                assigned_team=Team.GENERAL,
                tags="review, follow-up"
            ))
        
        logger.info(f"Successfully extracted {len(tasks)} tasks, summary, and sentiment from transcript")
        return tasks, summary, sentiment
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        logger.error(f"AI Response: {response.text}")
        raise Exception("Invalid JSON response from AI")
    
    except Exception as e:
        logger.error(f"Error extracting tasks and summary: {e}")
        raise Exception(f"Failed to extract tasks, summary, and sentiment: {str(e)}")





