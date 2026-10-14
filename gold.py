import os
import re
import requests
from bs4 import BeautifulSoup

WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL")
SOURCE_URL = "https://wardogshub.gg/gold-market/"

def clean_number(text):
    """Extract integer value from currency string."""
    if not text:
        return 0
    digits = re.sub(r'[^\d-]', '', text)
    try:
        return int(digits)
    except ValueError:
        return 0

def fetch_and_post_price():
    if not WEBHOOK_URL:
        print("ERROR: DISCORD_WEBHOOK_URL environment variable not set.")
        return

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    }
    
    try:
        response = requests.get(SOURCE_URL, headers=headers, timeout=15)
        print(f"Market Page Fetch Status: {response.status_code}")
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            text_blocks = [text.strip() for text in soup.stripped_strings if text.strip()]
            
            today_str = "N/A"
            highest_str = "N/A"
            lowest_str = "N/A"
            change_raw = "N/A"
            
            # Sequential text-block scanning
            for i, text in enumerate(text_blocks):
                lower_text = text.lower()
                
                # Today's Rate
                if ("current" in lower_text or "one gold bar" in lower_text) and today_str == "N/A":
                    for j in range(i, min(len(text_blocks), i + 4)):
                        if "$" in text_blocks[j] and "," in text_blocks[j]:
                            today_str = text_blocks[j]
                            break
                            
                # Highest So Far
                if "highest so far" in lower_text:
                    for j in range(max(0, i - 3), min(len(text_blocks), i + 4)):
                        if "$" in text_blocks[j] and "," in text_blocks[j] and text_blocks[j] != text:
                            highest_str = text_blocks[j]
                            break
                            
                # Lowest So Far
                if "lowest so far" in lower_text:
                    for j in range(max(0, i - 3), min(len(text_blocks), i + 4)):
                        if "$" in text_blocks[j] and "," in text_blocks[j] and text_blocks[j] != text:
                            lowest_str = text_blocks[j]
                            break
                            
                # Since Yesterday Change
                if "since yesterday" in lower_text or "from yesterday" in lower_text:
                    for j in range(max(0, i - 3), min(len(text_blocks), i + 6)):
                        candidate = text_blocks[j]
                        if any(sign in candidate for sign in ["+", "-", "−"]):
                            change_raw = candidate
                            break

            # Fallback for Today's Rate if keyword scan misses
            if today_str == "N/A":
                for text in text_blocks:
                    if text.startswith("$") and "," in text and len(text) > 4:
                        today_str = text
                        break

            today_val = clean_number(today_str)

            # Secondary fallback for change_raw if not found via label
            if change_raw == "N/A":
                for text in text_blocks:
                    if any(sign in text for sign in ["+", "-", "−"]) and "," in text and "$" in text:
                        change_raw = text
                        break

            # Calculate Yesterday's Price dynamically with strict validation
            change_num = clean_number(change_raw)
            if any(neg in change_raw for neg in ["-", "−", "▼"]):
                change_num = -abs(change_num)

            # Ensure change is a realistic delta (smaller than today's value and non-zero)
            if today_val > 0 and change_raw != "N/A" and change_num != 0 and abs(change_num) < today_val:
                yesterday_val = today_val - change_num
                yesterday_price_str = f"${yesterday_val:,}"
            else:
                yesterday_price_str = "N/A"

            # Construct Discord Embed Payload
            payload = {
                "username": "WARDOGS Gold Market",
                "embeds": [{
                    "title": "💰 Daily Gold Bar Exchange Rate & History",
                    "color": 16766720,
                    "fields": [
                        {
                            "name": "📅 Today's Rate",
                            "value": f"**{today_str}** cash per bar",
                            "inline": False
                        },
                        {
                            "name": "⏪ Yesterday's Price",
                            "value": f"**{yesterday_price_str}**",
                            "inline": False
                        },
                        {
                            "name": "📈 Highest Ever",
                            "value": f"**{highest_str}**",
                            "inline": True
                        },
                        {
                            "name": "📉 Lowest Ever",
                            "value": f"**{lowest_str}**",
                            "inline": True
                        }
                    ],
                    "footer": {
                        "text": "Source: WardogsHub • Updates daily at midnight UTC"
                    }
                }]
            }
            
            res = requests.post(WEBHOOK_URL, json=payload)
            print(f"Discord Webhook Response Status: {res.status_code}")
        else:
            print(f"Failed to fetch market page. Status: {response.status_code}")
            
    except Exception as e:
        print(f"An exception occurred: {e}")

if __name__ == "__main__":
    fetch_and_post_price()
