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

IMPORTANT: Analyze the transcript carefully and extract REAL, SPECIFIC actionable tasks from the content. Do NOT create generic tasks like "Review meeting transcript" unless that's actually mentioned in the meeting.

Please perform THREE tasks:

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

CRITICAL: Only extract tasks that are explicitly mentioned or clearly implied in the transcript. If no specific actionable tasks are discussed, return an empty tasks array.

**TASK 3: SENTIMENT ANALYSIS**
Analyze the overall sentiment and tone of the meeting. Consider:
- Overall mood (positive, neutral, negative)
- Team dynamics and collaboration level
- Stress or urgency indicators
- Confidence in decisions made
- Any concerns or conflicts mentioned

Provide a brief sentiment summary (2-3 sentences) with an overall sentiment classification: "positive", "neutral", or "negative".

**Team Assignment Guidelines:**
- Sales: Revenue, deals, client relationships, sales targets
- Devs: Technical development, coding, infrastructure, bugs
- Marketing: Campaigns, content, branding, social media
- Design: UI/UX, graphics, visual design, prototypes  
- Operations: Process improvement, logistics, day-to-day operations
- Finance: Budget, financial planning, cost analysis
- HR: Hiring, employee relations, training, policies
- General: Cross-functional, administrative, or unclear assignments

**Priority Guidelines:**
- high: Urgent, blocking, deadline-driven, critical business impact
- medium: Important but not urgent, planned work
- low: Nice to have, future considerations, minor improvements

Return your response in this EXACT JSON format (no additional text before or after):
{{
  "summary": "Your detailed meeting summary here...",
  "sentiment": "Your sentiment analysis summary here with classification: positive/neutral/negative",
  "tasks": [
    {{
      "title": "Specific task title from the meeting",
      "description": "Detailed description of what needs to be done based on the transcript",
      "priority": "high|medium|low",
      "assigned_team": "Sales|Devs|Marketing|Design|Operations|Finance|HR|General",
      "tags": "optional, comma, separated, tags"
    }}
  ]
}}

REMEMBER: 
- Only extract tasks that are actually discussed in the meeting
- Be specific and detailed in descriptions
- If no actionable tasks are mentioned, return an empty tasks array []
- Return ONLY the JSON object, no additional text
- Ensure valid JSON format
"""

    try:
        logger.info(f"Starting AI processing for transcript: {transcript_title}")
        response = model.generate_content(prompt)
        
        if not response.text:
            logger.error("Empty response from Gemini AI")
            raise Exception("Empty response from Gemini AI")
        
        logger.info(f"AI Response received, length: {len(response.text)}")
        logger.debug(f"Raw AI Response: {response.text[:500]}...")  # Log first 500 chars
        
        response_text = response.text.strip()
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        
        if json_start == -1 or json_end == 0:
            logger.error(f"No JSON object found in AI response. Response: {response.text}")
            raise Exception("No JSON object found in AI response")
        
        json_text = response_text[json_start:json_end]
        logger.debug(f"Extracted JSON: {json_text}")
        
        result_data = json.loads(json_text)
        summary = result_data.get('summary', 'No summary generated')
        sentiment = result_data.get('sentiment', 'No sentiment analysis available')
        tasks_data = result_data.get('tasks', [])
        
        logger.info(f"AI returned {len(tasks_data)} tasks")
        
        tasks = []
        
        for i, task_data in enumerate(tasks_data):
            try:
                logger.debug(f"Processing task {i+1}: {task_data}")
                
                team_value = task_data.get('assigned_team', 'General')
                if team_value not in [team.value for team in Team]:
                    logger.warning(f"Invalid team '{team_value}', defaulting to 'General'")
                    team_value = 'General'
                
                priority_value = task_data.get('priority', 'medium').lower()
                if priority_value not in ['high', 'medium', 'low']:
                    logger.warning(f"Invalid priority '{priority_value}', defaulting to 'medium'")
                    priority_value = 'medium'
                
                # Convert lowercase priority to enum
                priority_map = {
                    'high': TaskPriority.HIGH,
                    'medium': TaskPriority.MEDIUM,
                    'low': TaskPriority.LOW
                }
                
                task = AIGeneratedTask(
                    title=task_data.get('title', 'Untitled Task')[:255],  # Truncate if too long
                    description=task_data.get('description', ''),
                    priority=priority_map[priority_value],
                    assigned_team=Team(team_value),
                    tags=task_data.get('tags', '')
                )
                tasks.append(task)
                logger.debug(f"Successfully created task: {task.title}")
                
            except Exception as e:
                logger.error(f"Error processing task data: {task_data}, Error: {e}")
                continue
        
        logger.info(f"Successfully processed {len(tasks)} out of {len(tasks_data)} AI-generated tasks")
        
        # Only add fallback task if NO tasks were successfully created
        if not tasks:
            logger.warning("No valid tasks were created, adding fallback task")
            tasks.append(AIGeneratedTask(
                title="Review meeting transcript",
                description=f"Review and follow up on items discussed in: {transcript_title}",
                priority=TaskPriority.MEDIUM,
                assigned_team=Team.GENERAL,
                tags="review, follow-up"
            ))
        
        logger.info(f"Final result: {len(tasks)} tasks, summary length: {len(summary)}, sentiment: {sentiment[:50]}...")
        return tasks, summary, sentiment
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}")
        logger.error(f"AI Response: {response.text}")
        raise Exception("Invalid JSON response from AI")
    
    except Exception as e:
        logger.error(f"Error extracting tasks and summary: {e}")
        raise Exception(f"Failed to extract tasks, summary, and sentiment: {str(e)}")





