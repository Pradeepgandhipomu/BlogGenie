const blogForm = document.getElementById("blogForm");
const generatorSection = document.getElementById("generatorSection");
const resultSection = document.getElementById("resultSection");
const blogContent = document.getElementById("blogContent");
const loadingOverlay = document.getElementById("loadingOverlay");
const errorMessage = document.getElementById("errorMessage");
const askForm = document.getElementById("askForm");
const chatHistory = document.getElementById("chatHistory");
const questionInput = document.getElementById("question");

let generatedBlog = "";

blogForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const topic = document.getElementById("topic").value.trim();
    const audience = document.getElementById("audience").value.trim();
    const tone = document.getElementById("tone").value;
    const length = document.getElementById("length").value;
    const keywords = document.getElementById("keywords").value.trim();

    if (!topic) {
        showError("Please enter a blog topic.");
        return;
    }

    hideError();
    loadingOverlay.classList.add("show");

    try {
        const response = await fetch("/generate_blog", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                topic,
                audience,
                tone,
                length,
                keywords
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Could not generate the blog.");
        }

        generatedBlog = data.blog || "";
        blogContent.innerHTML = formatBlog(generatedBlog);

        generatorSection.classList.add("hidden");
        resultSection.classList.remove("hidden");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {
        showError(error.message);
    } finally {
        loadingOverlay.classList.remove("show");
    }
});

askForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const question = questionInput.value.trim();

    if (!question) {
        return;
    }

    addUserMessage(question);
    questionInput.value = "";

    const typingMessage = document.createElement("div");
    typingMessage.className = "ai-message";
    typingMessage.id = "typingMessage";
    typingMessage.innerHTML = `
        <strong>BlogGenie Assistant</strong>
        <p>Thinking...</p>
    `;

    chatHistory.appendChild(typingMessage);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    try {
        const response = await fetch("/ask_question", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question
            })
        });

        const data = await response.json();

        document.getElementById("typingMessage")?.remove();

        if (!response.ok) {
            throw new Error(data.error || "Could not answer the question.");
        }

        addAiMessage(data.answer || "No answer was generated.");

    } catch (error) {
        document.getElementById("typingMessage")?.remove();
        addAiMessage("Sorry, I could not answer that question.");
    }
});

function formatBlog(text) {
    const safeText = escapeHtml(text);
    const lines = safeText.split("\n");
    let html = "";
    let inList = false;

    const headings = [
        "Table of Contents",
        "Introduction",
        "Overview",
        "Key Concepts",
        "Features",
        "Benefits",
        "Advantages",
        "Disadvantages",
        "Real-world Examples",
        "Applications",
        "Best Practices",
        "Latest Trends",
        "Challenges",
        "Future Scope",
        "Visual Content Suggestions",
        "Frequently Asked Questions",
        "Conclusion"
    ];

    lines.forEach((line, index) => {
        const cleanLine = line.trim();

        if (!cleanLine) {
            if (inList) {
                html += "</ul>";
                inList = false;
            }
            return;
        }

        if (cleanLine.startsWith("•")) {
            if (!inList) {
                html += "<ul>";
                inList = true;
            }

            html += `<li>${cleanLine.substring(1).trim()}</li>`;
            return;
        }

        if (inList) {
            html += "</ul>";
            inList = false;
        }

        if (index === 0) {
            html += `<h1>${cleanLine}</h1>`;
        } else if (headings.some((heading) => cleanLine.toLowerCase() === heading.toLowerCase())) {
            html += `<h2>${cleanLine}</h2>`;
        } else if (/^(Q\d+|Question \d+|FAQ \d+)/i.test(cleanLine)) {
            html += `<h3>${cleanLine}</h3>`;
        } else {
            html += `<p>${cleanLine}</p>`;
        }
    });

    if (inList) {
        html += "</ul>";
    }

    return html;
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
}

function addUserMessage(message) {
    const div = document.createElement("div");
    div.className = "user-message";
    div.innerHTML = `
        <strong>You</strong>
        <p>${escapeHtml(message)}</p>
    `;

    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function addAiMessage(message) {
    const div = document.createElement("div");
    div.className = "ai-message";
    div.innerHTML = `
        <strong>BlogGenie Assistant</strong>
        <div class="answer-text">${formatBlog(message)}</div>
    `;

    chatHistory.appendChild(div);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function clearChat() {
    chatHistory.innerHTML = `
        <div class="welcome-chat">
            <strong>BlogGenie Assistant</strong>
            <p>Hello! Ask any question about your generated blog.</p>
        </div>
    `;

    questionInput.value = "";
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
}

function hideError() {
    errorMessage.style.display = "none";
}

function copyBlog() {
    navigator.clipboard.writeText(generatedBlog);
    alert("Blog copied to clipboard.");
}

function downloadBlog() {
    const blob = new Blob([generatedBlog], {
        type: "text/plain"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "bloggenie-ai-blog.txt";
    link.click();

    URL.revokeObjectURL(link.href);
}

async function shareBlog() {
    try {
        if (navigator.share) {
            await navigator.share({
                title: "BlogGenie AI Blog",
                text: generatedBlog
            });
        } else {
            await navigator.clipboard.writeText(generatedBlog);
            alert("Blog copied to clipboard for sharing.");
        }
    } catch (error) {
        if (error.name !== "AbortError") {
            alert("Could not share the blog.");
        }
    }
}

function createNewBlog() {
    generatedBlog = "";
    blogContent.innerHTML = "";
    blogForm.reset();
    clearChat();

    resultSection.classList.add("hidden");
    generatorSection.classList.remove("hidden");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}
