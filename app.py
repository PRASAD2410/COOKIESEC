# ======================================================================
# COOKIE SECURITY ANALYZER - FULL WORKING BACKEND
# ======================================================================

from flask import Flask, render_template, request, jsonify, send_file
from selenium.webdriver import Remote
from selenium.webdriver.firefox.options import Options
from selenium.common.exceptions import WebDriverException, TimeoutException, InvalidArgumentException
from selenium import webdriver   # ✅ FIX 1: You forgot this import
from time import sleep
import re
import base64
import requests
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import letter

# ----------------------------------------------------------------------
app = Flask(__name__)
# ----------------------------------------------------------------------

# ============================
#  AI SUMMARY USING GEMINI
# ============================

GEMINI_API_KEY = ""

def ai_explain_report(cookies, average_score):
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

    # SAFE COOKIE LIST
    safe_list = [
        {
            "name": c.get("name"),
            "category": c.get("category"),
            "score": c.get("security_score"),
            "HttpOnly": c.get("HttpOnly"),
            "Secure": c.get("Secure"),
            "SameSite": c.get("SameSite")
        }
        for c in cookies
    ]

    prompt = f"""
STRICT OUTPUT RULES:
- Each bullet MUST be on its own line.
- Format: • cookie_name → short explanation.
- Max 20 words per bullet.
- No paragraphs. No merging lines.

TASK:
Explain each cookie: purpose, risks, missing flags.

Average score: {average_score}
Cookies: {safe_list}
"""

    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = requests.post(url, json=payload)
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print("AI ERROR:", e)
        return "AI explanation unavailable."




# ======================================================================
#  COOKIE VALUE PATTERN ANALYZER
# ======================================================================
def detect_value_pattern(value):
    if not value:
        return "No recognizable pattern detected."

    v = value.strip()

    uuid_pattern = re.compile(
        r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    )
    if uuid_pattern.match(v):
        return "Value appears to be a UUID."

    if v.count(".") == 2:
        header, payload, signature = v.split(".")
        if len(header) and len(payload) and len(signature):
            return "Value appears to be a JWT token."

    try:
        if len(v) % 4 == 0 and re.match(r'^[A-Za-z0-9+/=]+$', v):
            base64.b64decode(v)
            return "Value appears Base64 encoded."
    except:
        pass

    if re.match(r'^[0-9a-fA-F]{16,}$', v):
        return "Value looks like a session token."

    if v.isdigit():
        return "Value is numeric ID."

    if "%" in v:
        return "Value contains URL-encoded parameters."

    if len(v) > 40:
        return "High-entropy token."

    return "No recognizable pattern detected."


# ======================================================================
#  COOKIE CLASSIFICATION
# ======================================================================

def classify_cookie(cookie):
    name = cookie.get('name', '').lower()

    if any(x in name for x in ['session', 'sess', 'sid']):
        return ("Session Cookie", "Used to maintain login sessions.")
    if any(x in name for x in ['auth', 'csrf', 'token', '__secure', '__host']):
        return ("Security / Auth Cookie", "Used for authentication & CSRF protection.")
    if name.startswith("cf_") or "__cf" in name or "cfuid" in name:
        return ("Security Cookie (Cloudflare)", "Cloudflare security cookie.")
    if any(x in name for x in ['_ga', '_gid', '_hj', 'utm_']):
        return ("Analytics Cookie", "Used for analytics and tracking.")
    if any(x in name for x in ['uuid', 'device', 'track']):
        return ("Tracking / Identifier", "Used to track devices or users.")
    return ("Miscellaneous / Unknown", "Purpose unknown or website-specific.")


# ======================================================================
#  COOKIE SCORING + NORMALIZATION
# ======================================================================

def score_cookie(cookie):

    category, desc = classify_cookie(cookie)
    cookie["category"] = category
    cookie["description"] = desc

    cookie["value_pattern"] = detect_value_pattern(cookie.get("value", ""))

    score = 10

    raw_http = cookie.get("httpOnly")
    raw_secure = cookie.get("secure")
    raw_samesite = cookie.get("sameSite", "").lower()

    cookie["HttpOnly"] = True if raw_http else False
    cookie["Secure"] = True if raw_secure else False
    cookie["SameSite"] = False if raw_samesite in ("", "none") else True

    if not cookie["HttpOnly"]:
        score -= 2
    if not cookie["Secure"]:
        score -= 2
    if not cookie["SameSite"]:
        score -= 2

    sensitive_keywords = ['password', 'token', 'auth', 'secret', 'api', 'user']
    low_value = str(cookie.get("value", "")).lower()
    cookie["Sensitive_Leak"] = any(k in low_value for k in sensitive_keywords)

    if cookie["Sensitive_Leak"]:
        score -= 5

    cookie["security_score"] = max(1, score)
    return cookie


# ======================================================================
#  SELENIUM COOKIE FETCH (LOCAL GECKODRIVER FIX APPLIED)
# ======================================================================

def fetch_cookies_with_selenium(url):
    print(f"Scanning URL: {url}")

    options = Options()
    options.headless = True   

    driver = None
    try:
        # ❌ WRONG FOR LOCAL WEBDRIVER:
        # driver = Remote("http://127.0.0.1:4444/wd/hub", options=options)

        # ✅ FIX 2: Local Firefox WebDriver (ONLY THIS LINE CHANGED)
        driver = webdriver.Firefox(options=options)

        driver.set_page_load_timeout(30)
        driver.get(url)
        sleep(2)

        raw = driver.get_cookies()
        return [score_cookie(c) for c in raw]

    except InvalidArgumentException:
        return {"error": "Invalid URL format."}
    except TimeoutException:
        return {"error": "Page load timed out."}
    except WebDriverException as e:
        return {"error": "Driver error: " + str(e)}
    finally:
        if driver:
            driver.quit()


# ======================================================================
#  FLASK ROUTES
# ======================================================================

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/scan", methods=["POST"])
def scan_url():
    url = request.json.get("url")

    if not url.startswith(("http://", "https://")):
        return jsonify({"error": "URL must start with http:// or https://"}), 400

    cookies = fetch_cookies_with_selenium(url)

    if isinstance(cookies, dict) and "error" in cookies:
        return jsonify(cookies), 500

    if len(cookies) == 0:
        avg_score = 0
    else:
        avg_score = round(sum(c["security_score"] for c in cookies) / len(cookies), 1)

    ai_summary = ai_explain_report(cookies, avg_score)

    return jsonify({
        "success": True,
        "average_score": avg_score,
        "cookies": cookies,
        "ai_summary": ai_summary
    })


# ======================================================================
#  PDF DOWNLOAD
# ======================================================================

@app.route("/api/download", methods=["POST"])
def download_pdf():
    data = request.json
    url = data["url"]
    score = data["score"]
    summary = data["aiSummary"]
    cookies = data["cookies"]

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()

    story = []

    story.append(Paragraph("<b>Cookie Security Report</b>", styles["Title"]))
    story.append(Spacer(1, 12))

    story.append(Paragraph(f"<b>URL:</b> {url}", styles["BodyText"]))
    story.append(Paragraph(f"<b>Score:</b> {score}/10", styles["BodyText"]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("<b>AI Security Summary</b>", styles["Heading2"]))
    for line in summary.split("\n"):
        story.append(Paragraph(line, styles["BodyText"]))
    story.append(Spacer(1, 12))

    story.append(Paragraph("<b>Cookies</b>", styles["Heading2"]))
    for c in cookies:
        story.append(Paragraph(f"<b>{c['name']}</b>", styles["Heading3"]))
        story.append(Paragraph(f"Domain: {c['domain']}", styles["BodyText"]))
        story.append(Paragraph(f"Category: {c['category']}", styles["BodyText"]))
        story.append(Paragraph(f"HttpOnly: {c['HttpOnly']}", styles["BodyText"]))
        story.append(Paragraph(f"Secure: {c['Secure']}", styles["BodyText"]))
        story.append(Paragraph(f"SameSite: {c['SameSite']}", styles["BodyText"]))
        story.append(Paragraph(f"Description: {c['description']}", styles["BodyText"]))
        story.append(Spacer(1, 12))

    doc.build(story)
    buffer.seek(0)

    return send_file(buffer, as_attachment=True, download_name="cookie_security_report.pdf")


# ======================================================================

if __name__ == "__main__":
    app.run(debug=True, port=5001)
