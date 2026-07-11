from flask import Flask, render_template, request, jsonify
import os
import requests

app = Flask(__name__)

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY")
generated_blog = ""


def call_mistral(prompt):
    if not MISTRAL_API_KEY:
        return None, "Mistral API key is missing. Set MISTRAL_API_KEY first."

    url = "https://api.mistral.ai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "mistral-small-latest",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=90)

        if response.status_code != 200:
            return None, f"Mistral API error: {response.status_code}"

        result = response.json()
        answer = result["choices"][0]["message"]["content"].strip()
        return answer, None

    except requests.exceptions.RequestException as error:
        return None, f"Could not connect to Mistral AI: {str(error)}"

    except (KeyError, IndexError, TypeError):
        return None, "Mistral AI returned an unexpected response."


def generate_blog(topic, audience, tone, length, keywords):
    prompt = f"""
You are BlogGenie AI, an expert SEO Blog Writer and Content Creator.

The user's message contains the blog topic.

Generate a comprehensive, engaging, and publication-ready blog based on the requested topic.

Blog Topic: {topic}
Target Audience: {audience or "General readers"}
Writing Tone: {tone or "Professional"}
Approximate Blog Length: {length or "700"} words
SEO Keywords: {keywords or "Not provided"}

Formatting Rules:

• Do NOT use Markdown symbols such as #, ##, ###, *, **, ***, _, >, or triple backticks anywhere.
• Do NOT generate HTML tags.
• Use plain text only.
• Use clear section titles.
• Use the bullet symbol • wherever appropriate.
• Keep the output neat, readable, and professionally formatted.

Blog Structure

Title

Create a compelling SEO-friendly title.

List all major sections of the blog.

Introduction

Write 1–2 engaging paragraphs introducing the topic and explaining its importance.

Main Content

Create multiple sections covering relevant points from the following list:

• Overview
• Key Concepts
• Features
• Benefits
• Advantages
• Disadvantages, if applicable
• Real-world Examples
• Applications
• Best Practices
• Latest Trends
• Challenges
• Future Scope

Do not force every section if it does not fit the topic. Include only useful and relevant sections.

Visual Content Suggestions

Suggest visuals such as:

• HD Images
• Infographics
• Flowcharts
• Diagrams
• Comparison Tables
• Bar Charts
• Pie Charts
• Line Charts

For every visual suggestion, include:

• Visual Type
• Caption
• Purpose

Frequently Asked Questions

Generate 5 to 10 relevant FAQs with concise answers.

Conclusion

Summarize the key points and end with a strong closing statement.

Writing Guidelines:

• Use a professional tone based on the selected writing tone.
• Make the content SEO-friendly and naturally include SEO keywords.
• Use short readable paragraphs.
• Use bullet points wherever appropriate.
• Avoid repetition.
• Make the content detailed and informative.
• Produce publication-ready content.
• Do not mention that you are an AI.
• Do not invent statistics, research findings, sources, citations, or links.

Return only the completed blog.
"""
    return call_mistral(prompt)


def ask_blog_question(question):
    global generated_blog

    if not generated_blog.strip():
        return "Please generate a blog first."

    prompt = f"""
You are BlogGenie AI Assistant.

Answer the user's question using ONLY the generated blog below.

Rules:
• Answer ONLY from the generated blog.
• If the answer is not available in the generated blog, reply exactly:
This information is not available in the generated blog.
• Use simple English.
• Keep the answer under 120 words.
• Do not invent facts.
• Do not use Markdown or HTML.

Generated Blog:
{generated_blog}

User Question:
{question}
"""

    answer, error = call_mistral(prompt)

    if error:
        return error

    unavailable_words = [
        "not available",
        "not mentioned",
        "not provided",
        "not found",
        "cannot find",
        "does not contain",
        "no information",
        "not included"
    ]

    if any(word in answer.lower() for word in unavailable_words):
        return "This information is not available in the generated blog."

    return answer


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/generate_blog", methods=["POST"])
def generate_blog_route():
    global generated_blog

    data = request.get_json(silent=True) or {}

    topic = data.get("topic", "").strip()
    audience = data.get("audience", "").strip()
    tone = data.get("tone", "").strip()
    length = data.get("length", "").strip()
    keywords = data.get("keywords", "").strip()

    if not topic:
        return jsonify({"error": "Please enter a blog topic."}) , 400

    blog, error = generate_blog(topic, audience, tone, length, keywords)

    if error:
        return jsonify({"error": error}), 500

    generated_blog = blog
    return jsonify({"blog": generated_blog})


@app.route("/ask_question", methods=["POST"])
def ask_question_route():
    data = request.get_json(silent=True) or {}
    question = data.get("question", "").strip()

    if not question:
        return jsonify({"error": "Please enter a question."}) , 400

    answer = ask_blog_question(question)
    return jsonify({"answer": answer})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
