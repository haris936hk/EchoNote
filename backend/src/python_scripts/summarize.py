# backend/src/python_scripts/summarize.py
import sys
import json
import os
from groq import Groq

def generate_summary(transcript, meeting_metadata):
    """
    Generate AI summary matching the dataset format using Groq API.

    Args:
        transcript: Meeting transcript text
        meeting_metadata: Dict with title, category, audioDuration

    Returns: {
        "success": true,
        "summary": {
            "executiveSummary": "2-3 sentence summary...",
            "keyDecisions": "Key decisions text...",
            "actionItems": [
                {
                    "task": "Task description",
                    "assignee": "Person name or role",
                    "deadline": "Within a month" or null,
                    "priority": "high" | "medium" | "low"
                }
            ],
            "nextSteps": "Next steps text...",
            "keyTopics": ["Topic1", "Topic2", ...],
            "sentiment": "positive" | "negative" | "neutral"
        }
    }
    """
    try:
        # Initialize Groq client
        api_key = os.getenv('GROQ_API_KEY')
        if not api_key:
            raise Exception("GROQ_API_KEY environment variable not set")

        client = Groq(api_key=api_key)

        # Prepare the prompt
        title = meeting_metadata.get('title', 'Meeting')
        category = meeting_metadata.get('category', 'OTHER')
        duration_min = round(meeting_metadata.get('audioDuration', 0) / 60, 1)

        system_prompt = """You are an expert meeting summarizer. Analyze the transcript and generate a structured summary in JSON format.

Your response MUST be valid JSON with this exact structure:
{
    "executiveSummary": "A concise 2-3 sentence summary of the main points",
    "keyDecisions": "Text describing the key decisions made in the meeting",
    "actionItems": [
        {
            "task": "Specific task description",
            "assignee": "Person name or role (or null if not mentioned)",
            "deadline": "When it's due (or null if not mentioned)",
            "priority": "high" | "medium" | "low"
        }
    ],
    "nextSteps": "Text describing what happens next",
    "keyTopics": ["Topic1", "Topic2", "Topic3"],
    "sentiment": "positive" | "negative" | "neutral"
}

Guidelines:
- executiveSummary: 2-3 sentences max, capture the essence
- keyDecisions: Important decisions, agreements, or conclusions
- actionItems: Extract concrete tasks with priority (high for urgent/important, medium for moderate, low for nice-to-have)
- nextSteps: What needs to happen after this meeting
- keyTopics: 3-5 main topics discussed (single words or short phrases)
- sentiment: Overall tone of the meeting

IMPORTANT: Return ONLY the JSON object, no additional text."""

        user_prompt = f"""Meeting Title: {title}
Category: {category}
Duration: {duration_min} minutes

Transcript:
{transcript[:4000]}  # Limit to prevent token overflow

Generate the summary in the required JSON format."""

        # Call Groq API
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            model="mixtral-8x7b-32768",  # Good balance of speed and quality
            temperature=0.3,  # Lower for more consistent output
            max_tokens=1500,
            response_format={"type": "json_object"}  # Ensure JSON response
        )

        # Extract and parse the response
        response_text = chat_completion.choices[0].message.content
        summary_data = json.loads(response_text)

        # Validate and normalize the response
        validated_summary = {
            'executiveSummary': summary_data.get('executiveSummary', ''),
            'keyDecisions': summary_data.get('keyDecisions', ''),
            'actionItems': summary_data.get('actionItems', []),
            'nextSteps': summary_data.get('nextSteps', ''),
            'keyTopics': summary_data.get('keyTopics', []),
            'sentiment': summary_data.get('sentiment', 'neutral')
        }

        # Ensure action items have all required fields
        for item in validated_summary['actionItems']:
            if 'priority' not in item:
                item['priority'] = 'medium'
            if 'assignee' not in item:
                item['assignee'] = None
            if 'deadline' not in item:
                item['deadline'] = None

        return {
            'success': True,
            'summary': validated_summary
        }

    except json.JSONDecodeError as e:
        return {
            'success': False,
            'error': f'Failed to parse AI response as JSON: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Missing required arguments. Usage: python summarize.py <transcript_json>'
        }))
        sys.exit(1)

    try:
        # Parse input JSON
        input_data = json.loads(sys.argv[1])
        transcript = input_data.get('transcript', '')
        metadata = {
            'title': input_data.get('title', 'Meeting'),
            'category': input_data.get('category', 'OTHER'),
            'audioDuration': input_data.get('audioDuration', 0)
        }

        # Generate summary
        result = generate_summary(transcript, metadata)
        print(json.dumps(result))

    except json.JSONDecodeError as e:
        print(json.dumps({
            'success': False,
            'error': f'Invalid JSON input: {str(e)}'
        }))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))
